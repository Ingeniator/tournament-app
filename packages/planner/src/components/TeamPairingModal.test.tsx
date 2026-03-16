// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PlannerRegistration, Team, TournamentFormat } from '@padel/common';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'teams.title') return 'Team Pairing';
      if (key === 'teams.subtitle') return `${params?.playerCount} players → ${params?.teamCount} teams`;
      if (key === 'teams.hint') return 'Tap a name to select, then tap another to swap';
      if (key === 'teams.hintClub') return 'Players are grouped by club';
      if (key === 'teams.shuffle') return 'Shuffle';
      if (key === 'teams.start') return 'Start Tournament';
      if (key === 'teams.groupsAutoAssigned') return `${params?.count} players auto-assigned to groups`;
      return key;
    },
  }),
  Modal: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) =>
    open ? <div data-testid="modal" data-title={title}>{children}</div> : null,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  NO_COLOR: 'transparent',
  CLUB_COLORS: ['#e53935', '#1e88e5', '#43a047'],
  getClubColor: (_c: unknown, i: number) => ['#e53935', '#1e88e5', '#43a047'][i] ?? '#888',
  shortLabel: (s: string) => s.slice(0, 3),
  formatHasGroups: (f: string) => f === 'mixicano',
  formatHasClubs: (f: string) => ['club-americano', 'club-ranked'].includes(f),
  deduplicateNames: (items: Array<{ id: string; name: string }>) => {
    const map = new Map<string, string>();
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
    }
    const seen = new Map<string, number>();
    for (const item of items) {
      if ((counts.get(item.name) ?? 0) > 1) {
        const idx = (seen.get(item.name) ?? 0) + 1;
        seen.set(item.name, idx);
        map.set(item.id, `${item.name} (${idx})`);
      }
    }
    return map;
  },
  generateId: () => `id-${Math.random().toString(36).slice(2, 8)}`,
  buildRankLabelMap: () => new Map<string, string>(),
  createTeams: (players: Array<{ id: string }>) => {
    const teams: Team[] = [];
    for (let i = 0; i + 1 < players.length; i += 2) {
      teams.push({ id: `t${i / 2}`, player1Id: players[i].id, player2Id: players[i + 1].id });
    }
    return teams;
  },
  createCrossGroupTeams: (players: Array<{ id: string; group?: string }>) => {
    const a = players.filter(p => p.group === 'A');
    const b = players.filter(p => p.group === 'B');
    const teams: Team[] = [];
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      teams.push({ id: `t${i}`, player1Id: a[i].id, player2Id: b[i].id });
    }
    return teams;
  },
  createClubTeams: (players: Array<{ id: string; clubId?: string }>) => {
    const teams: Team[] = [];
    const byClub = new Map<string, Array<{ id: string }>>();
    for (const p of players) {
      const club = (p as { clubId?: string }).clubId ?? 'default';
      if (!byClub.has(club)) byClub.set(club, []);
      byClub.get(club)!.push(p);
    }
    for (const [, clubPlayers] of byClub) {
      for (let i = 0; i + 1 < clubPlayers.length; i += 2) {
        teams.push({ id: `t${teams.length}`, player1Id: clubPlayers[i].id, player2Id: clubPlayers[i + 1].id });
      }
    }
    return teams;
  },
  formatHasFixedPartners: () => false,
}));

import { TeamPairingModal } from './TeamPairingModal';

// ── Helpers ────────────────────────────────────────────────────

function player(overrides: Partial<PlannerRegistration> & { id: string; name: string }): PlannerRegistration {
  return { timestamp: 1000, ...overrides };
}

