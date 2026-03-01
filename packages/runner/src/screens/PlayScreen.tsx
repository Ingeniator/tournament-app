import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { useStandings } from '../hooks/useStandings';
import { useClubStandings } from '../hooks/useClubStandings';
import { useNominations } from '../hooks/useNominations';
import { RoundCard } from '../components/rounds/RoundCard';
import { StandingsTable, type GroupInfo } from '../components/standings/StandingsTable';
import { ClubStandingsTable } from '../components/standings/ClubStandingsTable';
import { NominationCard } from '../components/nominations/NominationCard';
import { Carousel } from '../components/carousel/Carousel';
import { CeremonyScreen } from '../components/ceremony/CeremonyScreen';
import { useShareText } from '../hooks/useShareText';
import { copyToClipboard } from '../utils/clipboard';
import { shareStandingsImage } from '../utils/standingsImage';
import { ref, push, set } from 'firebase/database';
import { auth, db, firebaseConfigured } from '../firebase';
import { Button, getClubColor, FeedbackModal, Modal, SupportOverlay, Toast, useToast, useTranslation, formatHasGroups, formatHasClubs } from '@padel/common';
import { getStrategy } from '../strategies';
import { MaldicionesRulesModal } from '../components/maldiciones/MaldicionesRulesModal';
import { CURSE_CARDS } from '../data/curseCards';
import styles from './PlayScreen.module.css';

