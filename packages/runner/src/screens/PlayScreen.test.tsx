// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Tournament, Round, Player, TournamentConfig, StandingsEntry, Nomination } from '@padel/common';

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
      if (key === 'play.progress') return `Round ${params?.current}/${params?.total} · ${params?.scored}/${params?.totalMatches} scored`;
      if (key === 'play.standings') return 'Standings';
      if (key === 'play.standingsTitle') return 'Standings';
      if (key === 'play.allScored') return 'All matches scored';
      if (key === 'play.addRound') return 'Add Round';
      if (key === 'play.finishTournament') return 'Finish Tournament';
      if (key === 'play.completeConfirm') return 'Complete tournament?';
      if (key === 'play.continue') return 'Continue';
      if (key === 'play.upNextRound' && params?.num) return `Up Next: Round ${params.num}`;
      if (key === 'play.previousRound' && params?.num) return `Previous Round ${params.num}`;
      if (key === 'play.roundNum' && params?.num) return `Round ${params.num}`;
      if (key === 'play.roundComplete' && params?.num) return `Round ${params.num} Complete!`;
      if (key === 'play.getReady') return 'Get ready for the next round';
      if (key === 'play.vs') return 'vs';
      if (key === 'play.sit' && params?.names) return `Sitting out: ${params.names}`;
      if (key === 'play.satOut' && params?.names) return `Sat out: ${params.names}`;
      if (key === 'play.shareImage') return 'Share Image';
      if (key === 'play.shareText') return 'Share Text';
      if (key === 'play.roundResults') return 'Round Results';
      if (key === 'play.copied') return 'Copied!';
      if (key === 'play.supportCta') return 'Support us';
      if (key === 'play.madeWithCare') return 'Made with care';
      if (key === 'play.sendFeedback') return 'Send Feedback';
      return key;
    },
  }),
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void; variant?: string; fullWidth?: boolean }) => (
    <button onClick={onClick} data-variant={rest.variant}>{children}</button>
  ),
  Modal: ({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) =>
    open ? <div data-testid="modal" data-title={title}><button onClick={onClose}>close-modal</button>{children}</div> : null,
  FeedbackModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="feedback-modal" /> : null,
  SupportOverlay: ({ open }: { open: boolean }) =>
    open ? <div data-testid="support-overlay" /> : null,
  Toast: ({ message }: { message: string | null }) =>
    message ? <div data-testid="toast">{message}</div> : null,
  useToast: () => ({ toastMessage: null, showToast: vi.fn() }),
  formatHasGroups: (format: string) => format === 'mixicano' || format === 'mixed-americano',
}));

vi.mock('../components/rounds/RoundCard', () => ({
  RoundCard: ({ round, onScore, onClear }: { round: Round; onScore: (matchId: string, score: { team1Points: number; team2Points: number }) => void; onClear: (matchId: string) => void }) => (
    <div data-testid={`round-card-${round.roundNumber}`}>
      RoundCard R{round.roundNumber}
      <button onClick={() => onScore(round.matches[0].id, { team1Points: 15, team2Points: 9 })}>score-match</button>
      <button onClick={() => onClear(round.matches[0].id)}>clear-match</button>
    </div>
  ),
}));

vi.mock('../components/standings/StandingsTable', () => ({
  StandingsTable: ({ standings }: { standings: StandingsEntry[] }) => (
    <div data-testid="standings-table">Standings ({standings.length})</div>
  ),
}));

vi.mock('../components/nominations/NominationCard', () => ({
  NominationCard: ({ nomination }: { nomination: Nomination }) => (
    <div data-testid={`nomination-${nomination.id}`}>{nomination.title}</div>
  ),
}));

vi.mock('../components/carousel/Carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel">{children}</div>
  ),
}));

vi.mock('../components/ceremony/CeremonyScreen', () => ({
  CeremonyScreen: ({ onComplete }: { onComplete: (noms: Nomination[]) => void }) => (
    <div data-testid="ceremony-screen">
      <button onClick={() => onComplete([])}>finish-ceremony</button>
    </div>
  ),
}));

