import { useState } from 'react';
import { useTournament } from '../hooks/useTournament';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { RoundCard } from '../components/rounds/RoundCard';
import { PlayerStats } from '../components/stats/PlayerStats';
import { Button } from '@padel/common';
import styles from './LogScreen.module.css';

export function LogScreen() {
  const { tournament, dispatch } = useTournament();
  const stats = usePlayerStats(tournament);
  const [editingMatch, setEditingMatch] = useState<{ roundId: string; matchId: string } | null>(null);
  const [showStats, setShowStats] = useState(false);

  if (!tournament) return null;

  const handleScore = (roundId: string, matchId: string, score: { team1Points: number; team2Points: number }) => {
    const round = tournament.rounds.find(r => r.id === roundId);
    const match = round?.matches.find(m => m.id === matchId);
    if (match?.score) {
      const courtName = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
      if (!confirm(`Update score for Round ${round!.roundNumber}, ${courtName}?`)) {
        setEditingMatch(null);
        return;
      }
    }
    dispatch({
      type: 'SET_MATCH_SCORE',
      payload: { roundId, matchId, score },
    });
    setEditingMatch(null);
  };

  const handleClear = (roundId: string, matchId: string) => {
    const round = tournament.rounds.find(r => r.id === roundId);
    const courtName = tournament.config.courts.find(
      c => c.id === round?.matches.find(m => m.id === matchId)?.courtId
    )?.name ?? '';
    if (!confirm(`Clear score for Round ${round!.roundNumber}, ${courtName}?`)) {
      return;
    }
    dispatch({
      type: 'CLEAR_MATCH_SCORE',
      payload: { roundId, matchId },
    });
    setEditingMatch(null);
  };

  const handleComplete = () => {
    const unscoredRounds = tournament.rounds.filter(r => r.matches.some(m => !m.score));
    const msg = unscoredRounds.length > 0
      ? `Finish tournament? ${unscoredRounds.length} round(s) with unscored matches will be trimmed.`
      : 'Mark tournament as completed?';
    if (confirm(msg)) {
      dispatch({ type: 'COMPLETE_TOURNAMENT' });
    }
  };

  return (
    <div className={styles.container}>
      {tournament.rounds.length === 0 && (
        <div className={styles.empty}>No rounds yet</div>
      )}

      {tournament.rounds.map(round => (
        <RoundCard
          key={round.id}
          round={round}
          players={tournament.players}
          courts={tournament.config.courts}
          pointsPerMatch={tournament.config.pointsPerMatch}
          readOnly={editingMatch?.roundId !== round.id || editingMatch?.matchId === undefined}
          editingMatchId={editingMatch?.roundId === round.id ? editingMatch.matchId : undefined}
          onStartEdit={(matchId) => setEditingMatch({ roundId: round.id, matchId })}
          onScore={(matchId, score) => handleScore(round.id, matchId, score)}
          onClear={matchId => handleClear(round.id, matchId)}
        />
      ))}

      {tournament.phase === 'in-progress' && (
        <div className={styles.footerActions}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => dispatch({ type: 'ADD_ROUNDS', payload: { count: 1 } })}
          >
            + Add Round
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={handleComplete}
          >
            Finish Tournament
          </Button>
        </div>
      )}

      <div className={styles.statsBtn}>
        <Button variant="secondary" fullWidth onClick={() => setShowStats(true)}>
          Statistics
        </Button>
      </div>

      {showStats && (
        <div className={styles.overlay} onClick={() => setShowStats(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Statistics</h3>
              <button className={styles.closeBtn} onClick={() => setShowStats(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <PlayerStats stats={stats} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
