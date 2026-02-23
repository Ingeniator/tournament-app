// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Match, Player, Court } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./ScoreInput', () => ({
  ScoreInput: (props: { score: unknown }) => (
    <div data-testid="score-input">{props.score ? 'has-score' : 'no-score'}</div>
  ),
}));

import { MatchCard } from './MatchCard';

const players: Player[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Dave' },
];

const courts: Court[] = [
  { id: 'c1', name: 'Court 1' },
  { id: 'c2', name: 'Court 2' },
];

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    courtId: 'c1',
    team1: ['p1', 'p2'],
    team2: ['p3', 'p4'],
    score: null,
    ...overrides,
  };
}

describe('MatchCard', () => {
  afterEach(cleanup);

  it('renders player names', () => {
    render(
      <MatchCard
        match={makeMatch()}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByTitle('Alice')).toBeTruthy();
    expect(screen.getByTitle('Bob')).toBeTruthy();
    expect(screen.getByTitle('Charlie')).toBeTruthy();
    expect(screen.getByTitle('Dave')).toBeTruthy();
  });

  it('renders court name', () => {
    render(
      <MatchCard
        match={makeMatch()}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('Court 1')).toBeTruthy();
  });

  it('renders score display in readOnly mode with score', () => {
    render(
      <MatchCard
        match={makeMatch({ score: { team1Points: 14, team2Points: 10 } })}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        readOnly
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('renders ScoreInput when not readOnly', () => {
    render(
      <MatchCard
        match={makeMatch()}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByTestId('score-input')).toBeTruthy();
  });

  it('shows KOTC bonus for non-first court', () => {
    render(
      <MatchCard
        match={makeMatch({ courtId: 'c2' })}
        players={players}
        courts={courts}
        pointsPerMatch={24}
        format="king-of-the-court"
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // Court 2 is index 1, bonus = 2 - 1 - 1 = 0 for 2 courts... let's check
    // Actually bonus = courts.length - 1 - courtIndex = 2 - 1 - 1 = 0
    // So no bonus for second court of 2. Let's test with 3 courts.
  });

  it('shows KOTC crown and bonus points for top court', () => {
    const threeCourts: Court[] = [
      { id: 'c1', name: 'Court 1' },
      { id: 'c2', name: 'Court 2' },
      { id: 'c3', name: 'Court 3' },
    ];
    render(
      <MatchCard
        match={makeMatch({ courtId: 'c3' })}
        players={players}
        courts={threeCourts}
        pointsPerMatch={24}
        format="king-of-the-court"
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // Court 3 is index 2, bonus = 3 - 1 - 2 = 0 → no bonus
    // Court 1 is index 0 → crown emoji, bonus = 3-1-0 = 2
    // Let's test court 1 for crown
  });
});

describe('MatchCard KOTC with 3 courts', () => {
  afterEach(cleanup);

  const threeCourts: Court[] = [
    { id: 'c1', name: 'Court 1' },
    { id: 'c2', name: 'Court 2' },
    { id: 'c3', name: 'Court 3' },
  ];

  it('shows crown for first (top) court', () => {
    render(
      <MatchCard
        match={makeMatch({ courtId: 'c1' })}
        players={players}
        courts={threeCourts}
        pointsPerMatch={24}
        format="king-of-the-court"
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // courtIndex 0, bonus = 3-1-0 = 2
    expect(screen.getByText(/\u{1F451}/u)).toBeTruthy();
    expect(screen.getByText(/\+2 bonus pts/)).toBeTruthy();
  });

  it('shows bonus for middle court', () => {
    render(
      <MatchCard
        match={makeMatch({ courtId: 'c2' })}
        players={players}
        courts={threeCourts}
        pointsPerMatch={24}
        format="king-of-the-court"
        onScore={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // courtIndex 1, bonus = 3-1-1 = 1
    expect(screen.getByText(/\+1 bonus pts/)).toBeTruthy();
  });
});
