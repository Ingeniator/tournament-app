// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Tournament, Round, Player, TournamentConfig } from '@padel/common';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../firebase', () => ({
  firebaseConfigured: false,
  db: null,
  auth: null,
  signIn: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  push: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'log.noRounds') return 'No rounds yet';
      if (key === 'log.addRound') return 'Add Round';
      if (key === 'log.finishTournament') return 'Finish Tournament';
      if (key === 'log.finishConfirm') return 'Finish tournament?';
      if (key === 'log.finishTrimConfirm') return `Trim ${params?.count} unscored rounds?`;
      if (key === 'log.statistics') return 'Statistics';
      if (key === 'log.statisticsTitle') return 'Statistics';
      if (key === 'log.exportPlan') return 'Export Plan';
      if (key === 'log.planCopied') return 'Plan copied';
      if (key === 'log.updateScoreConfirm') return 'Update score?';
      if (key === 'log.clearScoreConfirm') return 'Clear score?';
      if (key === 'play.maldicionesInfo') return 'Maldiciones Info';
      return key;
    },
  }),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Modal: ({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) =>
    open ? <div data-testid="modal" data-title={title}><button onClick={onClose}>close-modal</button>{children}</div> : null,
}));

vi.mock('../components/rounds/RoundCard', () => ({
  RoundCard: ({ round }: { round: Round }) => (
    <div data-testid={`round-card-${round.roundNumber}`}>RoundCard R{round.roundNumber}</div>
  ),
}));

vi.mock('../components/stats/PlayerStats', () => ({
  PlayerStats: () => <div data-testid="player-stats" />,
}));

vi.mock('../components/stats/DistributionStats', () => ({
  DistributionStats: ({ onReshuffle, onOptimize }: { onReshuffle?: () => void; onOptimize?: () => void }) => (
    <div data-testid="distribution-stats">
      {onReshuffle && <button onClick={onReshuffle}>reshuffle</button>}
      {onOptimize && <button onClick={onOptimize}>optimize</button>}
    </div>
  ),
}));

vi.mock('../components/maldiciones/MaldicionesRulesModal', () => ({
  MaldicionesRulesModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="maldiciones-rules-modal" /> : null,
}));

vi.mock('../hooks/usePlayerStats', () => ({
  usePlayerStats: () => [],
}));

vi.mock('../hooks/useDistributionStats', () => ({
  useDistributionStats: () => ({ partnerMatrix: [], opponentMatrix: [] }),
}));

vi.mock('../strategies', () => ({
  getStrategy: () => ({
    isDynamic: false,
    generateAdditionalRounds: vi.fn(() => ({ rounds: [], warnings: [] })),
  }),
  scoreSchedule: () => [0, 0, 0, 0],
}));

import { LogScreen } from './LogScreen';
import { TournamentContext } from '../state/tournamentContextDef';

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

