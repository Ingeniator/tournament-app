import { useState, useMemo } from 'react';
import type { TournamentFormat, TournamentConfig } from '../../types/tournament';
import { FORMAT_PRESETS, type FormatPreset } from './formatPresets';
import { FormatList } from './FormatList';
import { FormatWizard } from './FormatWizard';
import styles from './FormatPicker.module.css';

interface FormatPickerProps {
  format: TournamentFormat;
  matchMode?: string;
  onChange: (format: TournamentFormat, defaultConfig?: Partial<TournamentConfig>) => void;
  t: (key: string) => string;
}

function resolvePresetId(format: TournamentFormat, matchMode?: string): string {
  if (format === 'club-americano') {
    const preset = FORMAT_PRESETS.find(
      p => p.format === format && p.defaultConfig?.matchMode === (matchMode ?? 'slots')
    );
    return preset?.id ?? 'club-americano';
  }
  return FORMAT_PRESETS.find(p => p.format === format)?.id ?? format;
}

export function FormatPicker({ format, matchMode, onChange, t }: FormatPickerProps) {
  const [mode, setMode] = useState<'list' | 'wizard'>('list');

  const selectedPresetId = useMemo(
    () => resolvePresetId(format, matchMode),
    [format, matchMode]
  );

  const handlePresetChange = (preset: FormatPreset) => {
    onChange(preset.format, preset.defaultConfig);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={`${styles.modeTab} ${mode === 'list' ? styles.modeTabActive : ''}`}
          onClick={() => setMode('list')}
        >
          {t('format.browseMode')}
        </button>
        <button
          className={`${styles.modeTab} ${mode === 'wizard' ? styles.modeTabActive : ''}`}
          onClick={() => setMode('wizard')}
        >
          {t('format.wizardMode')}
        </button>
      </div>
      {mode === 'list' ? (
        <FormatList
          value={selectedPresetId}
          onChange={handlePresetChange}
          t={t}
        />
      ) : (
        <FormatWizard
          onChange={handlePresetChange}
          t={t}
        />
      )}
    </div>
  );
}
