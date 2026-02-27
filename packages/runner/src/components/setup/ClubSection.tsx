import type { Player, Club } from '@padel/common';
import { Button, useTranslation, CLUB_COLORS } from '@padel/common';
import styles from './ClubSection.module.css';

interface ClubSectionProps {
  clubs: Club[];
  players: Player[];
  onAddClub: (name: string) => void;
  onRemoveClub: (clubId: string) => void;
  onRenameClub: (clubId: string, name: string) => void;
  onSetPlayerClub: (playerId: string, clubId: string | null) => void;
}

export function ClubSection({
  clubs,
  players,
  onAddClub,
  onRemoveClub,
  onRenameClub,
  onSetPlayerClub,
}: ClubSectionProps) {
  const { t } = useTranslation();

  const unassigned = players.filter(p => !p.clubId);

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('setup.clubs')}</h2>

      <div className={styles.clubList}>
        {clubs.map((club, idx) => {
          const color = CLUB_COLORS[idx % CLUB_COLORS.length];
          const clubPlayers = players.filter(p => p.clubId === club.id);
          return (
            <div
              key={club.id}
              className={styles.clubCard}
              style={{ '--club-color': color } as React.CSSProperties}
            >
              <div className={styles.clubHeader}>
                <input
                  className={styles.clubNameInput}
                  value={club.name}
                  onChange={e => onRenameClub(club.id, e.target.value)}
                  placeholder={t('setup.clubName')}
                />
                <button
                  className={styles.removeClub}
                  onClick={() => onRemoveClub(club.id)}
                  aria-label={t('common.delete')}
                >
                  ✕
                </button>
              </div>
              <div className={styles.clubPlayers}>
                {clubPlayers.length === 0 ? (
                  <span className={styles.emptyClub}>{t('setup.unassigned')}</span>
                ) : (
                  clubPlayers.map(p => (
                    <button
                      key={p.id}
                      className={styles.playerTag}
                      onClick={() => onSetPlayerClub(p.id, null)}
                      title={t('setup.unassign')}
                    >
                      {p.name} ✕
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="ghost" size="small" onClick={() => onAddClub(`Club ${clubs.length + 1}`)}>
        {t('setup.addClub')}
      </Button>

      {unassigned.length > 0 && (
        <div className={styles.unassigned}>
          <div className={styles.unassignedTitle}>{t('setup.unassigned')} ({unassigned.length})</div>
          <div className={styles.unassignedList}>
            {unassigned.map(p => (
              <div key={p.id} className={styles.unassignedRow}>
                <span className={styles.unassignedName}>{p.name}</span>
                <div className={styles.assignButtons}>
                  {clubs.map((club, idx) => (
                    <button
                      key={club.id}
                      className={styles.assignBtn}
                      style={{ '--club-color': CLUB_COLORS[idx % CLUB_COLORS.length] } as React.CSSProperties}
                      onClick={() => onSetPlayerClub(p.id, club.id)}
                    >
                      {club.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

