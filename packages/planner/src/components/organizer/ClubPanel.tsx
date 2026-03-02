import type { PlannerRegistration, Club } from '@padel/common';
import { useTranslation, NO_COLOR, getClubColor } from '@padel/common';
import styles from './ClubPanel.module.css';

interface ClubPanelProps {
  clubs: Club[];
  players: PlannerRegistration[];
  onSetClub: (playerId: string, clubId: string | null) => Promise<void>;
}

export function ClubPanel({ clubs, players, onSetClub }: ClubPanelProps) {
  const { t } = useTranslation();

  // Only show confirmed players
  const activePlayers = players.filter(p => p.confirmed !== false);
  const unassigned = activePlayers.filter(p => !p.clubId);

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('organizer.clubPanel')}</h2>

      <div className={styles.clubList}>
        {clubs.map((club, idx) => {
          const color = getClubColor(club, idx);
          const clubPlayers = activePlayers.filter(p => p.clubId === club.id);
          return (
            <div
              key={club.id}
              className={styles.clubCard}
              style={color !== NO_COLOR ? { '--club-color': color } as React.CSSProperties : undefined}
            >
              <div className={styles.clubHeader}>
                <span className={styles.clubName}>{club.name}</span>
              </div>
              <div className={styles.clubPlayers}>
                {clubPlayers.length === 0 ? (
                  <span className={styles.emptyClub}>{t('organizer.clubUnassigned')}</span>
                ) : (
                  clubPlayers.map(p => (
                    <button
                      key={p.id}
                      className={styles.playerTag}
                      onClick={() => onSetClub(p.id, null)}
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

      {unassigned.length > 0 && (
        <div className={styles.unassigned}>
          <div className={styles.unassignedTitle}>{t('organizer.clubUnassigned')} ({unassigned.length})</div>
          <div className={styles.unassignedList}>
            {unassigned.map(p => (
              <div key={p.id} className={styles.unassignedRow}>
                <span className={styles.unassignedName}>{p.name}</span>
                <div className={styles.assignButtons}>
                  {clubs.map((club, idx) => (
                    <button
                      key={club.id}
                      className={styles.assignBtn}
                      style={getClubColor(club, idx) !== NO_COLOR ? { '--club-color': getClubColor(club, idx) } as React.CSSProperties : undefined}
                      onClick={() => onSetClub(p.id, club.id)}
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
