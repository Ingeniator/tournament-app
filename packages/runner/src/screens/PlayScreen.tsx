import { useState, useRef, useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { useStandings } from '../hooks/useStandings';
import { useClubStandings } from '../hooks/useClubStandings';
import { useNominations } from '../hooks/useNominations';
import { useTournamentMeta } from '../hooks/useTournamentMeta';
import { usePlayProgress } from '../hooks/usePlayProgress';
import { useRoundCompletion } from '../hooks/useRoundCompletion';
import { useNominationLayout } from '../hooks/useNominationLayout';
import { RoundCard } from '../components/rounds/RoundCard';
import { MatchConfigProvider, type MatchConfig } from '../components/rounds/MatchConfigContext';
import { StandingsTable } from '../components/standings/StandingsTable';
import { ClubStandingsTable } from '../components/standings/ClubStandingsTable';
import { NominationCard } from '../components/nominations/NominationCard';
import { Carousel } from '../components/carousel/Carousel';
import { RankResultsCard } from '../components/standings/RankResultsCard';
import { CeremonyScreen } from '../components/ceremony/CeremonyScreen';
import { useShareText } from '../hooks/useShareText';
import { copyToClipboard } from '../utils/clipboard';
import { shareStandingsImage, type ShareableItem } from '../utils/standingsImage';
import { ref, push, set } from 'firebase/database';
import { auth, db, firebaseConfigured } from '../firebase';
import { Button, FeedbackModal, Modal, SupportOverlay, Toast, useToast, useTranslation, nameOf } from '@padel/common';
import { MaldicionesRulesModal } from '../components/maldiciones/MaldicionesRulesModal';
import { CURSE_CARDS } from '../data/curseCards';
import styles from './PlayScreen.module.css';

export function PlayScreen() {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();
  const standings = useStandings(tournament);
  const clubStandings = useClubStandings(tournament, standings);
  const nominations = useNominations(tournament, standings);
  const { plannedGames, groupInfo, isClubFormat, clubColorMap, clubInfo, rankLabelInfo, rankGroups } = useTournamentMeta(tournament);
  const { totalMatches, scoredMatches, scoredRounds, plannedRounds, activeRound, prevRound, nextRound } = usePlayProgress(tournament);
  const { roundCompleteNum, setRoundCompleteNum } = useRoundCompletion(activeRound, tournament?.rounds);
  const { nomMinHeight, setNomRef } = useNominationLayout(nominations);
  const { buildMessengerText } = useShareText(tournament, standings, nominations);
  const [showStandings, setShowStandings] = useState(false);
  const [standingsTab, setStandingsTab] = useState<'pairs' | 'clubs'>('pairs');
  const [showSupport, setShowSupport] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showMaldicionesRules, setShowMaldicionesRules] = useState(false);
  const [roundsExpanded, setRoundsExpanded] = useState(false);
  const { toastMessage, showToast } = useToast();

  const name = (id: string) => nameOf(tournament?.players ?? [], id);

  const maldicionesEnabled = !!tournament?.config.maldiciones?.enabled;

  const matchConfig = useMemo<MatchConfig>(() => ({
    players: tournament?.players ?? [],
    courts: tournament?.config.courts ?? [],
    pointsPerMatch: tournament?.config.pointsPerMatch ?? 24,
    scoringMode: tournament?.config.scoringMode,
    format: tournament?.config.format,
    maldicionesEnabled,
    maldicionesHands: tournament?.maldicionesHands,
    teams: tournament?.teams,
  }), [tournament?.players, tournament?.config.courts, tournament?.config.pointsPerMatch, tournament?.config.scoringMode, tournament?.config.format, maldicionesEnabled, tournament?.maldicionesHands, tournament?.teams]);

  const [previewImages, setPreviewImages] = useState<string[] | null>(null);

  // Refs for hidden shareable cards
  const shareStandingsRef = useRef<HTMLDivElement>(null);
  const shareClubStandingsRef = useRef<HTMLDivElement>(null);
  const shareRankRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shareNomRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      const safeName = tournament.name.replace(/[^a-zA-Z0-9]/g, '_');
      const items: ShareableItem[] = [];

      // Podium nominations first
      nominations.forEach((nom, i) => {
        if (nom.id.startsWith('podium-') && shareNomRefs.current[i]) {
          items.push({
            element: shareNomRefs.current[i]!,
            filename: `${safeName}_${nom.id.replace(/[^a-zA-Z0-9-]/g, '_')}.png`,
          });
        }
      });

      // Standings table
      if (shareStandingsRef.current) {
        items.push({ element: shareStandingsRef.current, filename: `${safeName}_results.png` });
      }

      // Club standings
      if (shareClubStandingsRef.current) {
        items.push({ element: shareClubStandingsRef.current, filename: `${safeName}_club_standings.png` });
      }

      // Rank results
      rankGroups.forEach((_, i) => {
        if (shareRankRefs.current[i]) {
          items.push({ element: shareRankRefs.current[i]!, filename: `${safeName}_rank_${i + 1}.png` });
        }
      });

      // Other nominations
      nominations.forEach((nom, i) => {
        if (!nom.id.startsWith('podium-') && shareNomRefs.current[i]) {
          items.push({
            element: shareNomRefs.current[i]!,
            filename: `${safeName}_${nom.id.replace(/[^a-zA-Z0-9-]/g, '_')}.png`,
          });
        }
      });

      const result = await shareStandingsImage(items);
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
              <StandingsTable standings={standings} groupInfo={groupInfo} clubInfo={clubInfo} rankLabelInfo={rankLabelInfo} />
            </div>,
            ...(clubStandings.length > 0 ? [
              <div key="club-standings" className={styles.completedStandings}>
                <ClubStandingsTable standings={clubStandings} clubColorMap={clubColorMap} />
              </div>,
            ] : []),
            ...rankGroups.map((rg, i) => (
              <RankResultsCard key={`rank-${i}`} rankGroup={rg} tournamentName={tournament.name} />
            )),
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
                const scoredMatchesInRound = round.matches.filter(m => m.score);
                if (scoredMatchesInRound.length === 0) return null;
                return (
                  <div key={round.id} className={styles.roundResultGroup}>
                    <div className={styles.roundResultTitle}>{t('play.roundNum', { num: round.roundNumber })}</div>
                    {scoredMatchesInRound.map(match => {
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
        {/* Hidden cards for image capture */}
        <div className={styles.shareContainer} aria-hidden>
          <div ref={shareStandingsRef} className={styles.shareCard}>
            <div className={styles.shareHeader}>{tournament.name}</div>
            {tournament.config.maldiciones?.enabled && (
              <div className={styles.shareModeTitle}>{'🎭 Maldiciones del Padel'}</div>
            )}
            <div className={styles.completedStandings}>
              <StandingsTable standings={standings} groupInfo={groupInfo} clubInfo={clubInfo} rankLabelInfo={rankLabelInfo} />
            </div>
            <div className={styles.shareWatermark}>{window.location.hostname}</div>
          </div>
          {clubStandings.length > 0 && (
            <div ref={shareClubStandingsRef} className={styles.shareCard}>
              <div className={styles.shareHeader}>{tournament.name}</div>
              <div className={styles.completedStandings}>
                <ClubStandingsTable standings={clubStandings} clubColorMap={clubColorMap} />
              </div>
              <div className={styles.shareWatermark}>{window.location.hostname}</div>
            </div>
          )}
          {rankGroups.map((rg, i) => (
            <div key={i} ref={el => { shareRankRefs.current[i] = el; }} className={styles.shareCard}>
              <RankResultsCard rankGroup={rg} tournamentName={tournament.name} />
              <div className={styles.shareWatermark}>{window.location.hostname}</div>
            </div>
          ))}
          {nominations.map((nom, i) => (
            <div key={nom.id} ref={el => { shareNomRefs.current[i] = el; }} className={styles.shareCard}>
              <NominationCard nomination={nom} />
              <div className={styles.shareWatermark}>{window.location.hostname}</div>
            </div>
          ))}
        </div>
        <Toast message={toastMessage} />
      </div>
    );
  }

  return (
    <MatchConfigProvider config={matchConfig}>
    <div className={styles.container}>
      {/* Progress line */}
      <div className={styles.progress}>
        {t('play.progress', { current: scoredRounds + 1, total: plannedRounds, scored: scoredMatches, totalMatches })}
      </div>

      {/* Active round */}
      {activeRound && (
        <RoundCard
          round={activeRound}
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
          <StandingsTable standings={standings} plannedGames={plannedGames} groupInfo={groupInfo} clubInfo={clubInfo} rankLabelInfo={rankLabelInfo} />
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
    </MatchConfigProvider>
  );
}
