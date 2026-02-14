import { useState, useEffect, useCallback } from 'react';

/* ── Skin definitions ──
   Each skin is a curated combo of neutral + accent + dark/light mode.
   Radix skins use Radix CSS variable references; Catppuccin skins use
   hardcoded hex values from the Catppuccin palette. */

export type SkinId =
  | 'midnight' | 'crimson' | 'ember' | 'forest' | 'amethyst'
  | 'arctic' | 'rose' | 'dawn' | 'mint' | 'lavender'
  | 'mocha' | 'latte' | 'frappe';

export interface ThemeSkin {
  id: SkinId;
  name: string;
  mode: 'dark' | 'light';
  preview: { bg: string; surface: string; accent: string };
}

export const THEME_SKINS: ThemeSkin[] = [
  // Dark
  { id: 'midnight',  name: 'Midnight',  mode: 'dark',  preview: { bg: '#111113', surface: '#18191b', accent: '#3e63dd' } },
  { id: 'crimson',   name: 'Crimson',   mode: 'dark',  preview: { bg: '#121113', surface: '#1a191b', accent: '#e93d82' } },
  { id: 'ember',     name: 'Ember',     mode: 'dark',  preview: { bg: '#111110', surface: '#191918', accent: '#f76b15' } },
  { id: 'forest',    name: 'Forest',    mode: 'dark',  preview: { bg: '#101211', surface: '#171918', accent: '#12a594' } },
  { id: 'amethyst',  name: 'Amethyst',  mode: 'dark',  preview: { bg: '#121113', surface: '#1a191b', accent: '#8e4ec6' } },
  // Light
  { id: 'arctic',    name: 'Arctic',    mode: 'light', preview: { bg: '#fcfcfd', surface: '#f9f9fb', accent: '#3e63dd' } },
  { id: 'rose',      name: 'Rose',      mode: 'light', preview: { bg: '#fdfcfd', surface: '#faf9fb', accent: '#e93d82' } },
  { id: 'dawn',      name: 'Dawn',      mode: 'light', preview: { bg: '#fdfdfc', surface: '#f9f9f8', accent: '#f76b15' } },
  { id: 'mint',      name: 'Mint',      mode: 'light', preview: { bg: '#fbfdfc', surface: '#f7f9f8', accent: '#12a594' } },
  { id: 'lavender',  name: 'Lavender',  mode: 'light', preview: { bg: '#fdfcfd', surface: '#faf9fb', accent: '#8e4ec6' } },
  // Catppuccin
  { id: 'mocha',     name: 'Mocha',     mode: 'dark',  preview: { bg: '#1e1e2e', surface: '#313244', accent: '#cba6f7' } },
  { id: 'frappe',    name: 'Frappé',    mode: 'dark',  preview: { bg: '#303446', surface: '#414559', accent: '#ef9f76' } },
  { id: 'latte',     name: 'Latte',     mode: 'light', preview: { bg: '#eff1f5', surface: '#e6e9ef', accent: '#8839ef' } },
];

export const DEFAULT_SKIN: SkinId = 'midnight';

const VALID_SKINS = new Set<string>(THEME_SKINS.map(s => s.id));

export function isValidSkin(id: string): id is SkinId {
  return VALID_SKINS.has(id);
}

export function getSkin(id: SkinId): ThemeSkin {
  return THEME_SKINS.find(s => s.id === id) ?? THEME_SKINS[0];
}

function applySkin(skinId: SkinId) {
  const skin = getSkin(skinId);
  const el = document.documentElement;

  // Set dark/light mode
  if (skin.mode === 'dark') {
    el.classList.add('dark-theme');
    el.classList.remove('light-theme');
  } else {
    el.classList.remove('dark-theme');
    el.classList.add('light-theme');
  }

  // Remove all skin classes, apply current
  for (const s of THEME_SKINS) {
    el.classList.remove(`skin-${s.id}`);
  }
  el.classList.add(`skin-${skinId}`);
}

export function useTheme(initialSkin?: SkinId) {
  const [skin, setSkinState] = useState<SkinId>(initialSkin ?? DEFAULT_SKIN);

  useEffect(() => {
    applySkin(skin);
  }, [skin]);

  // Sync when initial value changes (e.g. loaded from Firebase)
  useEffect(() => {
    if (initialSkin) {
      setSkinState(initialSkin);
    }
  }, [initialSkin]);

  const setSkin = useCallback((id: SkinId) => {
    setSkinState(id);
  }, []);

  return { skin, setSkin };
}