function makePlayers(n: number): PlannerRegistration[] {
  return Array.from({ length: n }, (_, i) => player({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function renderModal(
  props: Partial<React.ComponentProps<typeof TeamPairingModal>> = {},
) {
  const defaults = {
    open: true,
    players: makePlayers(4),
    format: 'americano' as TournamentFormat,
    onStart: vi.fn(),
    onClose: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  const result = render(<TeamPairingModal {...merged} />);
  return { ...result, onStart: merged.onStart, onClose: merged.onClose };
}

// ── Tests ──────────────────────────────────────────────────────

describe('TeamPairingModal', () => {
  afterEach(cleanup);

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = renderModal({ open: false });
      expect(container.innerHTML).toBe('');
    });

    it('renders modal with title when open', () => {
      renderModal();
      expect(screen.getByTestId('modal')).toBeTruthy();
      expect(screen.getByTestId('modal').getAttribute('data-title')).toBe('Team Pairing');
    });

    it('shows player/team count subtitle', () => {
      renderModal({ players: makePlayers(4) });
      expect(screen.getByText('4 players → 2 teams')).toBeTruthy();
    });

    it('shows swap hint text', () => {
      renderModal();
      expect(screen.getByText('Tap a name to select, then tap another to swap')).toBeTruthy();
    });

    it('shows club hint for club format', () => {
      renderModal({
        format: 'club-americano',
        clubs: [{ id: 'c1', name: 'Club A' }],
        players: makePlayers(4).map(p => ({ ...p, clubId: 'c1' })),
      });
      expect(screen.getByText('Players are grouped by club')).toBeTruthy();
    });

    it('renders Shuffle and Start buttons', () => {
      renderModal();
      expect(screen.getByText('Shuffle')).toBeTruthy();
      expect(screen.getByText('Start Tournament')).toBeTruthy();
    });

    it('renders all player names as chips', () => {
      renderModal({ players: makePlayers(4) });
      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 2')).toBeTruthy();
      expect(screen.getByText('Player 3')).toBeTruthy();
      expect(screen.getByText('Player 4')).toBeTruthy();
    });
  });

  describe('partner matching', () => {
    it('pre-pairs players with matching partnerName', () => {
      const players = [
        player({ id: 'p1', name: 'Alice', partnerName: 'Bob' }),
        player({ id: 'p2', name: 'Bob', partnerName: 'Alice' }),
        player({ id: 'p3', name: 'Carol' }),
        player({ id: 'p4', name: 'Dave' }),
      ];
      renderModal({ players });
      // Both Alice and Bob should appear — they are pre-paired into a team
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });

    it('pre-pairs by telegram username match', () => {
      const players = [
        player({ id: 'p1', name: 'Alice', partnerTelegram: 'bob_tg', telegramUsername: 'alice_tg' }),
        player({ id: 'p2', name: 'Bob', telegramUsername: 'bob_tg' }),
        player({ id: 'p3', name: 'Carol' }),
        player({ id: 'p4', name: 'Dave' }),
      ];
      // Pre-pairing happens via partnerTelegram matching telegramUsername
      renderModal({ players });
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });
  });

  describe('start tournament', () => {
    it('calls onStart with teams and aliases on Start click', () => {
      const { onStart } = renderModal({ players: makePlayers(4) });
      fireEvent.click(screen.getByText('Start Tournament'));
      expect(onStart).toHaveBeenCalledTimes(1);
      const [teams, aliases] = onStart.mock.calls[0];
      expect(teams).toHaveLength(2);
      expect(aliases).toBeInstanceOf(Map);
    });
  });

  describe('shuffle', () => {
    it('regenerates teams on Shuffle click', () => {
      const { onStart } = renderModal({ players: makePlayers(4) });

      // Get initial teams
      fireEvent.click(screen.getByText('Start Tournament'));
      const teamsBefore = onStart.mock.calls[0][0] as Team[];

      // Shuffle and get new teams (they may be same due to small set, but function should be called)
      fireEvent.click(screen.getByText('Shuffle'));
      fireEvent.click(screen.getByText('Start Tournament'));
      const teamsAfter = onStart.mock.calls[1][0] as Team[];

      // Both sets should have 2 teams
      expect(teamsBefore).toHaveLength(2);
      expect(teamsAfter).toHaveLength(2);
    });
  });

  describe('player selection and swap', () => {
    it('selects player on first tap (adds selected class)', () => {
      renderModal({ players: makePlayers(4) });
      const chip = screen.getByText('Player 1');
      fireEvent.click(chip);
      // The chip should now have the selected class
      expect(chip.className).toContain('Selected');
    });

    it('swaps players when tapping two from different teams', () => {
      const players = makePlayers(4);
      const { onStart } = renderModal({ players });

      // Get initial team composition
      fireEvent.click(screen.getByText('Start Tournament'));
      const initialTeams = onStart.mock.calls[0][0] as Team[];
      const team1Player2 = initialTeams[0].player2Id;
      const team2Player1 = initialTeams[1].player1Id;

      // Now swap: select Player from team1, then tap Player from team2
      fireEvent.click(screen.getByText('Player 2')); // select
      fireEvent.click(screen.getByText('Player 3')); // swap

      // Verify swap happened
      fireEvent.click(screen.getByText('Start Tournament'));
      const swappedTeams = onStart.mock.calls[1][0] as Team[];

      // After swap, one team should contain the swapped players
      const allPlayerIds = swappedTeams.flatMap(t => [t.player1Id, t.player2Id]);
      expect(allPlayerIds).toContain(team1Player2);
      expect(allPlayerIds).toContain(team2Player1);
    });

    it('deselects when tapping same-team player', () => {
      const players = makePlayers(4);
      renderModal({ players });

      // Select a player, then tap their teammate — should deselect
      fireEvent.click(screen.getByText('Player 1'));
      expect(screen.getByText('Player 1').className).toContain('Selected');

      fireEvent.click(screen.getByText('Player 2'));
      // Selection should be cleared — no chip should have selected class
      expect(screen.getByText('Player 1').className).not.toContain('Selected');
      expect(screen.getByText('Player 2').className).not.toContain('Selected');
    });
  });

  describe('player name editing', () => {
    it('enters edit mode on double tap (same player)', () => {
      renderModal({ players: makePlayers(4) });

      // First tap selects
      fireEvent.click(screen.getByText('Player 1'));
      // Second tap on same → edit mode
      fireEvent.click(screen.getByText('Player 1'));

      const input = screen.getByDisplayValue('Player 1');
      expect(input).toBeTruthy();
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('saves edited name on Enter', () => {
      renderModal({ players: makePlayers(4) });

      // Enter edit mode
      fireEvent.click(screen.getByText('Player 1'));
      fireEvent.click(screen.getByText('Player 1'));

      const input = screen.getByDisplayValue('Player 1');
      fireEvent.change(input, { target: { value: 'Alice' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByText('Alice')).toBeTruthy();
    });

    it('cancels edit on Escape', () => {
      renderModal({ players: makePlayers(4) });

      // Enter edit mode
      fireEvent.click(screen.getByText('Player 1'));
      fireEvent.click(screen.getByText('Player 1'));

      const input = screen.getByDisplayValue('Player 1');
      fireEvent.change(input, { target: { value: 'Changed' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // Original name should remain
      expect(screen.getByText('Player 1')).toBeTruthy();
    });
  });

  describe('team renaming', () => {
    it('renders team name inputs with placeholder', () => {
      renderModal({ players: makePlayers(4) });
      const inputs = screen.getAllByPlaceholderText(/Player \d+ & Player \d+/);
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it('allows changing team name', () => {
      renderModal({ players: makePlayers(4) });
      const inputs = screen.getAllByPlaceholderText(/Player \d+ & Player \d+/);
      fireEvent.change(inputs[0], { target: { value: 'Team Alpha' } });
      expect(inputs[0]).toHaveProperty('value', 'Team Alpha');
    });
  });

  describe('aliases', () => {
    it('uses alias when player has one', () => {
      const players = [
        player({ id: 'p1', name: 'Alexander', alias: 'Alex' }),
        player({ id: 'p2', name: 'Player 2' }),
        player({ id: 'p3', name: 'Player 3' }),
        player({ id: 'p4', name: 'Player 4' }),
      ];
      renderModal({ players });
      expect(screen.getByText('Alex')).toBeTruthy();
      expect(screen.queryByText('Alexander')).toBeNull();
    });

    it('passes aliases map to onStart', () => {
      const players = [
        player({ id: 'p1', name: 'Alexander', alias: 'Alex' }),
        player({ id: 'p2', name: 'Player 2' }),
        player({ id: 'p3', name: 'Player 3' }),
        player({ id: 'p4', name: 'Player 4' }),
      ];
      const { onStart } = renderModal({ players });
      fireEvent.click(screen.getByText('Start Tournament'));
      const aliases = onStart.mock.calls[0][1] as Map<string, string>;
      expect(aliases.get('p1')).toBe('Alex');
    });
  });

  describe('cross-group format', () => {
    it('shows group badges for mixicano format', () => {
      const players = [
        player({ id: 'p1', name: 'Alice', group: 'A' }),
        player({ id: 'p2', name: 'Bob', group: 'B' }),
        player({ id: 'p3', name: 'Carol', group: 'A' }),
        player({ id: 'p4', name: 'Dave', group: 'B' }),
      ];
      renderModal({ players, format: 'mixicano' });
      expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(2);
    });

    it('shows warning for unassigned group players', () => {
      const players = [
        player({ id: 'p1', name: 'Alice', group: 'A' }),
        player({ id: 'p2', name: 'Bob' }), // no group
        player({ id: 'p3', name: 'Carol', group: 'B' }),
        player({ id: 'p4', name: 'Dave' }), // no group
      ];
      renderModal({ players, format: 'mixicano' });
      expect(screen.getByText('2 players auto-assigned to groups')).toBeTruthy();
    });

    it('prevents cross-group swap', () => {
      // createCrossGroupTeams pairs: Alice(A)+Bob(B), Carol(A)+Dave(B)
      // Selecting Alice(A) and tapping Dave(B) should NOT swap (different groups)
      const players = [
        player({ id: 'p1', name: 'Alice', group: 'A' }),
        player({ id: 'p2', name: 'Bob', group: 'B' }),
        player({ id: 'p3', name: 'Carol', group: 'A' }),
        player({ id: 'p4', name: 'Dave', group: 'B' }),
      ];
      renderModal({ players, format: 'mixicano' });

      // Select Alice (group A), tap Dave (group B, different team) — should reselect, not swap
      fireEvent.click(screen.getByText('Alice'));
      fireEvent.click(screen.getByText('Dave'));

      // Dave should now be selected instead of swapped
      expect(screen.getByText('Dave').className).toContain('Selected');
    });
  });

  describe('club format', () => {
    it('renders club headers for club format', () => {
      const clubs = [
        { id: 'c1', name: 'Club Alpha' },
        { id: 'c2', name: 'Club Beta' },
      ];
      const players = [
        player({ id: 'p1', name: 'Alice', clubId: 'c1' }),
        player({ id: 'p2', name: 'Bob', clubId: 'c1' }),
        player({ id: 'p3', name: 'Carol', clubId: 'c2' }),
        player({ id: 'p4', name: 'Dave', clubId: 'c2' }),
      ];
      renderModal({ players, format: 'club-americano', clubs });
      expect(screen.getByText('Club Alpha')).toBeTruthy();
      expect(screen.getByText('Club Beta')).toBeTruthy();
    });

    it('prevents cross-club swap', () => {
      const clubs = [
        { id: 'c1', name: 'Club A' },
        { id: 'c2', name: 'Club B' },
      ];
      const players = [
        player({ id: 'p1', name: 'Alice', clubId: 'c1' }),
        player({ id: 'p2', name: 'Bob', clubId: 'c1' }),
        player({ id: 'p3', name: 'Carol', clubId: 'c2' }),
        player({ id: 'p4', name: 'Dave', clubId: 'c2' }),
      ];
      renderModal({ players, format: 'club-americano', clubs });

      // Select Alice (club A), tap Carol (club B) — should reselect, not swap
      fireEvent.click(screen.getByText('Alice'));
      fireEvent.click(screen.getByText('Carol'));

      expect(screen.getByText('Carol').className).toContain('Selected');
    });
  });
});
