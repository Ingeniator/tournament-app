import { Modal, Button, useTranslation } from '@padel/common';
import type { TournamentStartInfo } from '@padel/common';
import type { WarningReason } from '../hooks/useStartGuard';

interface StartWarningModalProps {
  open: boolean;
  startedBy: TournamentStartInfo | null;
  reason: WarningReason;
  onProceed: () => void;
  onClose: () => void;
}

export function StartWarningModal({ open, startedBy, reason, onProceed, onClose }: StartWarningModalProps) {
  const { t } = useTranslation();

  const handleContinue = () => {
    window.location.href = '/play';
  };

  return (
    <Modal open={open} title={t('startWarning.title')} onClose={onClose}>
      {reason === 'same-user' ? (
        <>
          <p>{t('startWarning.alreadyStartedSelf')}</p>
          <p>{t('startWarning.restartWillErase')}</p>
          <Button fullWidth onClick={handleContinue} style={{ marginTop: '1rem' }}>
            {t('startWarning.continueTournament')}
          </Button>
          <Button fullWidth variant="secondary" onClick={onProceed} style={{ marginTop: '0.5rem' }}>
            {t('startWarning.proceedAnyway')}
          </Button>
        </>
      ) : (
        <>
          <p>{t('startWarning.alreadyStarted', { name: startedBy?.name ?? '' })}</p>
          <p>{t('startWarning.onePersonOnly')}</p>
          <p>{t('startWarning.dataLost')}</p>
          <Button fullWidth onClick={onProceed} style={{ marginTop: '1rem' }}>
            {t('startWarning.proceedAnyway')}
          </Button>
        </>
      )}
    </Modal>
  );
}
