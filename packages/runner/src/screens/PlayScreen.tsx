import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { useStandings } from '../hooks/useStandings';
import { useNominations } from '../hooks/useNominations';
import { RoundCard } from '../components/rounds/RoundCard';
import { StandingsTable } from '../components/standings/StandingsTable';
import { NominationCard } from '../components/nominations/NominationCard';
import { Carousel } from '../components/carousel/Carousel';
import { SupportOverlay } from '../components/support/SupportOverlay';
import { useShareText } from '../hooks/useShareText';
import { copyToClipboard } from '../utils/clipboard';
import { shareStandingsImage } from '../utils/standingsImage';
import { Button, Modal, Toast, useToast } from '@padel/common';
import styles from './PlayScreen.module.css';

export function PlayScreen() {
  const { tournament, dispatch } = useTournament();
  const standings = useStandings(tournament);
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
    return map;
  }, [tournament]);
  const { buildMessengerText } = useShareText(tournament, standings, nominations);
  const [showStandings, setShowStandings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [roundsExpanded, setRoundsExpanded] = useState(false);
  const { toastMessage, showToast } = useToast();
  const [roundCompleteNum, setRoundCompleteNum] = useState<number | null>(null);
  const prevActiveRoundIdRef = useRef<string | null>(null);

  const totalMatches = tournament?.rounds.reduce((n, r) => n + r.matches.length, 0) ?? 0;
  const scoredMatches = tournament?.rounds.reduce(
    (n, r) => n + r.matches.filter(m => m.score).length, 0
  ) ?? 0;
  const scoredRounds = tournament?.rounds.filter(r => r.matches.every(m => m.score)).length ?? 0;

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
        queueMicrotask(() => setRoundCompleteNum(completedRound.roundNumber));
      }
    }

    prevActiveRoundIdRef.current = curId;
  }, [activeRound?.id, tournament?.rounds]);

  const name = (id: string) => tournament?.players.find(p => p.id === id)?.name ?? '?';

  // Equalize nomination card heights
  const nomCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [nomMinHeight, setNomMinHeight] = useState(0);
  const setNomRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    nomCardRefs.current[index] = el;
  }, []);

  useLayoutEffect(() => {
    if (nominations.length === 0) return;
    // Reset height to measure natural sizes
    queueMicrotask(() => {
      setNomMinHeight(0);
      requestAnimationFrame(() => {
        const heights = nomCardRefs.current
          .filter((el): el is HTMLDivElement => el !== null)
          .map(el => el.scrollHeight);
        if (heights.length > 0) {
          setNomMinHeight(Math.max(...heights));
        }
      });
    });
  }, [nominations]);

  if (!tournament) return null;

  // Completed state — show summary
  if (tournament.phase === 'completed') {
    const handleCopy = async () => {
      const ok = await copyToClipboard(buildMessengerText(roundsExpanded));
      showToast(ok ? 'Copied!' : 'Failed to copy');
    };
    const handleShareImage = async () => {
      const result = await shareStandingsImage(tournament.name, standings, nominations);
      if (result === 'shared') showToast('Shared!');
      else if (result === 'downloaded') showToast('Image saved!');
      else showToast('Failed to share');
    };

    return (
      <div className={styles.container}>
        <div className={styles.completedHeader}>
          <h2 className={styles.completedName}>{tournament.name}</h2>
        </div>
        <Carousel>
          {[
            <div key="standings" className={styles.completedStandings}>
              <StandingsTable standings={standings} />
            </div>,
            ...nominations.map((nom, i) => (
              <NominationCard key={nom.id} nomination={nom} cardRef={setNomRef(i)} minHeight={nomMinHeight || undefined} />
            )),
          ]}
        </Carousel>
        <Button variant="secondary" fullWidth onClick={handleShareImage}>
          Share Results as Image
        </Button>
        {tournament.rounds.some(r => r.matches.some(m => m.score)) && (
          <details className={styles.roundDetails} onToggle={e => setRoundsExpanded((e.target as HTMLDetailsElement).open)}>
            <summary className={styles.roundDetailsSummary}>Round Results</summary>
            <div className={styles.roundResultsList}>
              {tournament.rounds.map(round => {
                const scoredMatches = round.matches.filter(m => m.score);
                if (scoredMatches.length === 0) return null;
                return (
                  <div key={round.id} className={styles.roundResultGroup}>
                    <div className={styles.roundResultTitle}>Round {round.roundNumber}</div>
                    {scoredMatches.map(match => {
                      const courtLabel = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
                      const s = match.score!;
                      const t1Won = s.team1Points > s.team2Points;
                      const t2Won = s.team2Points > s.team1Points;
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
                        </div>
                      );
                    })}
                    {round.sitOuts.length > 0 && (
                      <div className={styles.resultSitOut}>
                        Sat out: {round.sitOuts.map(name).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
        <Button fullWidth onClick={handleCopy}>
          Share Results as Text
        </Button>
        <button className={styles.supportCta} onClick={() => setShowSupport(true)}>
          <span className={styles.supportEmoji}>&#x2764;&#xFE0F;</span>
          <span className={styles.supportText}>Enjoyed using this? Help keep it free.</span>
        </button>
        <SupportOverlay open={showSupport} onClose={() => setShowSupport(false)} />
        <Toast message={toastMessage} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Progress line */}
      <div className={styles.progress}>
        Round {scoredRounds + 1}/{tournament.rounds.length} · {scoredMatches}/{totalMatches} matches
      </div>

      {/* Active round */}
      {activeRound && (
        <RoundCard
          round={activeRound}
          players={tournament.players}
          courts={tournament.config.courts}
          pointsPerMatch={tournament.config.pointsPerMatch}
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
        />
      )}

      {!activeRound && (
        <div className={styles.allScored}>
          <p>All rounds scored!</p>
          <div className={styles.allScoredActions}>
            <Button variant="secondary" fullWidth onClick={() => dispatch({ type: 'ADD_ROUNDS', payload: { count: 1 } })}>
              + Add Round
            </Button>
            <Button fullWidth onClick={() => {
              if (confirm('Mark tournament as completed?')) {
                dispatch({ type: 'COMPLETE_TOURNAMENT' });
              }
            }}>
              Finish Tournament
            </Button>
          </div>
        </div>
      )}

      {/* Previous + Next round previews */}
      {(prevRound || nextRound) && (
        <div className={styles.roundPreviews}>
          {prevRound && (
            <div className={styles.roundPreview}>
              <h3 className={styles.roundPreviewTitle}>Previous — Round {prevRound.roundNumber}</h3>
              {prevRound.matches.map(match => {
                const courtName = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
                return (
                  <div key={match.id} className={styles.compactMatch}>
                    <span className={styles.compactCourt}>{courtName}</span>
                    <span className={styles.compactTeams}>
                      {name(match.team1[0])} & {name(match.team1[1])}
                      <span className={styles.previewVs}> vs </span>
                      {name(match.team2[0])} & {name(match.team2[1])}
                    </span>
                    {match.score && (
                      <span className={styles.compactScore}>
                        {match.score.team1Points}:{match.score.team2Points}
                      </span>
                    )}
                  </div>
                );
              })}
              {prevRound.sitOuts.length > 0 && (
                <div className={styles.compactSitOut}>
                  Sit: {prevRound.sitOuts.map(name).join(', ')}
                </div>
              )}
            </div>
          )}
          {nextRound && (
            <div className={styles.roundPreview}>
              <h3 className={styles.roundPreviewTitle}>Up Next — Round {nextRound.roundNumber}</h3>
              {nextRound.matches.map(match => {
                const courtName = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
                return (
                  <div key={match.id} className={styles.compactMatch}>
                    <span className={styles.compactCourt}>{courtName}</span>
                    <span className={styles.compactTeams}>
                      {name(match.team1[0])} & {name(match.team1[1])}
                      <span className={styles.previewVs}> vs </span>
                      {name(match.team2[0])} & {name(match.team2[1])}
                    </span>
                  </div>
                );
              })}
              {nextRound.sitOuts.length > 0 && (
                <div className={styles.compactSitOut}>
                  Sit: {nextRound.sitOuts.map(name).join(', ')}
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
          Standings
        </Button>
      </div>

      {/* Round complete interstitial */}
      {roundCompleteNum !== null && (
        <div className={styles.interstitialOverlay} onClick={() => setRoundCompleteNum(null)}>
          <div className={styles.interstitial} onClick={e => e.stopPropagation()}>
            <div className={styles.interstitialContent}>
              <div className={styles.interstitialTitle}>Round {roundCompleteNum} complete!</div>
              <div className={styles.interstitialSub}>Get ready for the next round</div>
              <Button fullWidth onClick={() => setRoundCompleteNum(null)}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Standings overlay */}
      <Modal open={showStandings} title="Standings" onClose={() => setShowStandings(false)}>
        <StandingsTable standings={standings} plannedGames={plannedGames} />
      </Modal>

      <Toast message={toastMessage} />
    </div>
  );
}
