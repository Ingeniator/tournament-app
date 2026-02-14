import type { Round, Player, Court, MatchScore } from '@padel/common';
import { useTranslation } from '@padel/common';
import { MatchCard } from './MatchCard';
import styles from './RoundCard.module.css';

interface RoundCardProps {
  round: Round;
  players: Player[];
  courts: Court[];
  pointsPerMatch: number;
  readOnly?: boolean;
  editingMatchId?: string;
  onStartEdit?: (matchId: string) => void;
  onScore: (matchId: string, score: MatchScore) => void;
  onClear: (matchId: string) => void;
}

export function RoundCard({ round, players, courts, pointsPerMatch, readOnly, editingMatchId, onStartEdit, onScore, onClear }: RoundCardProps) {
  const { t } = useTranslation();
  const name = (id: string) => players.find(p => p.id === id)?.name ?? '?';
  const scoredCount = round.matches.filter(m => m.score).length;
  const allScored = scoredCount === round.matches.length;

  return (
    <div className={styles.round}>
      <div className={styles.header}>
        <h3 className={styles.roundTitle}>{t('round.title', { num: round.roundNumber })}</h3>
        <span className={`${styles.badge} ${allScored ? styles.badgeComplete : ''}`}>
          {scoredCount}/{round.matches.length}
        </span>
      </div>
      <div className={styles.matches}>
        {round.matches.map(match => {
          const isEditing = editingMatchId === match.id;
          return (
            <MatchCard
              key={match.id}
              match={match}
              players={players}
              courts={courts}
              pointsPerMatch={pointsPerMatch}
              readOnly={readOnly && !isEditing}
              onScore={score => onScore(match.id, score)}
              onClear={() => onClear(match.id)}
              onTapScore={readOnly && onStartEdit && match.score ? () => onStartEdit(match.id) : undefined}
            />
          );
        })}
      </div>
      {round.sitOuts.length > 0 && (
        <div className={styles.sitOut}>
          {t('round.sittingOut', { names: round.sitOuts.map(name).join(', ') })}
        </div>
      )}
    </div>
  );
}