vi.mock('../utils/clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock('../utils/standingsImage', () => ({
  shareStandingsImage: vi.fn().mockResolvedValue({ status: 'shared' }),
}));

import { PlayScreen } from './PlayScreen';
import { TournamentContext } from '../state/tournamentContextDef';

// ── Helpers ────────────────────────────────────────────────────

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeConfig(numCourts = 2): TournamentConfig {
  return {
    format: 'americano',
    pointsPerMatch: 24,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds: 3,
  };
}

function makeRound(num: number, scored: boolean, sitOuts: string[] = []): Round {
  return {
    id: `r${num}`,
    roundNumber: num,
    matches: [
      {
        id: `m${num}-1`,
        courtId: 'c1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
        score: scored ? { team1Points: 15, team2Points: 9 } : null,
      },
      {
        id: `m${num}-2`,
        courtId: 'c2',
        team1: ['p5', 'p6'],
        team2: ['p7', 'p8'],
        score: scored ? { team1Points: 12, team2Points: 12 } : null,
      },
    ],
    sitOuts,
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

function renderWithTournament(tournament: Tournament | null, dispatch = vi.fn()) {
  const result = render(
    <TournamentContext.Provider value={{ tournament, dispatch, saveError: false }}>
      <PlayScreen />
    </TournamentContext.Provider>,
  );
  return { ...result, dispatch };
}

// ── Tests ──────────────────────────────────────────────────────

describe('PlayScreen', () => {
  afterEach(cleanup);

  describe('null tournament', () => {
    it('renders nothing when tournament is null', () => {
      const { container } = renderWithTournament(null);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('in-progress state', () => {
    it('renders progress text', () => {
      renderWithTournament(makeTournament());
      expect(screen.getByText(/Round 1\/3/)).toBeTruthy();
      expect(screen.getByText(/0\/6 scored/)).toBeTruthy();
    });

    it('renders active round card for first unscored round', () => {
      renderWithTournament(makeTournament());
      expect(screen.getByTestId('round-card-1')).toBeTruthy();
    });

    it('shows second round as active when first is scored', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, false), makeRound(3, false)],
      });
      renderWithTournament(tournament);
      expect(screen.getByTestId('round-card-2')).toBeTruthy();
      expect(screen.queryByTestId('round-card-1')).toBeNull();
    });

    it('renders standings button', () => {
      renderWithTournament(makeTournament());
      expect(screen.getByText('Standings')).toBeTruthy();
    });

    it('opens standings modal on button click', () => {
      renderWithTournament(makeTournament());
      expect(screen.queryByTestId('modal')).toBeNull();
      fireEvent.click(screen.getByText('Standings'));
      expect(screen.getByTestId('modal')).toBeTruthy();
      expect(screen.getByTestId('standings-table')).toBeTruthy();
    });

    it('closes standings modal', () => {
      renderWithTournament(makeTournament());
      fireEvent.click(screen.getByText('Standings'));
      expect(screen.getByTestId('modal')).toBeTruthy();
      fireEvent.click(screen.getByText('close-modal'));
      expect(screen.queryByTestId('modal')).toBeNull();
    });

    it('dispatches SET_MATCH_SCORE when scoring a match', () => {
      const dispatch = vi.fn();
      renderWithTournament(makeTournament(), dispatch);
      fireEvent.click(screen.getByText('score-match'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_MATCH_SCORE',
        payload: { roundId: 'r1', matchId: 'm1-1', score: { team1Points: 15, team2Points: 9 } },
      });
    });

    it('dispatches CLEAR_MATCH_SCORE when clearing a match', () => {
      const dispatch = vi.fn();
      renderWithTournament(makeTournament(), dispatch);
      fireEvent.click(screen.getByText('clear-match'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'CLEAR_MATCH_SCORE',
        payload: { roundId: 'r1', matchId: 'm1-1' },
      });
    });

    it('shows correct scored count in progress', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, false), makeRound(3, false)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText(/2\/6 scored/)).toBeTruthy();
    });
  });

  describe('next / previous round previews', () => {
    it('shows next round preview when active round has a following round', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, false), makeRound(2, false)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText('Up Next: Round 2')).toBeTruthy();
    });

    it('shows previous round when active round is not the first', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, false), makeRound(3, false)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText('Previous Round 1')).toBeTruthy();
    });

    it('renders player names in preview', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, false), makeRound(2, false)],
      });
      renderWithTournament(tournament);
      // Player 1 is in the next round's matches
      expect(screen.getAllByText('Player 1').length).toBeGreaterThan(0);
    });

    it('shows sit-out names in round preview', () => {
      const tournament = makeTournament({
        players: makePlayers(10),
        rounds: [
          makeRound(1, false),
          { ...makeRound(2, false), sitOuts: ['p9', 'p10'] },
        ],
      });
      renderWithTournament(tournament);
      expect(screen.getByText(/Sitting out: Player 9, Player 10/)).toBeTruthy();
    });

    it('shows previous round score in preview', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, false)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText('15:9')).toBeTruthy();
    });
  });

  describe('all scored state (no active round)', () => {
    it('shows "all scored" message when every match is scored', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, true), makeRound(3, true)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText('All matches scored')).toBeTruthy();
    });

    it('renders Add Round button', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText('Add Round')).toBeTruthy();
    });

    it('dispatches ADD_ROUNDS when clicking Add Round', () => {
      const dispatch = vi.fn();
      const tournament = makeTournament({
        rounds: [makeRound(1, true)],
      });
      renderWithTournament(tournament, dispatch);
      fireEvent.click(screen.getByText('Add Round'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_ROUNDS', payload: { count: 1 } });
    });

    it('renders Finish Tournament button', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText('Finish Tournament')).toBeTruthy();
    });

    it('dispatches COMPLETE_TOURNAMENT on confirm', () => {
      const dispatch = vi.fn();
      const tournament = makeTournament({
        rounds: [makeRound(1, true)],
      });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithTournament(tournament, dispatch);
      fireEvent.click(screen.getByText('Finish Tournament'));
      expect(window.confirm).toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith({ type: 'COMPLETE_TOURNAMENT' });
      vi.restoreAllMocks();
    });

    it('does not dispatch COMPLETE_TOURNAMENT when confirm is cancelled', () => {
      const dispatch = vi.fn();
      const tournament = makeTournament({
        rounds: [makeRound(1, true)],
      });
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithTournament(tournament, dispatch);
      fireEvent.click(screen.getByText('Finish Tournament'));
      expect(dispatch).not.toHaveBeenCalledWith({ type: 'COMPLETE_TOURNAMENT' });
      vi.restoreAllMocks();
    });

    it('does not show active round card', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, true)],
      });
      renderWithTournament(tournament);
      expect(screen.queryByTestId('round-card-1')).toBeNull();
    });
  });

  describe('completed state', () => {
    function makeCompletedTournament(overrides: Partial<Tournament> = {}): Tournament {
      return makeTournament({
        phase: 'completed',
        rounds: [makeRound(1, true), makeRound(2, true)],
        ceremonyCompleted: true,
        nominations: [],
        ...overrides,
      });
    }

    it('renders ceremony screen when not yet completed and has nominations', () => {
      const tournament = makeCompletedTournament({ ceremonyCompleted: false });
      renderWithTournament(tournament);
      // useNominations generates real nominations from scored data, so ceremony screen shows
      expect(screen.getByTestId('ceremony-screen')).toBeTruthy();
    });

    it('dispatches COMPLETE_CEREMONY when ceremony finishes', () => {
      const dispatch = vi.fn();
      const tournament = makeCompletedTournament({ ceremonyCompleted: false });
      renderWithTournament(tournament, dispatch);
      fireEvent.click(screen.getByText('finish-ceremony'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'COMPLETE_CEREMONY',
        payload: { nominations: [] },
      });
    });

    it('renders tournament name in completed header', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getByText('Test Tournament')).toBeTruthy();
    });

    it('renders standings table in carousel', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getByTestId('carousel')).toBeTruthy();
      expect(screen.getByTestId('standings-table')).toBeTruthy();
    });

    it('renders Share Image button', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getByText('Share Image')).toBeTruthy();
    });

    it('renders Share Text button', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getByText('Share Text')).toBeTruthy();
    });

    it('renders round results expandable section', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getByText('Round Results')).toBeTruthy();
    });

    it('renders scored match results inside round details', () => {
      const tournament = makeCompletedTournament();
      renderWithTournament(tournament);
      // Click the summary to open the details element
      fireEvent.click(screen.getByText('Round Results'));
      expect(screen.getByText('Round 1')).toBeTruthy();
      expect(screen.getByText('Round 2')).toBeTruthy();
    });

    it('renders player names and scores in round results', () => {
      renderWithTournament(makeCompletedTournament());
      // Scores from makeRound(1, true): 15:9 and 12:12
      expect(screen.getAllByText(/15/).length).toBeGreaterThan(0);
    });

    it('shows sat-out players in completed round results', () => {
      const tournament = makeCompletedTournament({
        players: makePlayers(10),
        rounds: [
          { ...makeRound(1, true), sitOuts: ['p9', 'p10'] },
        ],
      });
      renderWithTournament(tournament);
      expect(screen.getByText('Sat out: Player 9, Player 10')).toBeTruthy();
    });

    it('renders support CTA', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getByText('Support us')).toBeTruthy();
    });

    it('opens support overlay on CTA click', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.queryByTestId('support-overlay')).toBeNull();
      fireEvent.click(screen.getByText('Support us'));
      expect(screen.getByTestId('support-overlay')).toBeTruthy();
    });

    it('renders made-with-care attribution', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getByText(/Made with care/)).toBeTruthy();
    });

    it('does not show round results section when no scored matches', () => {
      const tournament = makeCompletedTournament({
        rounds: [makeRound(1, false)],
      });
      renderWithTournament(tournament);
      expect(screen.queryByText('Round Results')).toBeNull();
    });

    it('renders court labels from config', () => {
      renderWithTournament(makeCompletedTournament());
      expect(screen.getAllByText('Court 1').length).toBeGreaterThan(0);
    });
  });

  describe('round complete interstitial', () => {
    it('shows interstitial when active round advances', () => {
      const tournament1 = makeTournament({
        rounds: [makeRound(1, false), makeRound(2, false)],
      });
      const dispatch = vi.fn();
      const { rerender } = render(
        <TournamentContext.Provider value={{ tournament: tournament1, dispatch, saveError: false }}>
          <PlayScreen />
        </TournamentContext.Provider>,
      );

      // Active round is R1. Now score R1 and rerender
      const tournament2 = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, false)],
      });
      rerender(
        <TournamentContext.Provider value={{ tournament: tournament2, dispatch, saveError: false }}>
          <PlayScreen />
        </TournamentContext.Provider>,
      );

      expect(screen.getByText('Round 1 Complete!')).toBeTruthy();
      expect(screen.getByText('Get ready for the next round')).toBeTruthy();
    });

    it('dismisses interstitial on Continue click', () => {
      const tournament1 = makeTournament({
        rounds: [makeRound(1, false), makeRound(2, false)],
      });
      const dispatch = vi.fn();
      const { rerender } = render(
        <TournamentContext.Provider value={{ tournament: tournament1, dispatch, saveError: false }}>
          <PlayScreen />
        </TournamentContext.Provider>,
      );

      const tournament2 = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, false)],
      });
      rerender(
        <TournamentContext.Provider value={{ tournament: tournament2, dispatch, saveError: false }}>
          <PlayScreen />
        </TournamentContext.Provider>,
      );

      expect(screen.getByText('Round 1 Complete!')).toBeTruthy();
      fireEvent.click(screen.getByText('Continue'));
      expect(screen.queryByText('Round 1 Complete!')).toBeNull();
    });

    it('dismisses interstitial on overlay click', () => {
      const tournament1 = makeTournament({
        rounds: [makeRound(1, false), makeRound(2, false)],
      });
      const dispatch = vi.fn();
      const { rerender } = render(
        <TournamentContext.Provider value={{ tournament: tournament1, dispatch, saveError: false }}>
          <PlayScreen />
        </TournamentContext.Provider>,
      );

      const tournament2 = makeTournament({
        rounds: [makeRound(1, true), makeRound(2, false)],
      });
      rerender(
        <TournamentContext.Provider value={{ tournament: tournament2, dispatch, saveError: false }}>
          <PlayScreen />
        </TournamentContext.Provider>,
      );

      // The overlay is the outermost div with the click handler.
      // Structure: interstitialOverlay > interstitial (stopPropagation) > content > title
      // Walk up from title: title → content → interstitial → overlay
      const title = screen.getByText('Round 1 Complete!');
      const overlay = title.parentElement!.parentElement!.parentElement!;
      fireEvent.click(overlay);
      expect(screen.queryByText('Round 1 Complete!')).toBeNull();
    });
  });

  describe('dynamic format (isDynamic)', () => {
    it('uses maxRounds for planned rounds in dynamic format', () => {
      const tournament = makeTournament({
        config: { ...makeConfig(), format: 'mexicano', maxRounds: 5 },
        rounds: [makeRound(1, false)],
      });
      renderWithTournament(tournament);
      expect(screen.getByText(/Round 1\/5/)).toBeTruthy();
    });

    it('falls back to players.length - 1 when maxRounds is null for dynamic', () => {
      const tournament = makeTournament({
        config: { ...makeConfig(), format: 'mexicano', maxRounds: null },
        rounds: [makeRound(1, false)],
        players: makePlayers(8),
      });
      renderWithTournament(tournament);
      // 8 players - 1 = 7
      expect(screen.getByText(/Round 1\/7/)).toBeTruthy();
    });
  });

  describe('planned games computation', () => {
    it('passes planned games to standings table in modal', () => {
      // Verify standings modal renders (planned games is an internal detail passed to StandingsTable)
      renderWithTournament(makeTournament());
      fireEvent.click(screen.getByText('Standings'));
      expect(screen.getByTestId('standings-table')).toBeTruthy();
    });
  });

  describe('mixicano group info', () => {
    it('passes group info for mixicano format', () => {
      const players = makePlayers(8).map((p, i) => ({ ...p, group: (i < 4 ? 'A' : 'B') as 'A' | 'B' }));
      const tournament = makeTournament({
        config: { ...makeConfig(), format: 'mixicano', groupLabels: ['Men', 'Women'] },
        players,
      });
      // Just ensure it renders without error — group info is passed internally
      renderWithTournament(tournament);
      expect(screen.getByText(/Round 1/)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders with single round', () => {
      const tournament = makeTournament({
        rounds: [makeRound(1, false)],
      });
      renderWithTournament(tournament);
      expect(screen.getByTestId('round-card-1')).toBeTruthy();
      // No previous or next round
      expect(screen.queryByText(/Up Next/)).toBeNull();
      expect(screen.queryByText(/Previous Round/)).toBeNull();
    });

    it('handles player name lookup for unknown player id gracefully', () => {
      const tournament = makeTournament({
        players: makePlayers(4), // only 4 players but matches reference p5-p8
        rounds: [makeRound(1, true), makeRound(2, false)],
      });
      // Should render without crashing, using "?" for unknown players
      renderWithTournament(tournament);
      expect(screen.getAllByText('?').length).toBeGreaterThan(0);
    });

    it('handles empty rounds array', () => {
      const tournament = makeTournament({ rounds: [] });
      // No active round → shows all-scored state
      renderWithTournament(tournament);
      expect(screen.getByText('All matches scored')).toBeTruthy();
    });
  });
});
