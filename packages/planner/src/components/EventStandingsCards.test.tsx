// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StandingsCard, ClubStandingsCard } from './EventStandingsCards';
import type { EventStandingEntry, EventClubStandingEntry } from '@padel/common';

vi.mock('@padel/common', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
}));

import { vi } from 'vitest';

afterEach(cleanup);

const t = (key: string) => key;

describe('StandingsCard', () => {
  it('shows live standings title when status is active', () => {
    render(<StandingsCard standings={[]} status="active" t={t} />);
    expect(screen.getByText('event.liveStandings')).toBeDefined();
  });

  it('shows final standings title when status is completed', () => {
    render(<StandingsCard standings={[]} status="completed" t={t} />);
    expect(screen.getByText('event.finalStandings')).toBeDefined();
  });

  it('shows empty message when no standings', () => {
    render(<StandingsCard standings={[]} status="active" t={t} />);
    expect(screen.getByText('event.noStandings')).toBeDefined();
  });

  it('renders player standings rows', () => {
    const standings: EventStandingEntry[] = [
      { playerName: 'Alice', rank: 1, totalPoints: 100, matchesPlayed: 5, matchesWon: 4, pointDiff: 20 },
      { playerName: 'Bob', rank: 2, totalPoints: 80, matchesPlayed: 5, matchesWon: 3, pointDiff: -5 },
    ];
    render(<StandingsCard standings={standings} status="active" t={t} />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('+20')).toBeDefined();
    expect(screen.getByText('-5')).toBeDefined();
  });
});

describe('ClubStandingsCard', () => {
  it('shows live club standings title when active', () => {
    render(<ClubStandingsCard clubStandings={[]} status="active" t={t} />);
    expect(screen.getByText('event.liveClubStandings')).toBeDefined();
  });

  it('shows final club standings title when completed', () => {
    render(<ClubStandingsCard clubStandings={[]} status="completed" t={t} />);
    expect(screen.getByText('event.finalClubStandings')).toBeDefined();
  });

  it('renders club standings rows', () => {
    const clubs: EventClubStandingEntry[] = [
      { clubName: 'Club A', rank: 1, totalPoints: 200, memberCount: 3 },
      { clubName: 'Club B', rank: 2, totalPoints: 150, memberCount: 2 },
    ];
    render(<ClubStandingsCard clubStandings={clubs} status="active" t={t} />);
    expect(screen.getByText('Club A')).toBeDefined();
    expect(screen.getByText('Club B')).toBeDefined();
    expect(screen.getByText('200')).toBeDefined();
  });
});
