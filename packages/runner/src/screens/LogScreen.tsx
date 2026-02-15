import { useCallback, useEffect, useRef, useState } from 'react';
import { useTournament } from '../hooks/useTournament';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { useDistributionStats } from '../hooks/useDistributionStats';
import { RoundCard } from '../components/rounds/RoundCard';
import { PlayerStats } from '../components/stats/PlayerStats';
import { DistributionStats } from '../components/stats/DistributionStats';
import { Button, Modal, useTranslation } from '@padel/common';
import { getStrategy, scoreSchedule } from '../strategies';
import type { Round } from '@padel/common';
import styles from './LogScreen.module.css';

interface LogScreenProps {
  onNavigate?: (tab: 'play' | 'log' | 'settings') => void;
  autoShowStats?: boolean;
  onStatsShown?: () => void;
}

export function LogScreen({ onNavigate, autoShowStats, onStatsShown }: LogScreenProps) {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();
  const stats = usePlayerStats(tournament);
  const distributionStats = useDistributionStats(tournament);
  const [editingMatch, setEditingMatch] = useState<{ roundId: string; matchId: string } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [optimizeElapsed, setOptimizeElapsed] = useState<number | null>(null);
  const [optimalBackup, setOptimalBackup] = useState<Round[] | null>(null);
  const optimizeCtrlRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  useEffect(() => {
    if (autoShowStats) {
      queueMicrotask(() => {
        setShowStats(true);
        onStatsShown?.();
      });
    }
  }, [autoShowStats, onStatsShown]);

  const handleExportPlan = useCallback(() => {
    if (!tournament) return;
    const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';

    const lines: string[] = [tournament.name, ''];
    for (const round of tournament.rounds) {
      lines.push(`Round ${round.roundNumber}`);
      for (const match of round.matches) {
        const court = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
        const t1 = `${nameOf(match.team1[0])} & ${nameOf(match.team1[1])}`;
        const t2 = `${nameOf(match.team2[0])} & ${nameOf(match.team2[1])}`;
        lines.push(`  ${court}: ${t1}  vs  ${t2}`);
      }
      if (round.sitOuts.length > 0) {
        lines.push(`  Sit out: ${round.sitOuts.map(nameOf).join(', ')}`);
      }
      lines.push('');
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => alert(t('log.planCopied')));
  }, [tournament, t]);

  const handleOptimize = useCallback(async () => {
    if (!tournament) return;

    const scored = tournament.rounds.filter(r => r.matches.some(m => m.score !== null));
    const count = tournament.rounds.length - scored.length;
    if (count === 0) return;

    const strategy = getStrategy(tournament.config.format);
    const active = tournament.players.filter(p => !p.unavailable);
    const excl = tournament.players.filter(p => p.unavailable).map(p => p.id);

    const maxMs = 300000; // 5 min safety cap
    const chunkMs = 200;
    const start = performance.now();

    const numCourts = Math.min(tournament.config.courts.filter(c => !c.unavailable).length, Math.floor(active.length / 4));
    const totalRounds = scored.length + count;
    const totalPairs = active.length * (active.length - 1) / 2;

    // Ideal partner repeats: total excess pairings when slots exceed unique pairs
    const totalPartnerSlots = numCourts * 2 * totalRounds;
    const idealRepeats = Math.max(0, totalPartnerSlots - totalPairs);

    // Ideal never-played: each match creates C(4,2)=6 pair slots
    const idealNeverPlayed = Math.max(0, totalPairs - totalRounds * numCourts * 6);

    // Early stop when all quality gates are green
    const isAllGreen = (s: [number, number, number, number]) =>
      s[0] <= idealRepeats && s[1] <= 2 && s[2] <= idealNeverPlayed;

    // Score current schedule as baseline
    const currentUnscored = tournament.rounds.filter(r => r.matches.every(m => !m.score));
    let bestScore = scoreSchedule([...scored, ...currentUnscored]);

    const ctrl = { cancelled: false };
    optimizeCtrlRef.current = ctrl;
    setOptimizeElapsed(0);

    while (!ctrl.cancelled && performance.now() - start < maxMs) {
      const result = strategy.generateAdditionalRounds(active, tournament.config, scored, count, excl, chunkMs);
      const score = scoreSchedule([...scored, ...result.rounds]);

      const isBetter = score.some((v, i) => {
        for (let j = 0; j < i; j++) { if (score[j] !== bestScore[j]) return false; }
        return v < bestScore[i];
      });

      if (isBetter) {
        bestScore = score;
        dispatch({ type: 'SET_FUTURE_ROUNDS', payload: { rounds: result.rounds } });

        // Always backup the best-so-far so "Revert to Optimal" never downgrades
        setOptimalBackup(result.rounds);

        // Early stop: all quality gates are green
        if (isAllGreen(score)) break;
      }

      const elapsed = performance.now() - start;
      setOptimizeElapsed(Math.floor(elapsed / 1000));

      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    setOptimizeElapsed(null);
  }, [tournament, dispatch]);

  const handleCancelOptimize = useCallback(() => {
    optimizeCtrlRef.current.cancelled = true;
    setOptimizeElapsed(null);
  }, []);

  const handleRevertOptimal = useCallback(() => {
    if (optimalBackup) {
      dispatch({ type: 'SET_FUTURE_ROUNDS', payload: { rounds: optimalBackup } });
    }
  }, [optimalBackup, dispatch]);

  const handleReshuffle = useCallback(() => {
    if (!tournament) return;
    const scored = tournament.rounds.filter(r => r.matches.some(m => m.score !== null));
    const unscored = tournament.rounds.filter(r => r.matches.every(m => !m.score));
    const beforeScore = scoreSchedule([...scored, ...unscored]);

    // Save current as backup if it's better than what we have
    if (!optimalBackup) {
      setOptimalBackup(unscored);
    } else {
      const backupScore = scoreSchedule([...scored, ...optimalBackup]);
      const currentIsBetter = beforeScore.some((v, i) => {
        for (let j = 0; j < i; j++) { if (beforeScore[j] !== backupScore[j]) return false; }
        return v < backupScore[i];
      });
      if (currentIsBetter) {
        setOptimalBackup(unscored);
      }
    }

    dispatch({ type: 'REGENERATE_FUTURE_ROUNDS' });
  }, [tournament, dispatch, optimalBackup]);

  const handleCloseStats = useCallback(() => {
    optimizeCtrlRef.current.cancelled = true;
    setOptimizeElapsed(null);
    setShowStats(false);
  }, []);

  if (!tournament) return null;

  const handleScore = (roundId: string, matchId: string, score: { team1Points: number; team2Points: number }) => {
    const round = tournament.rounds.find(r => r.id === roundId);
    const match = round?.matches.find(m => m.id === matchId);
    if (match?.score) {
      const courtName = tournament.config.courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
      if (!confirm(t('log.updateScoreConfirm', { round: round!.roundNumber, court: courtName }))) {
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
    if (!confirm(t('log.clearScoreConfirm', { round: round!.roundNumber, court: courtName }))) {
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
      ? t('log.finishTrimConfirm', { count: unscoredRounds.length })
      : t('log.finishConfirm');
    if (confirm(msg)) {
      dispatch({ type: 'COMPLETE_TOURNAMENT' });
      onNavigate?.('play');
    }
  };

  return (
    <div className={styles.container}>
      {tournament.rounds.length === 0 && (
        <div className={styles.empty}>{t('log.noRounds')}</div>
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
          onTapUnscored={(matchId) => setEditingMatch({ roundId: round.id, matchId })}
          onScore={(matchId, score) => handleScore(round.id, matchId, score)}
          onClear={matchId => handleClear(round.id, matchId)}
        />
      ))}

      {(tournament.phase === 'in-progress' || tournament.phase === 'completed') && (
        <div className={styles.footerActions}>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => dispatch({ type: 'ADD_ROUNDS', payload: { count: 1 } })}
          >
            {t('log.addRound')}
          </Button>
          {tournament.phase === 'in-progress' && (
            <Button
              variant="secondary"
              fullWidth
              onClick={handleComplete}
            >
              {t('log.finishTournament')}
            </Button>
          )}
        </div>
      )}

      <div className={styles.statsBtn}>
        <Button variant="secondary" fullWidth onClick={() => setShowStats(true)}>
          {t('log.statistics')}
        </Button>
      </div>

      <Modal open={showStats} title={t('log.statisticsTitle')} onClose={handleCloseStats}>
        {distributionStats && (
          <DistributionStats
            data={distributionStats}
            canReshuffle={
              tournament.phase === 'in-progress' &&
              tournament.rounds.some(r => r.matches.every(m => !m.score))
            }
            onReshuffle={handleReshuffle}
            onOptimize={handleOptimize}
            onCancelOptimize={handleCancelOptimize}
            optimizeElapsed={optimizeElapsed}
            hasOptimalBackup={
              optimalBackup !== null &&
              optimalBackup.map(r => r.id).join() !==
                tournament.rounds.filter(r => r.matches.every(m => !m.score)).map(r => r.id).join()
            }
            onRevertOptimal={handleRevertOptimal}
            onPlay={onNavigate ? () => { handleCloseStats(); onNavigate('play'); } : undefined}
          />
        )}
        <PlayerStats stats={stats} />
        <div className={styles.exportBtn}>
          <Button variant="secondary" fullWidth onClick={handleExportPlan}>
            {t('log.exportPlan')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
