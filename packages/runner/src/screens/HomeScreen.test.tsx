// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Tournament, Player, TournamentConfig } from '@padel/common';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../firebase', () => ({
  firebaseConfigured: false,
  db: null,
  auth: null,
  signIn: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  push: vi.fn(() => ({ key: 'fb1' })),
  set: vi.fn(),
}));

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'home.title') return 'Tournament Manager';
      if (key === 'home.subtitle') return 'Create or import a tournament';
      if (key === 'home.continue') return 'Continue';
      if (key === 'home.delete') return 'Delete';
      if (key === 'home.deleteConfirm') return 'Delete this tournament?';
      if (key === 'home.playersMeta') return `${params?.count} players · ${params?.phase}`;
      if (key === 'home.planShare') return 'Plan & Share';
      if (key === 'home.import') return 'Import';
      if (key === 'home.importFromClipboard') return 'From Clipboard';
      if (key === 'home.loadFile') return 'Load File';
      if (key === 'home.clipboardError') return 'Clipboard error';
      if (key === 'import.invalidJson') return 'Invalid JSON';
      return key;
    },
  }),
  useClickOutside: vi.fn(),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  FeedbackModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="feedback-modal" /> : null,
  AppFooter: ({ onFeedbackClick }: { onFeedbackClick: () => void }) => (
    <div data-testid="app-footer"><button onClick={onFeedbackClick}>Feedback</button></div>
  ),
  SkinPicker: () => <div data-testid="skin-picker" />,
}));

vi.mock('../utils/importExport', () => ({
  validateImport: vi.fn(),
}));

vi.mock('../state/ThemeContext', () => ({
  useRunnerTheme: () => ({ skin: 'default', setSkin: vi.fn() }),
}));

import { HomeScreen } from './HomeScreen';
import { TournamentContext } from '../state/tournamentContextDef';
import { validateImport } from '../utils/importExport';

// ── Helpers ────────────────────────────────────────────────────

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeConfig(): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 24,
    courts: [{ id: 'c1', name: 'Court 1' }],
    maxRounds: 3,
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't1',
    name: 'My Tournament',
    config: makeConfig(),
    phase: 'in-progress',
    players: makePlayers(8),
    rounds: [],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function renderHome(tournament: Tournament | null = null, dispatch = vi.fn()) {
  const result = render(
    <TournamentContext.Provider value={{ tournament, dispatch, saveError: false }}>
      <HomeScreen />
    </TournamentContext.Provider>,
  );
  return { ...result, dispatch };
}

// ── Tests ──────────────────────────────────────────────────────

describe('HomeScreen', () => {
  afterEach(cleanup);

  describe('no saved tournament', () => {
    it('renders title and subtitle', () => {
      renderHome(null);
      expect(screen.getByText('Tournament Manager')).toBeTruthy();
      expect(screen.getByText('Create or import a tournament')).toBeTruthy();
    });

    it('shows Plan & Share link', () => {
      renderHome(null);
      expect(screen.getByText('Plan & Share')).toBeTruthy();
    });

    it('shows Import button', () => {
      renderHome(null);
      expect(screen.getByText('Import')).toBeTruthy();
    });

    it('does not show resume card', () => {
      renderHome(null);
      expect(screen.queryByText('Continue')).toBeNull();
    });

    it('renders skin picker', () => {
      renderHome(null);
      expect(screen.getByTestId('skin-picker')).toBeTruthy();
    });

    it('renders footer', () => {
      renderHome(null);
      expect(screen.getByTestId('app-footer')).toBeTruthy();
    });
  });

  describe('saved tournament', () => {
    it('shows resume card with tournament name', () => {
      renderHome(makeTournament());
      expect(screen.getByText('My Tournament')).toBeTruthy();
    });

    it('shows player count and phase', () => {
      renderHome(makeTournament());
      expect(screen.getByText('8 players · in-progress')).toBeTruthy();
    });

    it('shows Continue and Delete buttons', () => {
      renderHome(makeTournament());
      expect(screen.getByText('Continue')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('dispatches RESET_TOURNAMENT on delete confirm', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { dispatch } = renderHome(makeTournament());
      fireEvent.click(screen.getByText('Delete'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_TOURNAMENT' });
      vi.restoreAllMocks();
    });

    it('does not dispatch on delete cancel', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { dispatch } = renderHome(makeTournament());
      fireEvent.click(screen.getByText('Delete'));
      expect(dispatch).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it('does not show Plan & Share or Import when tournament exists', () => {
      renderHome(makeTournament());
      expect(screen.queryByText('Plan & Share')).toBeNull();
      expect(screen.queryByText('Import')).toBeNull();
    });
  });

  describe('import', () => {
    it('opens import dropdown on click', () => {
      renderHome(null);
      fireEvent.click(screen.getByText('Import'));
      expect(screen.getByText('From Clipboard')).toBeTruthy();
      expect(screen.getByText('Load File')).toBeTruthy();
    });

    it('dispatches LOAD_TOURNAMENT on valid clipboard import', async () => {
      const imported = makeTournament({ name: 'Imported' });
      vi.mocked(validateImport).mockReturnValue({ tournament: imported });
      Object.assign(navigator, {
        clipboard: { readText: vi.fn().mockResolvedValue('{}') },
      });

      const { dispatch } = renderHome(null);
      fireEvent.click(screen.getByText('Import'));
      fireEvent.click(screen.getByText('From Clipboard'));

      await vi.waitFor(() => {
        expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_TOURNAMENT', payload: imported });
      });
    });

    it('shows error on invalid import', async () => {
      vi.mocked(validateImport).mockReturnValue({
        error: { key: 'import.invalidJson' },
        tournament: null,
      });
      Object.assign(navigator, {
        clipboard: { readText: vi.fn().mockResolvedValue('bad') },
      });

      renderHome(null);
      fireEvent.click(screen.getByText('Import'));
      fireEvent.click(screen.getByText('From Clipboard'));

      await vi.waitFor(() => {
        expect(screen.getByText('Invalid JSON')).toBeTruthy();
      });
    });
  });

  describe('feedback', () => {
    it('opens feedback modal from footer', () => {
      renderHome(null);
      expect(screen.queryByTestId('feedback-modal')).toBeNull();
      fireEvent.click(screen.getByText('Feedback'));
      expect(screen.getByTestId('feedback-modal')).toBeTruthy();
    });
  });
});
