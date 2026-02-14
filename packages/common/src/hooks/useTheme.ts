import { useState, useEffect, useCallback } from 'react';

/* ── Skin definitions ──
   Each skin is a curated combo of neutral + accent + dark/light mode.
   Radix skins use Radix CSS variable references; Catppuccin skins use
   hardcoded hex values from the Catppuccin palette. */

export type SkinId =
  | 'midnight' | 'crimson' | 'ember' | 'forest' | 'navy'
  | 'arctic' | 'rose' | 'dawn' | 'mint'
  | 'mocha' | 'latte' | 'frappe'
  | 'cyberpunk' | 'ocean-breeze' | 'northern-lights' | 'starry-night'
  | 'bold-tech' | 'sunset' | 'claude' | 'nature';

export interface ThemeSkin {
  id: SkinId;
  name: string;
  mode: 'dark' | 'light';
  preview: { bg: string; surface: string; accent: string };
}

export const THEME_SKINS: ThemeSkin[] = [
  // ── Dark ──
  { id: 'midnight',        name: 'Midnight',        mode: 'dark',  preview: { bg: '#111113', surface: '#18191b', accent: '#3e63dd' } },
  { id: 'crimson',         name: 'Crimson',         mode: 'dark',  preview: { bg: '#121113', surface: '#1a191b', accent: '#e93d82' } },
  { id: 'ember',           name: 'Ember',           mode: 'dark',  preview: { bg: '#111110', surface: '#191918', accent: '#f76b15' } },
  { id: 'forest',          name: 'Forest',          mode: 'dark',  preview: { bg: '#101211', surface: '#171918', accent: '#12a594' } },
  { id: 'navy',            name: 'Navy',            mode: 'dark',  preview: { bg: '#0f0f1a', surface: '#1a1a2e', accent: '#e94560' } },
  { id: 'mocha',           name: 'Mocha',           mode: 'dark',  preview: { bg: '#1e1e2e', surface: '#313244', accent: '#cba6f7' } },
  { id: 'frappe',          name: 'Frappé',          mode: 'dark',  preview: { bg: '#303446', surface: '#414559', accent: '#ef9f76' } },
  { id: 'cyberpunk',       name: 'Cyberpunk',       mode: 'dark',  preview: { bg: '#0c0c1d', surface: '#151530', accent: '#ff00c8' } },
  { id: 'ocean-breeze',    name: 'Ocean Breeze',    mode: 'dark',  preview: { bg: '#0f172a', surface: '#19212e', accent: '#34d399' } },
  { id: 'northern-lights', name: 'Northern Lights', mode: 'dark',  preview: { bg: '#1a1d23', surface: '#2f3436', accent: '#34a85a' } },
  { id: 'starry-night',    name: 'Starry Night',    mode: 'dark',  preview: { bg: '#181a24', surface: '#1d1e2f', accent: '#3a5ba0' } },
  { id: 'bold-tech',       name: 'Bold Tech',       mode: 'dark',  preview: { bg: '#0f172a', surface: '#171447', accent: '#8b5cf6' } },
  { id: 'sunset',          name: 'Sunset',          mode: 'dark',  preview: { bg: '#2a2024', surface: '#30272c', accent: '#ff7e5f' } },
  // ── Light ──
  { id: 'arctic',          name: 'Arctic',          mode: 'light', preview: { bg: '#fcfcfd', surface: '#f9f9fb', accent: '#3e63dd' } },
  { id: 'rose',            name: 'Rose',            mode: 'light', preview: { bg: '#fdfcfd', surface: '#faf9fb', accent: '#e93d82' } },
  { id: 'dawn',            name: 'Dawn',            mode: 'light', preview: { bg: '#fdfdfc', surface: '#f9f9f8', accent: '#f76b15' } },
  { id: 'mint',            name: 'Mint',            mode: 'light', preview: { bg: '#fbfdfc', surface: '#f7f9f8', accent: '#12a594' } },
  { id: 'latte',           name: 'Latte',           mode: 'light', preview: { bg: '#eff1f5', surface: '#e6e9ef', accent: '#8839ef' } },
  { id: 'claude',          name: 'Claude',          mode: 'light', preview: { bg: '#faf9f5', surface: '#f0ede4', accent: '#c96442' } },
  { id: 'nature',          name: 'Nature',          mode: 'light', preview: { bg: '#f8f5f0', surface: '#f0e9e0', accent: '#2e7d32' } },
];

export const DEFAULT_SKIN: SkinId = 'claude';

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
