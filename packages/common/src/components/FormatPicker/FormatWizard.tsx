import { useState } from 'react';
import type { TournamentFormat } from '../../types/tournament';
import { FORMAT_PRESETS, getPresetByFormat, type FormatPreset } from './formatPresets';
import styles from './FormatPicker.module.css';

interface FormatWizardProps {
  format: TournamentFormat;
  onChange: (preset: FormatPreset) => void;
  t: (key: string) => string;
}

type PartnerMode = 'rotating' | 'fixed' | null;
type OpponentMode = 'random' | 'standings' | 'promotion' | null;

function deriveWizardState(format: TournamentFormat): {
  partnerMode: PartnerMode;
  opponentMode: OpponentMode;
  crossGroup: boolean;
  clubMode: boolean;
} {
  const preset = getPresetByFormat(format);
  if (!preset) return { partnerMode: null, opponentMode: null, crossGroup: false, clubMode: false };
  const tags = preset.tags;
  const partnerMode: PartnerMode = tags.includes('rotating') ? 'rotating' : tags.includes('fixed') ? 'fixed' : null;
  const opponentMode: OpponentMode = tags.includes('random') ? 'random' : tags.includes('standings') ? 'standings' : tags.includes('promotion') ? 'promotion' : null;
  return {
    partnerMode,
    opponentMode,
    crossGroup: tags.includes('groups'),
    clubMode: tags.includes('clubs'),
  };
}

function matchesFilters(
  p: FormatPreset,
  partnerMode: PartnerMode,
  opponentMode: OpponentMode,
  crossGroup: boolean,
  clubMode: boolean,
): boolean {
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
}

function resolvePreset(
  partnerMode: PartnerMode,
  opponentMode: OpponentMode,
  crossGroup: boolean,
  clubMode: boolean,
): FormatPreset | null {
  return FORMAT_PRESETS.find(p => matchesFilters(p, partnerMode, opponentMode, crossGroup, clubMode)) ?? null;
}

export function FormatWizard({ format, onChange, t }: FormatWizardProps) {
  const initial = deriveWizardState(format);
  const [partnerMode, setPartnerMode] = useState<PartnerMode>(initial.partnerMode);
  const [opponentMode, setOpponentMode] = useState<OpponentMode>(initial.opponentMode);
  const [crossGroup, setCrossGroup] = useState(initial.crossGroup);
  const [clubMode, setClubMode] = useState(initial.clubMode);

  const handlePartnerMode = (mode: PartnerMode) => {
    setPartnerMode(mode);
    if (mode === 'fixed' && opponentMode === 'promotion') {
      setOpponentMode(null);
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

  const resolved = (partnerMode && opponentMode)
    ? resolvePreset(partnerMode, opponentMode, crossGroup, clubMode)
    : null;

  // Auto-apply when resolved
  const handleSelect = () => {
    if (resolved) onChange(resolved);
  };

  // Auto-apply when toggling options checkboxes so related config (group labels, clubs) appears immediately
  const handleCrossGroup = (checked: boolean) => {
    setCrossGroup(checked);
    if (partnerMode && opponentMode) {
      const next = resolvePreset(partnerMode, opponentMode, checked, clubMode);
      if (next) onChange(next);
    }
  };

  const handleClubMode = (checked: boolean) => {
    setClubMode(checked);
    if (partnerMode && opponentMode) {
      const next = resolvePreset(partnerMode, opponentMode, crossGroup, checked);
      if (next) onChange(next);
    }
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
            <label className={styles.wizardCheckbox}>
              <input
                type="checkbox"
                checked={crossGroup}
                onChange={e => handleCrossGroup(e.target.checked)}
              />
              <span>{t('format.wizardCrossGroup')}</span>
            </label>
            <label className={styles.wizardCheckbox}>
              <input
                type="checkbox"
                checked={clubMode}
                onChange={e => handleClubMode(e.target.checked)}
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
          {t('format.wizardNotYet')}
        </div>
      )}
    </div>
  );
}
