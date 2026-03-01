// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NominationCard } from './NominationCard';
import type { Nomination } from '@padel/common';

function makeNomination(overrides: Partial<Nomination> = {}): Nomination {
  return {
    id: 'nom-1',
    title: 'Top Scorer',
    emoji: '🏆',
    description: 'Scored the most points overall',
    playerNames: ['Alice', 'Bob'],
    stat: '42 pts',
    tier: 'common',
    ...overrides,
  };
}

describe('NominationCard', () => {
  afterEach(cleanup);

  it('renders emoji, title, stat, and description', () => {
    render(<NominationCard nomination={makeNomination()} />);
    expect(screen.getByText('🏆')).toBeTruthy();
    expect(screen.getByText('Top Scorer')).toBeTruthy();
    expect(screen.getByText('42 pts')).toBeTruthy();
    expect(screen.getByText('Scored the most points overall')).toBeTruthy();
  });

  it('renders 2-player layout with names on separate rows', () => {
    render(<NominationCard nomination={makeNomination({ playerNames: ['Alice', 'Bob'] })} />);
    expect(screen.getByText('Alice &')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('renders single player name without ampersand', () => {
    render(<NominationCard nomination={makeNomination({ playerNames: ['Alice'] })} />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('renders 4-player layout with vs separator and names on separate rows', () => {
    render(
      <NominationCard
        nomination={makeNomination({ playerNames: ['Alice', 'Bob', 'Charlie', 'Dave'] })}
      />,
    );
    expect(screen.getByText('vs')).toBeTruthy();
    expect(screen.getByText('Alice &')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Charlie &')).toBeTruthy();
    expect(screen.getByText('Dave')).toBeTruthy();
  });

  it('does not show tier badge for common tier', () => {
    const { container } = render(
      <NominationCard nomination={makeNomination({ tier: 'common' })} />,
    );
    expect(container.querySelector('[class*="tierBadge"]')).toBeNull();
  });

  it('shows RARE badge for rare tier', () => {
    render(<NominationCard nomination={makeNomination({ tier: 'rare' })} />);
    expect(screen.getByText('RARE')).toBeTruthy();
  });

  it('shows LEGENDARY badge for legendary tier', () => {
    render(<NominationCard nomination={makeNomination({ tier: 'legendary' })} />);
    expect(screen.getByText('LEGENDARY')).toBeTruthy();
  });
});