function makeRound(num: number, scored: boolean): Round {
  return {
    id: `r${num}`,
    roundNumber: num,
    matches: [
      { id: `m${num}-1`, courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: scored ? { team1Points: 15, team2Points: 9 } : null },
      { id: `m${num}-2`, courtId: 'c2', team1: ['p5', 'p6'], team2: ['p7', 'p8'], score: scored ? { team1Points: 12, team2Points: 12 } : null },
    ],
    sitOuts: [],
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

function renderLog(tournament: Tournament | null = makeTournament(), dispatch = vi.fn(), onNavigate = vi.fn()) {
  const result = render(
    <TournamentContext.Provider value={{ tournament, dispatch, saveError: false }}>
      <LogScreen onNavigate={onNavigate} />
    </TournamentContext.Provider>,
  );
  return { ...result, dispatch, onNavigate };
}

// ── Tests ──────────────────────────────────────────────────────

describe('LogScreen', () => {
  afterEach(cleanup);

  describe('null tournament', () => {
    it('renders nothing when tournament is null', () => {
      const { container } = renderLog(null);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('round rendering', () => {
    it('renders a round card for each round', () => {
      renderLog();
      expect(screen.getByTestId('round-card-1')).toBeTruthy();
      expect(screen.getByTestId('round-card-2')).toBeTruthy();
      expect(screen.getByTestId('round-card-3')).toBeTruthy();
    });

    it('shows empty message when no rounds', () => {
      renderLog(makeTournament({ rounds: [] }));
      expect(screen.getByText('No rounds yet')).toBeTruthy();
    });
  });

  describe('footer actions', () => {
    it('shows Add Round button for in-progress tournament', () => {
      renderLog();
      expect(screen.getByText('Add Round')).toBeTruthy();
    });

    it('dispatches ADD_ROUNDS on Add Round click', () => {
      const { dispatch } = renderLog();
      fireEvent.click(screen.getByText('Add Round'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_ROUNDS', payload: { count: 1 } });
    });

    it('shows Finish Tournament button for in-progress', () => {
      renderLog();
      expect(screen.getByText('Finish Tournament')).toBeTruthy();
    });

    it('dispatches COMPLETE_TOURNAMENT and navigates on confirm', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { dispatch, onNavigate } = renderLog();
      fireEvent.click(screen.getByText('Finish Tournament'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'COMPLETE_TOURNAMENT' });
      expect(onNavigate).toHaveBeenCalledWith('play');
      vi.restoreAllMocks();
    });

    it('does not dispatch when confirm is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { dispatch } = renderLog();
      fireEvent.click(screen.getByText('Finish Tournament'));
      expect(dispatch).not.toHaveBeenCalledWith({ type: 'COMPLETE_TOURNAMENT' });
      vi.restoreAllMocks();
    });

    it('does not show Finish Tournament for completed tournament', () => {
      renderLog(makeTournament({ phase: 'completed' }));
      expect(screen.queryByText('Finish Tournament')).toBeNull();
    });
  });

  describe('statistics modal', () => {
    it('shows Statistics button', () => {
      renderLog();
      expect(screen.getByText('Statistics')).toBeTruthy();
    });

    it('opens statistics modal on click', () => {
      renderLog();
      expect(screen.queryByTestId('modal')).toBeNull();
      fireEvent.click(screen.getByText('Statistics'));
      expect(screen.getByTestId('modal')).toBeTruthy();
      expect(screen.getByTestId('player-stats')).toBeTruthy();
      expect(screen.getByTestId('distribution-stats')).toBeTruthy();
    });

    it('closes statistics modal', () => {
      renderLog();
      fireEvent.click(screen.getByText('Statistics'));
      expect(screen.getByTestId('modal')).toBeTruthy();
      fireEvent.click(screen.getByText('close-modal'));
      expect(screen.queryByTestId('modal')).toBeNull();
    });

    it('shows Export Plan button in modal', () => {
      renderLog();
      fireEvent.click(screen.getByText('Statistics'));
      expect(screen.getByText('Export Plan')).toBeTruthy();
    });
  });

  describe('maldiciones', () => {
    it('shows maldiciones info button when enabled', () => {
      renderLog(makeTournament({
        config: { ...makeConfig(), maldiciones: { enabled: true, chaosLevel: 'medium' } },
      }));
      expect(screen.getByText('Maldiciones Info')).toBeTruthy();
    });

    it('does not show maldiciones button when not enabled', () => {
      renderLog();
      expect(screen.queryByText('Maldiciones Info')).toBeNull();
    });

    it('opens maldiciones rules modal on click', () => {
      renderLog(makeTournament({
        config: { ...makeConfig(), maldiciones: { enabled: true, chaosLevel: 'medium' } },
      }));
      expect(screen.queryByTestId('maldiciones-rules-modal')).toBeNull();
      fireEvent.click(screen.getByText('Maldiciones Info'));
      expect(screen.getByTestId('maldiciones-rules-modal')).toBeTruthy();
    });
  });

  describe('completed tournament', () => {
    it('shows Add Round for completed tournament', () => {
      renderLog(makeTournament({ phase: 'completed' }));
      expect(screen.getByText('Add Round')).toBeTruthy();
    });
  });
});
