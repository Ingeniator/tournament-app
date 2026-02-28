import { useState } from 'react';
import { FORMAT_PRESETS, type FormatPreset } from './formatPresets';
import styles from './FormatPicker.module.css';

interface FormatWizardProps {
  onChange: (preset: FormatPreset) => void;
  t: (key: string) => string;
}

type PartnerMode = 'rotating' | 'fixed' | null;
type OpponentMode = 'random' | 'standings' | 'promotion' | null;

function resolvePreset(
  partnerMode: PartnerMode,
  opponentMode: OpponentMode,
  crossGroup: boolean,
  clubMode: boolean,
): FormatPreset | null {
  const candidates = FORMAT_PRESETS.filter(p => {
    if (partnerMode === 'rotating' && !p.tags.includes('rotating')) return false;
    if (partnerMode === 'fixed' && !p.tags.includes('fixed')) return false;
    if (opponentMode === 'random' && !p.tags.includes('random')) return false;
    if (opponentMode === 'standings' && !p.tags.includes('standings')) return false;
    if (opponentMode === 'promotion' && !p.tags.includes('promotion')) return false;
    if (crossGroup && !p.tags.includes('groups')) return false;
    if (!crossGroup && p.tags.includes('groups')) return false;
    if (clubMode && !p.tags.includes('clubs')) return false;
    if (!clubMode && p.tags.includes('clubs')) return false;
    return true;
  });
  return candidates[0] ?? null;
}

export function FormatWizard({ onChange, t }: FormatWizardProps) {
  const [partnerMode, setPartnerMode] = useState<PartnerMode>(null);
  const [opponentMode, setOpponentMode] = useState<OpponentMode>(null);
  const [crossGroup, setCrossGroup] = useState(false);
  const [clubMode, setClubMode] = useState(false);

  const handlePartnerMode = (mode: PartnerMode) => {
    setPartnerMode(mode);
    // Reset opponent mode if incompatible
    if (mode === 'rotating' && opponentMode === null) return;
    if (mode === 'fixed') {
      setOpponentMode(null);
      setCrossGroup(false);
    }
  };

  const handleOpponentMode = (mode: OpponentMode) => {
    setOpponentMode(mode);
  };

  // Determine available opponent modes based on partner mode
  const availableOpponentModes: { mode: OpponentMode; labelKey: string; disabled: boolean; disabledReason?: string }[] = [
    {
      mode: 'random',
      labelKey: 'format.wizardRandom',
      disabled: false,
    },
    {
      mode: 'standings',
      labelKey: 'format.wizardStandings',
      disabled: false,
    },
    {
      mode: 'promotion',
      labelKey: 'format.wizardPromotion',
      disabled: partnerMode === 'fixed',
      disabledReason: t('format.wizardPromotionDisabled'),
    },
  ];

  // Cross-group only applies to rotating partners (fixed teams are set at registration)
  const crossGroupDisabled = partnerMode === 'fixed';

  // Resolve result (use effective crossGroup value — disabled means unchecked)
  const effectiveCrossGroup = crossGroup && !crossGroupDisabled;
  const resolved = (partnerMode && opponentMode)
    ? resolvePreset(partnerMode, opponentMode, effectiveCrossGroup, clubMode)
    : null;

  // Auto-select when resolved
  const handleSelect = () => {
    if (resolved) onChange(resolved);
  };

  return (
    <div className={styles.wizard}>
      {/* Step 1: Partner mode */}
      <div className={styles.wizardStep}>
        <div className={styles.wizardStepLabel}>{t('format.wizardStep1')}</div>
        <div className={styles.wizardOptions}>
          <button
            className={`${styles.wizardBtn} ${partnerMode === 'rotating' ? styles.wizardBtnActive : ''}`}
            onClick={() => handlePartnerMode('rotating')}
          >
            {t('format.wizardRotating')}
          </button>
          <button
            className={`${styles.wizardBtn} ${partnerMode === 'fixed' ? styles.wizardBtnActive : ''}`}
            onClick={() => handlePartnerMode('fixed')}
          >
            {t('format.wizardFixed')}
          </button>
        </div>
      </div>

      {/* Step 2: Opponent mode */}
      {partnerMode && (
        <div className={styles.wizardStep}>
          <div className={styles.wizardStepLabel}>{t('format.wizardStep2')}</div>
          <div className={styles.wizardOptions}>
            {availableOpponentModes.map(opt => (
              <button
                key={opt.mode}
                className={`${styles.wizardBtn} ${opponentMode === opt.mode ? styles.wizardBtnActive : ''} ${opt.disabled ? styles.wizardBtnDisabled : ''}`}
                onClick={() => !opt.disabled && handleOpponentMode(opt.mode)}
                title={opt.disabled ? opt.disabledReason : undefined}
                disabled={opt.disabled}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Options */}
      {partnerMode && opponentMode && (
        <div className={styles.wizardStep}>
          <div className={styles.wizardStepLabel}>{t('format.wizardStep3')}</div>
          <div className={styles.wizardCheckboxes}>
            <label className={`${styles.wizardCheckbox} ${crossGroupDisabled ? styles.wizardCheckboxDisabled : ''}`}>
              <input
                type="checkbox"
                checked={crossGroup && !crossGroupDisabled}
                onChange={e => !crossGroupDisabled && setCrossGroup(e.target.checked)}
                disabled={crossGroupDisabled}
              />
              <span>{t('format.wizardCrossGroup')}</span>
            </label>
            <label className={styles.wizardCheckbox}>
              <input
                type="checkbox"
                checked={clubMode}
                onChange={e => setClubMode(e.target.checked)}
              />
              <span>{t('format.wizardClub')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Result */}
      {resolved && (
        <div className={styles.wizardResult}>
          <div className={styles.wizardResultLabel}>{t('format.wizardResult')}</div>
          <button className={styles.wizardResultBtn} onClick={handleSelect}>
            {t(resolved.nameKey)}
          </button>
        </div>
      )}

      {partnerMode && opponentMode && !resolved && (
        <div className={styles.wizardNoMatch}>
          {t('format.wizardNoMatch')}
        </div>
      )}
    </div>
  );
}
