import type { Match, MatchScore, Player, Court } from '@padel/common';
import { ScoreInput } from './ScoreInput';
import styles from './MatchCard.module.css';

interface MatchCardProps {
  match: Match;
  players: Player[];
  courts: Court[];
  pointsPerMatch: number;
  readOnly?: boolean;
  onScore: (score: MatchScore) => void;
  onClear: () => void;
  onTapScore?: () => void;
}

export function MatchCard({ match, players, courts, pointsPerMatch, readOnly, onScore, onClear, onTapScore }: MatchCardProps) {
  const name = (id: string) => players.find(p => p.id === id)?.name ?? '?';
  const courtName = courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
  const team1Won = match.score && match.score.team1Points > match.score.team2Points;
  const team2Won = match.score && match.score.team2Points > match.score.team1Points;

  return (
    <div className={`${styles.match} ${match.score ? styles.scored : ''}`}>
      <div className={styles.courtLabel}>{courtName}</div>
      <div className={styles.court}>
        {/* Row 1: first players with & */}
        <div className={`${styles.playerCell} ${styles.topLeft} ${team1Won ? styles.winner : ''}`} title={name(match.team1[0])}>
          <span className={styles.playerName}>{name(match.team1[0])}</span>
          <span className={styles.ampersand}>&amp;</span>
        </div>
        <span className={styles.vsLabel}>vs</span>
        <div className={`${styles.playerCell} ${styles.topRight} ${team2Won ? styles.winner : ''}`} title={name(match.team2[0])}>
          <span className={styles.playerName}>{name(match.team2[0])}</span>
          <span className={styles.ampersand}>&amp;</span>
        </div>

        {/* Row 2: second players */}
        <div className={`${styles.playerCell} ${styles.bottomLeft} ${team1Won ? styles.winner : ''}`} title={name(match.team1[1])}>
          <span className={styles.playerName}>{name(match.team1[1])}</span>
        </div>
        <div className={`${styles.playerCell} ${styles.bottomRight} ${team2Won ? styles.winner : ''}`} title={name(match.team2[1])}>
          <span className={styles.playerName}>{name(match.team2[1])}</span>
        </div>

        {/* Row 3: Score */}
        {readOnly && match.score ? (
          <div
            className={`${styles.scoreCenter} ${onTapScore ? styles.tappable : ''}`}
            onClick={onTapScore}
            {...(onTapScore ? { role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTapScore(); } }, 'aria-label': 'Edit score' } : {})}
          >
            <span className={styles.scoreValue}>{match.score.team1Points}</span>
            <span className={styles.scoreSeparator}>:</span>
            <span className={styles.scoreValue}>{match.score.team2Points}</span>
          </div>
        ) : readOnly ? (
          <div
            className={`${styles.scoreCenter} ${onTapScore ? styles.tappable : ''}`}
            onClick={onTapScore}
            {...(onTapScore ? { role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTapScore(); } }, 'aria-label': 'Enter score' } : {})}
          >
            <span className={styles.noScore}>–</span>
            <span className={styles.scoreSeparator}>:</span>
            <span className={styles.noScore}>–</span>
          </div>
        ) : (
          <ScoreInput
            score={match.score}
            pointsPerMatch={pointsPerMatch}
            onSave={onScore}
            onClear={onClear}
          />
        )}
      </div>
    </div>
  );
}
