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

const mockShowToast = vi.fn();

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'settings.tournament') return 'Tournament';
      if (key === 'settings.name') return 'Name';
      if (key === 'settings.pointsPerMatch') return 'Points per Match';
      if (key === 'settings.setsPerMatch') return 'Sets per Match';
      if (key === 'settings.minutesPerRound') return 'Minutes per Round';
      if (key === 'settings.rounds') return 'Rounds';
      if (key === 'settings.roundsHint') return `Min: ${params?.min}`;
      if (key === 'settings.courtCount') return `${params?.count} courts`;
      if (key === 'settings.roundCount') return `${params?.count} rounds`;
      if (key === 'settings.pts') return `${params?.count} pts`;
      if (key === 'settings.exportImport') return 'Export / Import';
      if (key === 'settings.export') return 'Export';
      if (key === 'settings.import') return 'Import';
      if (key === 'settings.copyData') return 'Copy Data';
      if (key === 'settings.exportFile') return 'Export File';
      if (key === 'settings.importFromClipboard') return 'From Clipboard';
      if (key === 'settings.loadFile') return 'Load File';
      if (key === 'settings.dangerZone') return 'Danger Zone';
      if (key === 'settings.deleteTournament') return 'Delete Tournament';
      if (key === 'settings.deleteConfirm') return 'Delete this tournament?';
      if (key === 'settings.tournamentCopied') return 'Copied!';
      if (key === 'settings.failedCopy') return 'Copy failed';
      if (key === 'settings.replaceImportConfirm') return 'Replace current tournament?';
      if (key === 'settings.tournamentImported') return 'Tournament imported!';
      if (key === 'settings.clipboardError') return 'Clipboard error';
      if (key === 'import.invalidJson') return 'Invalid JSON';
      return key;
    },
  }),
  useClickOutside: vi.fn(),
  computeSitOutInfo: () => ({ isEqual: true, sitOutsPerRound: 0, nearestFairBelow: null, nearestFairAbove: null }),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  FeedbackModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="feedback-modal" /> : null,
  AppFooter: ({ onFeedbackClick }: { onFeedbackClick: () => void }) => (
    <div data-testid="app-footer"><button onClick={onFeedbackClick}>Feedback</button></div>
  ),
  Toast: ({ message }: { message: string | null }) =>
    message ? <div data-testid="toast">{message}</div> : null,
  useToast: () => ({ toastMessage: null, showToast: mockShowToast }),
}));

vi.mock('../components/settings/EditableField', () => ({
  EditableField: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`field-${label}`}>{label}: {value}</div>
  ),
}));

vi.mock('../components/settings/CourtList', () => ({
  CourtList: () => <div data-testid="court-list" />,
}));

vi.mock('../components/settings/PlayerList', () => ({
  PlayerList: () => <div data-testid="player-list" />,
}));

vi.mock('../utils/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock('../utils/importExport', () => ({
  exportTournament: vi.fn(() => '{"exported":true}'),
  exportTournamentToFile: vi.fn(),
  validateImport: vi.fn(),
}));

import { SettingsScreen } from './SettingsScreen';
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
    courts: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
    maxRounds: 3,
  };
}

