import { Modal, Button, useTranslation } from '@padel/common';
import type { TournamentStartInfo } from '@padel/common';

interface StartWarningModalProps {
  open: boolean;
  startedBy: TournamentStartInfo | null;
  onProceed: () => void;
  onClose: () => void;
}

export function StartWarningModal({ open, startedBy, onProceed, onClose }: StartWarningModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} title={t('startWarning.title')} onClose={onClose}>
      <p>{t('startWarning.alreadyStarted', { name: startedBy?.name ?? '' })}</p>
      <p>{t('startWarning.onePersonOnly')}</p>
      <p>{t('startWarning.dataLost')}</p>
      <Button fullWidth onClick={onProceed} style={{ marginTop: '1rem' }}>
        {t('startWarning.proceedAnyway')}
      </Button>
    </Modal>
  );
}
