// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ClubPanel } from './ClubPanel';
import type { PlannerRegistration, Club } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'organizer.clubPanel') return 'Clubs';
      if (key === 'organizer.clubUnassigned') return 'Unassigned';
      return key;
    },
  }),
  NO_COLOR: 'none',
  getClubColor: (club: Club) => club.color ?? 'none',
  shortLabel: (name: string) => name.slice(0, 3).toUpperCase(),
}));

afterEach(cleanup);

const clubs: Club[] = [
  { id: 'c1', name: 'Alpha', color: '#ff0000' },
  { id: 'c2', name: 'Bravo', color: '#0000ff' },
];

const makePlayers = (overrides: Partial<PlannerRegistration>[] = []): PlannerRegistration[] =>
  [
    { id: 'p1', name: 'Alice', clubId: 'c1', confirmed: true },
    { id: 'p2', name: 'Bob', clubId: 'c2', confirmed: true },
    { id: 'p3', name: 'Charlie', clubId: undefined, confirmed: true },
    { id: 'p4', name: 'Diana', clubId: undefined, confirmed: false },
    ...overrides,
  ] as PlannerRegistration[];

describe('ClubPanel', () => {
  it('renders club cards with assigned players', () => {
    render(<ClubPanel clubs={clubs} players={makePlayers()} onSetClub={vi.fn()} />);

    // ALP appears in club header + unassigned assign buttons
    expect(screen.getAllByText('ALP').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('BRA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Alice/)).toBeDefined();
    expect(screen.getByText(/Bob/)).toBeDefined();
  });

  it('shows empty message for clubs with no players', () => {
    const emptyPlayers = makePlayers().map(p => ({ ...p, clubId: undefined }));
    render(<ClubPanel clubs={clubs} players={emptyPlayers as PlannerRegistration[]} onSetClub={vi.fn()} />);

    expect(screen.getAllByText('Unassigned').length).toBeGreaterThanOrEqual(2);
  });

  it('filters out unconfirmed players', () => {
    render(<ClubPanel clubs={clubs} players={makePlayers()} onSetClub={vi.fn()} />);

    // Diana (confirmed: false) should not appear
    expect(screen.queryByText(/Diana/)).toBeNull();
  });

  it('shows unassigned players section', () => {
    render(<ClubPanel clubs={clubs} players={makePlayers()} onSetClub={vi.fn()} />);

    // Charlie is unassigned and confirmed
    expect(screen.getByText('Charlie')).toBeDefined();
    // Should show count
    expect(screen.getByText(/\(1\)/)).toBeDefined();
  });

  it('calls onSetClub(playerId, null) when clicking assigned player', () => {
    const onSetClub = vi.fn();
    render(<ClubPanel clubs={clubs} players={makePlayers()} onSetClub={onSetClub} />);

    // Click on Alice (assigned to c1) to remove from club
    fireEvent.click(screen.getByText(/Alice/));
    expect(onSetClub).toHaveBeenCalledWith('p1', null);
  });

  it('calls onSetClub(playerId, clubId) when assigning player to club', () => {
    const onSetClub = vi.fn();
    render(<ClubPanel clubs={clubs} players={makePlayers()} onSetClub={onSetClub} />);

    // Charlie is unassigned — click the Alpha club button to assign
    const assignButtons = screen.getAllByText('ALP');
    // The last ALP button should be in the unassigned section
    fireEvent.click(assignButtons[assignButtons.length - 1]);
    expect(onSetClub).toHaveBeenCalledWith('p3', 'c1');
  });

  it('hides unassigned section when all players are assigned', () => {
    const allAssigned = makePlayers().map(p =>
      p.id === 'p3' ? { ...p, clubId: 'c1' } : p,
    );
    render(<ClubPanel clubs={clubs} players={allAssigned as PlannerRegistration[]} onSetClub={vi.fn()} />);

    // No unassigned count
    expect(screen.queryByText(/\(\d+\)/)).toBeNull();
  });
});