function makeRound(num: number, scored: boolean) {
  return {
    id: `r${num}`,
    roundNumber: num,
    matches: [
      { id: `m${num}-1`, courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: scored ? { team1Points: 15, team2Points: 9 } : null },
    ],
    sitOuts: [] as string[],
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't1',
    name: 'Test Tournament',
    config: makeConfig(),
    phase: 'in-progress',
    players: makePlayers(8),
    rounds: [makeRound(1, false), makeRound(2, false), makeRound(3, false)],
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function renderSettings(tournament: Tournament | null = makeTournament(), dispatch = vi.fn()) {
  const result = render(
    <TournamentContext.Provider value={{ tournament, dispatch, saveError: false }}>
      <SettingsScreen />
    </TournamentContext.Provider>,
  );
  return { ...result, dispatch };
}

// ── Tests ──────────────────────────────────────────────────────

describe('SettingsScreen', () => {
  afterEach(cleanup);

  describe('null tournament', () => {
    it('renders nothing when tournament is null', () => {
      const { container } = renderSettings(null);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('tournament info', () => {
    it('renders tournament name field', () => {
      renderSettings();
      expect(screen.getByTestId('field-Name')).toBeTruthy();
      expect(screen.getByText(/Name: Test Tournament/)).toBeTruthy();
    });

    it('renders format chip', () => {
      renderSettings();
      expect(screen.getByText('americano')).toBeTruthy();
    });

    it('renders court count chip', () => {
      renderSettings();
      expect(screen.getByText('2 courts')).toBeTruthy();
    });

    it('renders points field for in-progress tournament', () => {
      renderSettings();
      expect(screen.getByTestId('field-Points per Match')).toBeTruthy();
    });

    it('renders rounds field for in-progress tournament', () => {
      renderSettings();
      expect(screen.getByTestId('field-Rounds')).toBeTruthy();
    });

    it('shows points chip instead of editable field for completed tournament', () => {
      renderSettings(makeTournament({ phase: 'completed' }));
      expect(screen.getByText('24 pts')).toBeTruthy();
      expect(screen.queryByTestId('field-Points per Match')).toBeNull();
    });

    it('shows round count chip for completed tournament', () => {
      renderSettings(makeTournament({ phase: 'completed' }));
      expect(screen.getByText('3 rounds')).toBeTruthy();
    });
  });

  describe('court and player lists', () => {
    it('renders court list', () => {
      renderSettings();
      expect(screen.getByTestId('court-list')).toBeTruthy();
    });

    it('renders player list', () => {
      renderSettings();
      expect(screen.getByTestId('player-list')).toBeTruthy();
    });
  });

  describe('export / import', () => {
    it('renders export/import section', () => {
      renderSettings();
      expect(screen.getByText('Export / Import')).toBeTruthy();
    });

    it('shows export dropdown on click', () => {
      renderSettings();
      fireEvent.click(screen.getByText('Export'));
      expect(screen.getByText('Copy Data')).toBeTruthy();
      expect(screen.getByText('Export File')).toBeTruthy();
    });

    it('shows import dropdown on click', () => {
      renderSettings();
      fireEvent.click(screen.getByText('Import'));
      expect(screen.getByText('From Clipboard')).toBeTruthy();
      expect(screen.getByText('Load File')).toBeTruthy();
    });

    it('dispatches LOAD_TOURNAMENT on valid clipboard import', async () => {
      const imported = makeTournament({ name: 'Imported' });
      vi.mocked(validateImport).mockReturnValue({ tournament: imported });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      Object.assign(navigator, {
        clipboard: { readText: vi.fn().mockResolvedValue('{}') },
      });

      const { dispatch } = renderSettings();
      fireEvent.click(screen.getByText('Import'));
      fireEvent.click(screen.getByText('From Clipboard'));

      await vi.waitFor(() => {
        expect(dispatch).toHaveBeenCalledWith({ type: 'LOAD_TOURNAMENT', payload: imported });
      });
      vi.restoreAllMocks();
    });

    it('shows error on invalid import', async () => {
      vi.mocked(validateImport).mockReturnValue({
        error: { key: 'import.invalidJson' },
        tournament: null,
      });
      Object.assign(navigator, {
        clipboard: { readText: vi.fn().mockResolvedValue('bad') },
      });

      renderSettings();
      fireEvent.click(screen.getByText('Import'));
      fireEvent.click(screen.getByText('From Clipboard'));

      await vi.waitFor(() => {
        expect(screen.getByText('Invalid JSON')).toBeTruthy();
      });
    });
  });

  describe('danger zone', () => {
    it('renders Delete Tournament button', () => {
      renderSettings();
      expect(screen.getByText('Delete Tournament')).toBeTruthy();
    });

    it('dispatches RESET_TOURNAMENT on delete confirm', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { dispatch } = renderSettings();
      fireEvent.click(screen.getByText('Delete Tournament'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_TOURNAMENT' });
      vi.restoreAllMocks();
    });

    it('does not dispatch on delete cancel', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { dispatch } = renderSettings();
      fireEvent.click(screen.getByText('Delete Tournament'));
      expect(dispatch).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe('footer and feedback', () => {
    it('renders footer', () => {
      renderSettings();
      expect(screen.getByTestId('app-footer')).toBeTruthy();
    });

    it('opens feedback modal from footer', () => {
      renderSettings();
      expect(screen.queryByTestId('feedback-modal')).toBeNull();
      fireEvent.click(screen.getByText('Feedback'));
      expect(screen.getByTestId('feedback-modal')).toBeTruthy();
    });
  });
});
