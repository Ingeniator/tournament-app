import { THEME_SKINS, type SkinId, type ThemeSkin } from '../hooks/useTheme';
import styles from './SkinPicker.module.css';

interface SkinPickerProps {
  skin: SkinId;
  onSelect: (skin: SkinId) => void;
}

function SkinCard({ skin, active, onSelect }: { skin: ThemeSkin; active: boolean; onSelect: (id: SkinId) => void }) {
  return (
    <button
      className={`${styles.card} ${active ? styles.active : ''}`}
      onClick={() => onSelect(skin.id)}
      title={skin.name}
      aria-label={`${skin.name} theme`}
    >
      <div
        className={styles.preview}
        style={{ backgroundColor: skin.preview.bg }}
      >
        <div
          className={styles.previewSurface}
          style={{ backgroundColor: skin.preview.surface }}
        />
        <div
          className={styles.previewAccent}
          style={{ backgroundColor: skin.preview.accent }}
        />
      </div>
      <span className={styles.name}>{skin.name}</span>
    </button>
  );
}

const CATPPUCCIN_IDS = new Set(['mocha', 'frappe', 'latte']);

export function SkinPicker({ skin, onSelect }: SkinPickerProps) {
  const darkSkins = THEME_SKINS.filter(s => s.mode === 'dark' && !CATPPUCCIN_IDS.has(s.id));
  const lightSkins = THEME_SKINS.filter(s => s.mode === 'light' && !CATPPUCCIN_IDS.has(s.id));
  const catppuccinSkins = THEME_SKINS.filter(s => CATPPUCCIN_IDS.has(s.id));

  return (
    <div className={styles.picker}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>Dark</span>
        <div className={styles.grid}>
          {darkSkins.map(s => (
            <SkinCard key={s.id} skin={s} active={skin === s.id} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <span className={styles.groupLabel}>Light</span>
        <div className={styles.grid}>
          {lightSkins.map(s => (
            <SkinCard key={s.id} skin={s} active={skin === s.id} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <span className={styles.groupLabel}>Catppuccin</span>
        <div className={styles.grid}>
          {catppuccinSkins.map(s => (
            <SkinCard key={s.id} skin={s} active={skin === s.id} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}
