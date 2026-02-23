// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Round, Player, Court } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'round.title' && params?.num) return `Round ${params.num}`;
      if (key === 'round.sittingOut' && params?.names) return `Sitting out: ${params.names}`;
      return key;
    },
  }),
}));

vi.mock('./MatchCard', () => ({
  MatchCard: (props: { match: { id: string } }) => (
    <div data-testid={`match-${props.match.id}`}>MatchCard</div>
  ),
}));

import { RoundCard } from './RoundCard';

const players: Player[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Dave' },
  { id: 'p5', name: 'Eve' },
];

const courts: Court[] = [{ id: 'c1', name: 'Court 1', available: true }];

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    roundNumber: 1,
    matches: [
      {
        id: 'm1',
        courtId: 'c1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
        score: null,
      },
    ],
    sitOuts: [],
    ...overrides,
  };
}

describe('RoundCard', () => {
  afterEach(cleanup);

  it('renders round title with number', () => {
    render(
      <RoundCard
        round={makeRound({ roundNumber: 3 })}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('Round 3')).toBeTruthy();
  });

  it('renders scored/total badge', () => {
    const round = makeRound({
      matches: [
        { id: 'm1', courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: { team1Points: 14, team2Points: 10 } },
        { id: 'm2', courtId: 'c1', team1: ['p1', 'p3'], team2: ['p2', 'p4'], score: null },
      ],
    });
    render(
      <RoundCard
        round={round}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('1/2')).toBeTruthy();
  });

  it('renders MatchCard stubs for each match', () => {
    const round = makeRound({
      matches: [
        { id: 'm1', courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: null },
        { id: 'm2', courtId: 'c1', team1: ['p1', 'p3'], team2: ['p2', 'p4'], score: null },
      ],
    });
    render(
      <RoundCard
        round={round}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByTestId('match-m1')).toBeTruthy();
    expect(screen.getByTestId('match-m2')).toBeTruthy();
  });

  it('renders sit-out names', () => {
    render(
      <RoundCard
        round={makeRound({ sitOuts: ['p5'] })}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('Sitting out: Eve')).toBeTruthy();
  });

  it('does not render sit-out section when no sit-outs', () => {
    const { container } = render(
      <RoundCard
        round={makeRound({ sitOuts: [] })}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(container.querySelector('[class*="sitOut"]')).toBeNull();
  });
});
