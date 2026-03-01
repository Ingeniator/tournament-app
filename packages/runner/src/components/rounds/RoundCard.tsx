import type { Round, Player, Court, MatchScore, TournamentFormat, MaldicionesHands, Team } from '@padel/common';
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
  format?: TournamentFormat;
  maldicionesEnabled?: boolean;
  maldicionesHands?: MaldicionesHands;
  teams?: Team[];
  onStartEdit?: (matchId: string) => void;
  onTapUnscored?: (matchId: string) => void;
  onScore: (matchId: string, score: MatchScore) => void;
  onClear: (matchId: string) => void;
  onCast?: (matchId: string, castBy: 'team1' | 'team2', cardId: string, targetPlayerId: string) => void;
  onEscudo?: (matchId: string) => void;
  onVeto?: (matchId: string) => void;
}

export function RoundCard({ round, players, courts, pointsPerMatch, readOnly, editingMatchId, format, maldicionesEnabled, maldicionesHands, teams, onStartEdit, onTapUnscored, onScore, onClear, onCast, onEscudo, onVeto }: RoundCardProps) {
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
              format={format}
              maldicionesEnabled={maldicionesEnabled}
              maldicionesHands={maldicionesHands}
              teams={teams}
              onScore={score => onScore(match.id, score)}
              onClear={() => onClear(match.id)}
              onTapScore={
                readOnly && match.score && onStartEdit
                  ? () => onStartEdit(match.id)
                  : readOnly && !match.score && onTapUnscored
                    ? () => onTapUnscored(match.id)
                    : undefined
              }
              onCast={onCast ? (castBy, cardId, targetPlayerId) => onCast(match.id, castBy, cardId, targetPlayerId) : undefined}
              onEscudo={onEscudo ? () => onEscudo(match.id) : undefined}
              onVeto={onVeto ? () => onVeto(match.id) : undefined}
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
