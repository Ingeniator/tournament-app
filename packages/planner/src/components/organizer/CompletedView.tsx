import { useState } from 'react';
import { Button, Card, Modal, useTranslation } from '@padel/common';
import type { PlannerTournament } from '@padel/common';
import { restoreFromBackup } from '../../utils/restoreFromBackup';
import type { Screen } from '../../state/PlannerContext';
import styles from '../../screens/OrganizerScreen.module.css';

interface CompletedViewProps {
  tournament: PlannerTournament;
  completedAt: number;
  undoComplete: () => Promise<void>;
  deleteTournament: () => Promise<void>;
  setScreen: (screen: Screen) => void;
  showToast: (msg: string) => void;
}

export function CompletedView({ tournament, completedAt, undoComplete, deleteTournament, setScreen, showToast }: CompletedViewProps) {
  const { t } = useTranslation();
  const [showReopenModal, setShowReopenModal] = useState(false);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => setScreen('home')} aria-label={t('organizer.back')}>&larr;</button>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{tournament.name}</h1>
        </div>
      </header>
      <main>
        <Card>
          <h2 className={styles.sectionTitle}>{t('organizer.completed')}</h2>
          <p>{t('organizer.completedOn', { date: new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) })}</p>
          <Button fullWidth onClick={async () => {
            const ok = await restoreFromBackup(tournament.id);
            if (!ok) showToast(t('organizer.noBackupData'));
          }}>
            {t('organizer.viewResults')}
          </Button>
          <div className={styles.reopenGap} />
          <Button variant="secondary" fullWidth onClick={() => setShowReopenModal(true)}>
            {t('organizer.undoComplete')}
          </Button>
        </Card>
        <button
          className={styles.deleteBtn}
          onClick={async () => {
            if (window.confirm(t('organizer.deleteConfirm'))) {
              await deleteTournament();
            }
          }}
        >
          {t('organizer.deleteTournament')}
        </button>
      </main>

      <Modal
        open={showReopenModal}
        title={t('organizer.reopenTitle')}
        onClose={() => setShowReopenModal(false)}
      >
        <div className={styles.reopenModal}>
          <p className={styles.reopenWarning}>{t('organizer.reopenWarning')}</p>
          <div className={styles.reopenActions}>
            <Button variant="secondary" fullWidth onClick={() => setShowReopenModal(false)}>
              {t('home.cancel')}
            </Button>
            <Button fullWidth onClick={async () => {
              setShowReopenModal(false);
              await undoComplete();
            }}>
              {t('organizer.reopenConfirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
