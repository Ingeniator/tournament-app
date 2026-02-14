import { useState, useRef, useEffect } from 'react';
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
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const darkSkins = THEME_SKINS.filter(s => s.mode === 'dark' && !CATPPUCCIN_IDS.has(s.id));
  const lightSkins = THEME_SKINS.filter(s => s.mode === 'light' && !CATPPUCCIN_IDS.has(s.id));
  const catppuccinSkins = THEME_SKINS.filter(s => CATPPUCCIN_IDS.has(s.id));

  const handleSelect = (id: SkinId) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(v => !v)}
        aria-label="Change theme"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Dark</span>
            <div className={styles.grid}>
              {darkSkins.map(s => (
                <SkinCard key={s.id} skin={s} active={skin === s.id} onSelect={handleSelect} />
              ))}
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Light</span>
            <div className={styles.grid}>
              {lightSkins.map(s => (
                <SkinCard key={s.id} skin={s} active={skin === s.id} onSelect={handleSelect} />
              ))}
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>Catppuccin</span>
            <div className={styles.grid}>
              {catppuccinSkins.map(s => (
                <SkinCard key={s.id} skin={s} active={skin === s.id} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
