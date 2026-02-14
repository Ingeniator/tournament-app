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

export function SkinPicker({ skin, onSelect }: SkinPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentSkin = THEME_SKINS.find(s => s.id === skin) ?? THEME_SKINS[0];

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

  const groups: { label: string; skins: ThemeSkin[] }[] = [
    { label: 'Dark', skins: darkSkins },
    { label: 'Light', skins: lightSkins },
    { label: 'Catppuccin', skins: catppuccinSkins },
  ];

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(v => !v)}
        aria-label="Change theme"
      >
        <Swatch skin={currentSkin} />
        <span className={styles.triggerName}>{currentSkin.name}</span>
        <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {groups.map(g => (
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
