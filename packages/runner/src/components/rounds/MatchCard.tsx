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

  const team1Label = `${name(match.team1[0])} & ${name(match.team1[1])}`;
  const team2Label = `${name(match.team2[0])} & ${name(match.team2[1])}`;

  return (
    <div className={`${styles.match} ${match.score ? styles.scored : ''}`}>
      <div className={styles.court}>{courtName}</div>
      <div className={styles.teams}>
        <div className={styles.team}>
          <div className={styles.teamName}>
            {name(match.team1[0])}
            <br />
            {name(match.team1[1])}
          </div>
        </div>
        <span className={styles.vs}>vs</span>
        <div className={styles.team}>
          <div className={styles.teamName}>
            {name(match.team2[0])}
            <br />
            {name(match.team2[1])}
          </div>
        </div>
      </div>
      <div className={styles.scoreRow}>
        {readOnly && match.score ? (
          <div
            className={`${styles.readOnlyScore} ${onTapScore ? styles.tappable : ''}`}
            onClick={onTapScore}
          >
            <span className={styles.scoreValue}>{match.score.team1Points}</span>
            <span className={styles.scoreSeparator}>:</span>
            <span className={styles.scoreValue}>{match.score.team2Points}</span>
          </div>
        ) : readOnly ? (
          <div className={styles.readOnlyScore}>
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
            team1Label={team1Label}
            team2Label={team2Label}
          />
        )}
      </div>
    </div>
  );
}