export function PlayScreen() {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();
  const standings = useStandings(tournament);
  const clubStandings = useClubStandings(tournament, standings);
  const nominations = useNominations(tournament, standings);
  const plannedGames = useMemo(() => {
    if (!tournament) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const p of tournament.players) map.set(p.id, 0);
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (match.score) continue;
        for (const id of [...match.team1, ...match.team2]) {
          map.set(id, (map.get(id) ?? 0) + 1);
        }
      }
    }
    // For team formats, standings entries use team IDs — aggregate player counts per team
    if (tournament.teams) {
      for (const team of tournament.teams) {
        const count = Math.max(map.get(team.player1Id) ?? 0, map.get(team.player2Id) ?? 0);
        map.set(team.id, count);
      }
    }
    return map;
  }, [tournament]);
  const groupInfo = useMemo<GroupInfo | undefined>(() => {
    if (!tournament || !formatHasGroups(tournament.config.format)) return undefined;
    const map = new Map<string, 'A' | 'B'>();
    for (const p of tournament.players) {
      if (p.group) map.set(p.id, p.group);
    }
    if (map.size === 0) return undefined;
    const labels: [string, string] = [
      tournament.config.groupLabels?.[0] || 'A',
      tournament.config.groupLabels?.[1] || 'B',
    ];
    return { labels, map };
  }, [tournament]);
  const isClubFormat = tournament != null && formatHasClubs(tournament.config.format);
  const clubColorMap = useMemo(() => {
    const map = new Map<string, string>();
    (tournament?.clubs ?? []).forEach((c, i) => map.set(c.id, getClubColor(c, i)));
    return map;
  }, [tournament?.clubs]);
  const clubInfo = useMemo(() => {
    if (!isClubFormat || !tournament?.clubs?.length || !tournament?.teams?.length) return undefined;
    const playerClubMap = new Map<string, string>();
    for (const p of tournament.players) {
      if (p.clubId) playerClubMap.set(p.id, p.clubId);
    }
    // Map team IDs to club IDs
    const teamClubMap = new Map<string, string>();
    for (const team of tournament.teams) {
      const clubId = playerClubMap.get(team.player1Id) ?? playerClubMap.get(team.player2Id);
      if (clubId) teamClubMap.set(team.id, clubId);
    }
    const clubNameMap = new Map<string, string>();
    for (const club of tournament.clubs) clubNameMap.set(club.id, club.name);
    return { teamClubMap, clubNameMap, clubColorMap };
  }, [tournament, isClubFormat, clubColorMap]);
  const { buildMessengerText } = useShareText(tournament, standings, nominations);
  const [showStandings, setShowStandings] = useState(false);
  const [standingsTab, setStandingsTab] = useState<'pairs' | 'clubs'>('pairs');
  const [showSupport, setShowSupport] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showMaldicionesRules, setShowMaldicionesRules] = useState(false);
  const [roundsExpanded, setRoundsExpanded] = useState(false);
  const { toastMessage, showToast } = useToast();
  const [roundCompleteNum, setRoundCompleteNum] = useState<number | null>(null);
  const prevActiveRoundIdRef = useRef<string | null>(null);

  const strategy = tournament ? getStrategy(tournament.config.format) : null;
  const totalMatches = tournament?.rounds.reduce((n, r) => n + r.matches.length, 0) ?? 0;
  const scoredMatches = tournament?.rounds.reduce(
    (n, r) => n + r.matches.filter(m => m.score).length, 0
  ) ?? 0;
  const scoredRounds = tournament?.rounds.filter(r => r.matches.every(m => m.score)).length ?? 0;
  const plannedRounds = tournament
    ? (strategy?.isDynamic
        ? (tournament.config.maxRounds ?? tournament.players.length - 1)
        : tournament.rounds.length)
    : 0;

  // Find active round: first round with any unscored matches
  const activeRoundIndex = tournament?.rounds.findIndex(r => r.matches.some(m => !m.score)) ?? -1;
  const activeRound = tournament && activeRoundIndex >= 0 ? tournament.rounds[activeRoundIndex] : null;
  const prevRound = tournament && activeRoundIndex > 0 ? tournament.rounds[activeRoundIndex - 1] : null;
  const nextRound = tournament && activeRoundIndex >= 0 && activeRoundIndex + 1 < tournament.rounds.length
    ? tournament.rounds[activeRoundIndex + 1]
    : null;

  // Detect round completion: when active round changes, show interstitial
  useEffect(() => {
    const prevId = prevActiveRoundIdRef.current;
    const curId = activeRound?.id ?? null;

    if (prevId !== null && curId !== null && prevId !== curId) {
      // Active round advanced — previous round was just completed
      const completedRound = tournament?.rounds.find(r => r.id === prevId);
      if (completedRound) {
        setRoundCompleteNum(completedRound.roundNumber);
      }
    }

    prevActiveRoundIdRef.current = curId;
  }, [activeRound?.id, tournament?.rounds]);

  const name = (id: string) => tournament?.players.find(p => p.id === id)?.name ?? '?';

  const maldicionesEnabled = !!tournament?.config.maldiciones?.enabled;

  // Equalize nomination card heights
  const nomCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [nomMinHeight, setNomMinHeight] = useState(0);
  const setNomRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    nomCardRefs.current[index] = el;
  }, []);

  useEffect(() => {
    if (nominations.length === 0) return;
    // Reset height to measure natural sizes
    setNomMinHeight(0);
    requestAnimationFrame(() => {
      const heights = nomCardRefs.current
        .filter((el): el is HTMLDivElement => el !== null)
        .map(el => el.scrollHeight);
      if (heights.length > 0) {
        setNomMinHeight(Math.max(...heights));
      }
    });
  }, [nominations]);

  const [previewImages, setPreviewImages] = useState<string[] | null>(null);

  if (!tournament) return null;

  // Completed state — show ceremony or summary
  if (tournament.phase === 'completed') {
    // Show ceremony if not yet completed
    if (!tournament.ceremonyCompleted && nominations.length > 0) {
      return (
        <CeremonyScreen
          nominations={nominations}
          onComplete={(noms) => {
            dispatch({ type: 'COMPLETE_CEREMONY', payload: { nominations: noms } });
          }}
        />
      );
    }

    const handleCopy = async () => {
      const ok = await copyToClipboard(buildMessengerText(roundsExpanded));
      showToast(ok ? t('play.copied') : t('play.failedCopy'));
    };
    const handleShareImage = async () => {
      const modeTitle = tournament.config.maldiciones?.enabled ? '🎭 Maldiciones del Padel' : undefined;
      const result = await shareStandingsImage(tournament.name, standings, nominations, groupInfo, clubInfo, clubStandings, clubColorMap, modeTitle);
      if (result.status === 'shared') showToast(t('play.shared'));
      else if (result.status === 'downloaded') showToast(t('play.imageSaved'));
      else if (result.status === 'preview') setPreviewImages(result.dataUrls);
      else showToast(t('play.failedShare'));
    };

    return (
      <div className={styles.container}>
        <div className={styles.completedHeader}>
          <h2 className={styles.completedName}>{tournament.name}</h2>
        </div>
        <Carousel>
          {[
            <div key="standings" className={styles.completedStandings}>
              <StandingsTable standings={standings} groupInfo={groupInfo} clubInfo={clubInfo} />
            </div>,
            ...(clubStandings.length > 0 ? [
              <div key="club-standings" className={styles.completedStandings}>
                <ClubStandingsTable standings={clubStandings} clubColorMap={clubColorMap} />
              </div>,
            ] : []),
            ...nominations.map((nom, i) => (
              <NominationCard key={nom.id} nomination={nom} cardRef={setNomRef(i)} minHeight={nomMinHeight || undefined} />
            )),
          ]}
        </Carousel>
        <Button fullWidth onClick={handleShareImage}>
          {t('play.shareImage')}
        </Button>
        {tournament.rounds.some(r => r.matches.some(m => m.score)) && (
          <details className={styles.roundDetails} onToggle={e => setRoundsExpanded((e.target as HTMLDetailsElement).open)}>
            <summary className={styles.roundDetailsSummary}>{t('play.roundResults')}</summary>
            <div className={styles.roundResultsList}>
              {tournament.rounds.map(round => {
                const scoredMatches = round.matches.filter(m => m.score);
                if (scoredMatches.length === 0) return null;
                return (
                  <div key={round.id} className={styles.roundResultGroup}>
                    <div className={styles.roundResultTitle}>{t('play.roundNum', { num: round.roundNumber })}</div>
                    {scoredMatches.map(match => {
                      const courtLabel = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
                      const s = match.score!;
                      const t1Won = s.team1Points > s.team2Points;
                      const t2Won = s.team2Points > s.team1Points;
                      const curseCard = match.curse ? CURSE_CARDS.find(c => c.id === match.curse!.cardId) : null;
                      return (
                        <div key={match.id} className={styles.resultMatch}>
                          <div className={styles.resultCourt}>{courtLabel}</div>
                          <div className={styles.resultTeams}>
                            <span className={`${styles.resultTeam} ${t1Won ? styles.resultWinner : ''}`}>
                              {name(match.team1[0])} & {name(match.team1[1])}
                            </span>
                            <span className={styles.resultScore}>
                              {s.team1Points} : {s.team2Points}
                            </span>
                            <span className={`${styles.resultTeam} ${styles.resultTeamRight} ${t2Won ? styles.resultWinner : ''}`}>
                              {name(match.team2[0])} & {name(match.team2[1])}
                            </span>
                          </div>
                          {curseCard && (
                            <div className={styles.resultCurse}>
                              {match.curse!.shielded
                                ? <>{'🛡️'} <span className={styles.resultCurseShielded}>{curseCard.emoji} {curseCard.name}</span></>
                                : <>{curseCard.emoji} {curseCard.name}</>
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {round.sitOuts.length > 0 && (
                      <div className={styles.resultSitOut}>
                        {t('play.satOut', { names: round.sitOuts.map(name).join(', ') })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
        <Button variant="secondary" fullWidth onClick={handleCopy}>
          {t('play.shareText')}
        </Button>
        <button className={styles.supportCta} onClick={() => setShowSupport(true)}>
          <span className={styles.supportEmoji}>&#x2764;&#xFE0F;</span>
          <span className={styles.supportText}>{t('play.supportCta')}</span>
        </button>
        <div className={styles.attribution}>
          {t('play.madeWithCare')}
          {firebaseConfigured && (
            <>
              {' '}&middot;{' '}
              <button className={styles.attributionLink} onClick={() => setFeedbackOpen(true)}>
                {t('play.sendFeedback')}
              </button>
            </>
          )}
        </div>
        <SupportOverlay open={showSupport} onClose={() => setShowSupport(false)} auth={auth} />
        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={async (message) => {
            if (!db) return;
            const feedbackRef = push(ref(db, 'feedback'));
            await set(feedbackRef, { message, source: 'runner', createdAt: Date.now() });
          }}
        />
        {previewImages && (
          <div className={styles.imagePreviewOverlay} onClick={() => {
            previewImages.forEach(u => { if (u.startsWith('blob:')) URL.revokeObjectURL(u); });
            setPreviewImages(null);
          }}>
            <div className={styles.imagePreviewContent} onClick={e => e.stopPropagation()}>
              <div className={styles.imagePreviewHeader}>
                <span className={styles.imagePreviewHint}>{t('play.openBrowserHint')}</span>
                <button className={styles.imagePreviewClose} onClick={() => {
                  previewImages.forEach(u => { if (u.startsWith('blob:')) URL.revokeObjectURL(u); });
                  setPreviewImages(null);
                }}>&#x2715;</button>
              </div>
              <div className={styles.imagePreviewScroll}>
                <Button fullWidth onClick={() => {
                  window.open(window.location.href, '_blank');
                }}>
                  {t('play.openInBrowser')}
                </Button>
                {previewImages.map((url, i) => (
                  <img key={i} src={url} alt={`Result ${i + 1}`} className={styles.imagePreviewImg} />
                ))}
              </div>
            </div>
          </div>
        )}
        <Toast message={toastMessage} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Progress line */}
      <div className={styles.progress}>
        {t('play.progress', { current: scoredRounds + 1, total: plannedRounds, scored: scoredMatches, totalMatches })}
      </div>

      {/* Active round */}
      {activeRound && (
        <RoundCard
          round={activeRound}
          players={tournament.players}
          courts={tournament.config.courts}
          pointsPerMatch={tournament.config.pointsPerMatch}
          format={tournament.config.format}
          maldicionesEnabled={maldicionesEnabled}
          maldicionesHands={tournament.maldicionesHands}
          teams={tournament.teams}
          onScore={(matchId, score) =>
            dispatch({
              type: 'SET_MATCH_SCORE',
              payload: { roundId: activeRound.id, matchId, score },
            })
          }
          onClear={matchId =>
            dispatch({
              type: 'CLEAR_MATCH_SCORE',
              payload: { roundId: activeRound.id, matchId },
            })
          }
          onCast={maldicionesEnabled ? (matchId, castBy, cardId, targetPlayerId) =>
            dispatch({
              type: 'CAST_MALDICION',
              payload: { roundId: activeRound.id, matchId, castBy, cardId, targetPlayerId },
            }) : undefined
          }
          onEscudo={maldicionesEnabled ? (matchId) =>
            dispatch({
              type: 'USE_ESCUDO',
              payload: { roundId: activeRound.id, matchId },
            }) : undefined
          }
          onVeto={maldicionesEnabled ? (matchId) =>
            dispatch({
              type: 'VETO_MALDICION',
              payload: { roundId: activeRound.id, matchId },
            }) : undefined
          }
        />
      )}

      {!activeRound && (
        <div className={styles.allScored}>
          <p>{t('play.allScored')}</p>
          <div className={styles.allScoredActions}>
            <Button variant="secondary" fullWidth onClick={() => dispatch({ type: 'ADD_ROUNDS', payload: { count: 1 } })}>
              {t('play.addRound')}
            </Button>
            <Button fullWidth onClick={() => {
              if (confirm(t('play.completeConfirm'))) {
                dispatch({ type: 'COMPLETE_TOURNAMENT' });
              }
            }}>
              {t('play.finishTournament')}
            </Button>
          </div>
        </div>
      )}

      {/* Next + Previous round previews */}
      {(prevRound || nextRound) && (
        <div className={styles.roundPreviews}>
          {nextRound && (
            <div className={styles.roundPreview}>
              <h3 className={styles.roundPreviewTitle}>{t('play.upNextRound', { num: nextRound.roundNumber })}</h3>
              {nextRound.matches.map(match => {
                const courtName = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
                return (
                  <div key={match.id} className={styles.compactMatch}>
                    <span className={styles.compactCourt}>{courtName}</span>
                    <div className={styles.compactTeamLine}>
                      <span className={styles.compactPlayerName}>{name(match.team1[0])}</span>
                      <span className={styles.compactAmp}>&amp;</span>
                      <span className={styles.compactPlayerName}>{name(match.team1[1])}</span>
                    </div>
                    <div className={styles.compactVsRow}>
                      <span className={styles.previewVs}>{t('play.vs')}</span>
                    </div>
                    <div className={styles.compactTeamLine}>
                      <span className={styles.compactPlayerName}>{name(match.team2[0])}</span>
                      <span className={styles.compactAmp}>&amp;</span>
                      <span className={styles.compactPlayerName}>{name(match.team2[1])}</span>
                    </div>
                  </div>
                );
              })}
              {nextRound.sitOuts.length > 0 && (
                <div className={styles.compactSitOut}>
                  {t('play.sit', { names: nextRound.sitOuts.map(name).join(', ') })}
                </div>
              )}
            </div>
          )}
          {prevRound && (
            <div className={styles.roundPreview}>
              <h3 className={styles.roundPreviewTitle}>{t('play.previousRound', { num: prevRound.roundNumber })}</h3>
              {prevRound.matches.map(match => {
                const courtName = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
                return (
                  <div key={match.id} className={styles.compactMatch}>
                    <span className={styles.compactCourt}>{courtName}</span>
                    <div className={styles.compactTeamLine}>
                      <span className={styles.compactPlayerName}>{name(match.team1[0])}</span>
                      <span className={styles.compactAmp}>&amp;</span>
                      <span className={styles.compactPlayerName}>{name(match.team1[1])}</span>
                    </div>
                    <div className={styles.compactVsRow}>
                      <span className={styles.previewVs}>{t('play.vs')}</span>
                      {match.score && (
                        <span className={styles.compactScore}>
                          {match.score.team1Points}:{match.score.team2Points}
                        </span>
                      )}
                    </div>
                    <div className={styles.compactTeamLine}>
                      <span className={styles.compactPlayerName}>{name(match.team2[0])}</span>
                      <span className={styles.compactAmp}>&amp;</span>
                      <span className={styles.compactPlayerName}>{name(match.team2[1])}</span>
                    </div>
                  </div>
                );
              })}
              {prevRound.sitOuts.length > 0 && (
                <div className={styles.compactSitOut}>
                  {t('play.sit', { names: prevRound.sitOuts.map(name).join(', ') })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Standings button */}
      <div className={styles.standingsBtn}>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => setShowStandings(true)}
        >
          {t('play.standings')}
        </Button>
      </div>

      {/* Maldiciones info button */}
      {maldicionesEnabled && (
        <div className={styles.standingsBtn}>
          <Button variant="ghost" fullWidth onClick={() => setShowMaldicionesRules(true)}>
            {t('play.maldicionesInfo')}
          </Button>
        </div>
      )}

      {/* Round complete interstitial */}
      {roundCompleteNum !== null && (
        <div className={styles.interstitialOverlay} onClick={() => setRoundCompleteNum(null)}>
          <div className={styles.interstitial} onClick={e => e.stopPropagation()}>
            <div className={styles.interstitialContent}>
              <div className={styles.interstitialTitle}>{t('play.roundComplete', { num: roundCompleteNum })}</div>
              <div className={styles.interstitialSub}>{t('play.getReady')}</div>
              <Button fullWidth onClick={() => setRoundCompleteNum(null)}>
                {t('play.continue')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Standings overlay */}
      <Modal open={showStandings} title={t('play.standingsTitle')} onClose={() => setShowStandings(false)}>
        {isClubFormat && clubStandings.length > 0 && (
          <div className={styles.standingsTabs}>
            <button
              className={`${styles.standingsTab} ${standingsTab === 'pairs' ? styles.standingsTabActive : ''}`}
              onClick={() => setStandingsTab('pairs')}
            >
              {t('play.pairStandings')}
            </button>
            <button
              className={`${styles.standingsTab} ${standingsTab === 'clubs' ? styles.standingsTabActive : ''}`}
              onClick={() => setStandingsTab('clubs')}
            >
              {t('play.clubStandings')}
            </button>
          </div>
        )}
        {standingsTab === 'pairs' || !isClubFormat ? (
          <StandingsTable standings={standings} plannedGames={plannedGames} groupInfo={groupInfo} clubInfo={clubInfo} />
        ) : (
          <ClubStandingsTable standings={clubStandings} clubColorMap={clubColorMap} />
        )}
      </Modal>

      {/* Maldiciones rules modal */}
      {maldicionesEnabled && tournament.config.maldiciones && (
        <MaldicionesRulesModal
          open={showMaldicionesRules}
          chaosLevel={tournament.config.maldiciones.chaosLevel}
          hands={tournament.maldicionesHands}
          teams={tournament.teams}
          nameOf={name}
          onClose={() => setShowMaldicionesRules(false)}
        />
      )}

      <Toast message={toastMessage} />
    </div>
  );
}
