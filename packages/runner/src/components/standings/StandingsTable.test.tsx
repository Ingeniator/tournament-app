// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { StandingsEntry } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { vi } from 'vitest';
import { StandingsTable } from './StandingsTable';

function makeEntry(overrides: Partial<StandingsEntry> = {}): StandingsEntry {
  return {
    playerId: 'p1',
    playerName: 'Alice',
    totalPoints: 20,
    matchesPlayed: 5,
    matchesWon: 3,
    matchesLost: 1,
    matchesDraw: 1,
    pointDiff: 8,
    rank: 1,
    ...overrides,
  };
}

describe('StandingsTable', () => {
  afterEach(cleanup);

  it('shows empty message when standings is empty', () => {
    render(<StandingsTable standings={[]} />);
    expect(screen.getByText('standings.empty')).toBeTruthy();
  });

  it('renders header columns', () => {
    render(<StandingsTable standings={[makeEntry()]} />);
    expect(screen.getByText('#')).toBeTruthy();
    expect(screen.getByText('standings.name')).toBeTruthy();
    expect(screen.getByText('standings.pts')).toBeTruthy();
    expect(screen.getByText('standings.wtl')).toBeTruthy();
    expect(screen.getByText('standings.diff')).toBeTruthy();
  });

  it('renders player name, rank, points, W-T-L, and diff', () => {
    render(<StandingsTable standings={[makeEntry()]} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('3-1-1')).toBeTruthy();
    expect(screen.getByText('+8')).toBeTruthy();
  });

  it('applies rank coloring classes for top 3', () => {
    const entries = [
      makeEntry({ playerId: 'p1', rank: 1 }),
      makeEntry({ playerId: 'p2', playerName: 'Bob', rank: 2 }),
      makeEntry({ playerId: 'p3', playerName: 'Charlie', rank: 3 }),
      makeEntry({ playerId: 'p4', playerName: 'Dave', rank: 4 }),
    ];
    const { container } = render(<StandingsTable standings={entries} />);
    const rankCells = container.querySelectorAll('tbody td:first-child');
    expect(rankCells[0].className).toContain('rank1');
    expect(rankCells[1].className).toContain('rank2');
    expect(rankCells[2].className).toContain('rank3');
    expect(rankCells[3].className).not.toContain('rank1');
    expect(rankCells[3].className).not.toContain('rank2');
    expect(rankCells[3].className).not.toContain('rank3');
  });

  it('shows + prefix for positive diffs', () => {
    render(<StandingsTable standings={[makeEntry({ pointDiff: 5 })]} />);
    expect(screen.getByText('+5')).toBeTruthy();
  });

  it('shows no prefix for negative diffs', () => {
    render(<StandingsTable standings={[makeEntry({ pointDiff: -3 })]} />);
    expect(screen.getByText('-3')).toBeTruthy();
  });

  it('renders group badges when groupInfo is provided', () => {
    const groupInfo = {
      labels: ['Men', 'Women'] as [string, string],
      map: new Map([['p1', 'A' as const]]),
    };
    render(<StandingsTable standings={[makeEntry()]} groupInfo={groupInfo} />);
    expect(screen.getByText('Men')).toBeTruthy();
  });
});
