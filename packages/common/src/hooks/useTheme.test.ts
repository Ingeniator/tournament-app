import { describe, it, expect, beforeEach } from 'vitest';
import { isValidSkin, getSkin, THEME_SKINS, DEFAULT_SKIN } from './useTheme';

describe('isValidSkin', () => {
  it('returns true for all defined skin IDs', () => {
    for (const skin of THEME_SKINS) {
      expect(isValidSkin(skin.id)).toBe(true);
    }
  });

  it('returns false for unknown IDs', () => {
    expect(isValidSkin('nonexistent')).toBe(false);
    expect(isValidSkin('')).toBe(false);
  });
});

describe('getSkin', () => {
  it('returns the matching skin', () => {
    const skin = getSkin('midnight');
    expect(skin.id).toBe('midnight');
    expect(skin.name).toBe('Midnight');
    expect(skin.mode).toBe('dark');
  });

  it('returns the default skin for DEFAULT_SKIN', () => {
    const skin = getSkin(DEFAULT_SKIN);
    expect(skin.id).toBe('claude');
  });
});

describe('THEME_SKINS', () => {
  it('has unique IDs', () => {
    const ids = THEME_SKINS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes both dark and light skins', () => {
    const modes = new Set(THEME_SKINS.map(s => s.mode));
    expect(modes).toContain('dark');
    expect(modes).toContain('light');
  });

  it('every skin has required preview colors', () => {
    for (const skin of THEME_SKINS) {
      expect(skin.preview.bg).toBeTruthy();
      expect(skin.preview.surface).toBeTruthy();
      expect(skin.preview.accent).toBeTruthy();
    }
  });
});
