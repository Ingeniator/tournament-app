import { useState, useRef, useEffect, useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { useStandings } from '../hooks/useStandings';
import { RoundCard } from '../components/rounds/RoundCard';
import { StandingsTable } from '../components/standings/StandingsTable';
import { useShareText } from '../hooks/useShareText';
import { copyToClipboard } from '../utils/clipboard';
import { Button } from '@padel/common';
import styles from './PlayScreen.module.css';

export function PlayScreen() {
  const { tournament, dispatch } = useTournament();
  const standings = useStandings(tournament);
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
  const { roundResults, standingsText } = useShareText(tournament, standings);
  const [showStandings, setShowStandings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [roundCompleteNum, setRoundCompleteNum] = useState<number | null>(null);
  const prevActiveRoundIdRef = useRef<string | null>(null);

  if (!tournament) return null;

  // Completed state — show summary
  if (tournament.phase === 'completed') {
    const fullText = [standingsText, '', roundResults].filter(Boolean).join('\n');
    const handleCopy = async () => {
      const ok = await copyToClipboard(fullText);
      setToast(ok ? 'Copied!' : 'Failed to copy');
      setTimeout(() => setToast(null), 2000);
    };

    return (
      <div className={styles.container}>
        <div className={styles.completedHeader}>
          <h2 className={styles.completedTitle}>Tournament Complete</h2>
        </div>
        <pre className={styles.summaryText}>{fullText}</pre>
        <Button fullWidth onClick={handleCopy}>
          Copy to Clipboard
        </Button>
        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    );
  }

  const totalMatches = tournament.rounds.reduce((n, r) => n + r.matches.length, 0);
  const scoredMatches = tournament.rounds.reduce(
    (n, r) => n + r.matches.filter(m => m.score).length, 0
  );
  const scoredRounds = tournament.rounds.filter(r => r.matches.every(m => m.score)).length;

  // Find active round: first round with any unscored matches
  const activeRoundIndex = tournament.rounds.findIndex(r => r.matches.some(m => !m.score));
  const activeRound = activeRoundIndex >= 0 ? tournament.rounds[activeRoundIndex] : null;
  const prevRound = activeRoundIndex > 0 ? tournament.rounds[activeRoundIndex - 1] : null;
  const nextRound = activeRoundIndex >= 0 && activeRoundIndex + 1 < tournament.rounds.length
    ? tournament.rounds[activeRoundIndex + 1]
    : null;

  // Detect round completion: when active round changes, show interstitial
  useEffect(() => {
    const prevId = prevActiveRoundIdRef.current;
    const curId = activeRound?.id ?? null;

    if (prevId !== null && curId !== null && prevId !== curId) {
      // Active round advanced — previous round was just completed
      const completedRound = tournament.rounds.find(r => r.id === prevId);
      if (completedRound) {
        setRoundCompleteNum(completedRound.roundNumber);
      }
    }

    prevActiveRoundIdRef.current = curId;
  }, [activeRound?.id, tournament.rounds]);

  const name = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';

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
          All rounds scored!
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
        <div className={`${styles.overlay} ${styles.overlayCentered}`} onClick={() => setRoundCompleteNum(null)}>
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
      {showStandings && (
        <div className={styles.overlay} onClick={() => setShowStandings(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Standings</h3>
              <button className={styles.closeBtn} onClick={() => setShowStandings(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <StandingsTable standings={standings} plannedGames={plannedGames} />
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
