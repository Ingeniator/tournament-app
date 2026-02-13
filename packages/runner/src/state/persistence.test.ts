import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveTournament, loadTournament, saveUIState, loadUIState } from './persistence';
import type { Tournament } from '@padel/common';

// Mock localStorage
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

function makeTournament(): Tournament {
  return {
    id: 't1',
    name: 'Test',
    config: {
      format: 'americano',
      pointsPerMatch: 24,
      courts: [{ id: 'c1', name: 'Court 1' }],
      maxRounds: 3,
    },
    phase: 'setup',
    players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
  };
}

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

describe('saveTournament', () => {
  it('saves tournament to localStorage', () => {
    const t = makeTournament();
    const result = saveTournament(t);
    expect(result).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'padel-tournament-v1',
      JSON.stringify(t),
    );
  });

  it('removes key when tournament is null', () => {
    const result = saveTournament(null);
    expect(result).toBe(true);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('padel-tournament-v1');
  });

  it('returns false when localStorage throws', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    const result = saveTournament(makeTournament());
    expect(result).toBe(false);
  });
});

describe('loadTournament', () => {
  it('loads tournament from localStorage', () => {
    const t = makeTournament();
    storage.set('padel-tournament-v1', JSON.stringify(t));
    const result = loadTournament();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('t1');
    expect(result!.name).toBe('Test');
  });

  it('returns null when no data', () => {
    const result = loadTournament();
    expect(result).toBeNull();
  });

  it('returns null when data is invalid JSON', () => {
    storage.set('padel-tournament-v1', '{invalid');
    const result = loadTournament();
    expect(result).toBeNull();
  });

  it('deduplicates player names on load', () => {
    const t = makeTournament();
    t.players = [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Alice' }];
    storage.set('padel-tournament-v1', JSON.stringify(t));
    const result = loadTournament();
    const names = result!.players.map(p => p.name);
    expect(new Set(names).size).toBe(2);
  });
});

describe('saveUIState', () => {
  it('saves UI state to localStorage', () => {
    saveUIState({ activeTab: 'log' });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'padel-ui-state-v1',
      JSON.stringify({ activeTab: 'log' }),
    );
  });

  it('does not throw when localStorage fails', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('fail'); });
    expect(() => saveUIState({ activeTab: 'log' })).not.toThrow();
  });
});

describe('loadUIState', () => {
  it('loads UI state from localStorage', () => {
    storage.set('padel-ui-state-v1', JSON.stringify({ activeTab: 'play' }));
    const result = loadUIState();
    expect(result).toEqual({ activeTab: 'play' });
  });

  it('returns null when no data', () => {
    const result = loadUIState();
    expect(result).toBeNull();
  });

  it('returns null when data is invalid JSON', () => {
    storage.set('padel-ui-state-v1', 'not-json');
    const result = loadUIState();
    expect(result).toBeNull();
  });
});
