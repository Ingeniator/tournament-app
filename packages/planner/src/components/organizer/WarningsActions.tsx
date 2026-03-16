import { useState, useRef, useCallback } from 'react';
import { Button, useTranslation, formatHasGroups, useClickOutside } from '@padel/common';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
import styles from '../../screens/OrganizerScreen.module.css';

interface WarningsActionsProps {
  tournament: PlannerTournament;
  players: PlannerRegistration[];
  playingPlayers: PlannerRegistration[];
  statuses: Map<string, string>;
  capacity: number;
  confirmedCount: number;
  playerMode: 'quick' | 'share';
  duplicateNames: string[];
  onLaunch: () => void;
  onCopyExport: () => void;
  onExportCopy: () => void;
  onExportFile: () => void;
  onDelete: () => void;
}

export function WarningsActions({
  tournament, players, playingPlayers, statuses, capacity, confirmedCount,
  playerMode, duplicateNames, onLaunch, onCopyExport, onExportCopy, onExportFile, onDelete,
}: WarningsActionsProps) {
  const { t } = useTranslation();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const closeExport = useCallback(() => setExportOpen(false), []);
  useClickOutside(exportRef, exportOpen, closeExport);

  return (
    <>
      {/* Warnings */}
      {playerMode === 'share' && confirmedCount > 0 && confirmedCount < capacity && (() => {
        const courtsNeeded = tournament.courts.length * 4;
        const fillsCourts = confirmedCount >= courtsNeeded;
        return (
          <div className={styles.warning}>
            {t('organizer.spotsFilled', { confirmed: confirmedCount, capacity })}
            {fillsCourts
              ? t('organizer.fillsCourts', {
                  remaining: capacity - confirmedCount,
                  courts: tournament.courts.length === 1 ? t('organizer.courtsSingle') : t('organizer.courtsMultiple', { count: tournament.courts.length }),
                })
              : t('organizer.notFullGames')}
          </div>
        );
      })()}
      {duplicateNames.length > 0 && (
        <div className={styles.warning}>
          {t('organizer.duplicateNames', { names: duplicateNames.join(', ') })}
        </div>
      )}
      {formatHasGroups(tournament.format) && (() => {
        const unassigned = playingPlayers.filter(p => !p.group).length;
        return unassigned > 0 ? (
          <div className={styles.warning}>
            {t('organizer.unassignedGroups', { count: unassigned })}
          </div>
        ) : null;
      })()}
      {tournament.captainMode && (() => {
        const unapproved = players.filter(p => p.confirmed !== false && statuses.get(p.id) === 'registered').length;
        return unapproved > 0 ? (
          <div className={styles.warning}>
            {t('organizer.captainUnapproved', { count: unapproved })}
          </div>
        ) : null;
      })()}

      {/* Action buttons */}
      <Button fullWidth onClick={onLaunch} disabled={players.length === 0}>
        {t('organizer.letsPlay')}
      </Button>
      {playerMode === 'share' && (
      <Button variant="secondary" fullWidth onClick={onCopyExport} disabled={players.length === 0}>
        {t('organizer.copyForDevice')}
      </Button>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <div className={styles.dropdown} ref={exportRef}>
          <Button variant="ghost" fullWidth onClick={() => setExportOpen(v => !v)}>
            {t('organizer.export')} <span className={styles.dropdownArrow}>{exportOpen ? '\u25B2' : '\u25BC'}</span>
          </Button>
          {exportOpen && (
            <div className={styles.dropdownMenu}>
              <button className={styles.dropdownItem} onClick={() => { setExportOpen(false); onExportCopy(); }}>
                {t('organizer.copyData')}
              </button>
              <button className={styles.dropdownItem} onClick={() => { setExportOpen(false); onExportFile(); }}>
                {t('organizer.exportFile')}
              </button>
            </div>
          )}
        </div>
      </div>

      <button className={styles.deleteBtn} onClick={onDelete}>
        {t('organizer.deleteTournament')}
      </button>
    </>
  );
}
