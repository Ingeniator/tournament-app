import { useState, useRef, useEffect } from 'react';
import { THEME_SKINS, type SkinId, type ThemeSkin } from '../hooks/useTheme';
import styles from './SkinPicker.module.css';

interface SkinPickerProps {
  skin: SkinId;
  onSelect: (skin: SkinId) => void;
}

function Swatch({ skin }: { skin: ThemeSkin }) {
  return (
    <span className={styles.swatch}>
      <span className={styles.swatchLeft} style={{ backgroundColor: skin.preview.bg }} />
      <span className={styles.swatchRight} style={{ backgroundColor: skin.preview.accent }} />
    </span>
  );
}

const CATPPUCCIN_IDS = new Set(['mocha', 'frappe', 'latte']);
const DARK_SKINS = THEME_SKINS.filter(s => s.mode === 'dark' && !CATPPUCCIN_IDS.has(s.id));
const LIGHT_SKINS = THEME_SKINS.filter(s => s.mode === 'light' && !CATPPUCCIN_IDS.has(s.id));
const CATPPUCCIN_SKINS = THEME_SKINS.filter(s => CATPPUCCIN_IDS.has(s.id));

const GROUPS: { label: string; skins: ThemeSkin[] }[] = [
  { label: 'Dark', skins: DARK_SKINS },
  { label: 'Light', skins: LIGHT_SKINS },
  { label: 'Catppuccin', skins: CATPPUCCIN_SKINS },
];

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {GROUPS.map(g => (
            <div key={g.label}>
              <div className={styles.groupLabel}>{g.label}</div>
              {g.skins.map(s => (
                <button
                  key={s.id}
                  className={`${styles.item} ${skin === s.id ? styles.active : ''}`}
                  onClick={() => handleSelect(s.id)}
                >
                  <Swatch skin={s} />
                  {s.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
