// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { SimpleBreakdown, ClubBreakdown, ClubRankedBreakdown, GroupBreakdown, UrgencyLevel } from '../utils/tournamentBreakdown';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'breakdown.spotsLeft') return `${params?.count} spots left`;
      if (key === 'breakdown.full') return 'Full';
      if (key === 'breakdown.overbooked') return 'Overbooked';
      if (key === 'breakdown.paired') return 'Paired';
      return key;
    },
  }),
  shortLabel: (s: string) => s.slice(0, 3),
}));

import { TournamentBreakdownView } from './TournamentBreakdown';

// ── Helpers ────────────────────────────────────────────────────

function makeUrgency(level: UrgencyLevel = 'neutral', key = 'breakdown.spotsLeft', count = 4) {
  return { urgency: { key, params: { count } }, urgencyLevel: level };
}

function simpleBreakdown(overrides: Partial<SimpleBreakdown> = {}): SimpleBreakdown {
  return {
    kind: 'simple',
    filled: 6,
    total: 12,
    ...makeUrgency(),
    ...overrides,
  };
}

function clubBreakdown(overrides: Partial<ClubBreakdown> = {}): ClubBreakdown {
  return {
    kind: 'club',
    filled: 8,
    total: 12,
    captainMode: false,
    clubs: [
      { clubId: 'c1', name: 'Club Alpha', color: '#e53935', filled: 4, capacity: 6 },
      { clubId: 'c2', name: 'Club Beta', color: '#1e88e5', filled: 4, capacity: 6 },
    ],
    ...makeUrgency(),
    ...overrides,
  };
}

function clubRankedBreakdown(overrides: Partial<ClubRankedBreakdown> = {}): ClubRankedBreakdown {
  return {
    kind: 'club-ranked',
    filled: 4,
    total: 8,
    captainMode: false,
    hasPairs: false,
    rankLabels: ['Rank 1', 'Rank 2'],
    rows: [
      {
        clubId: 'c1', name: 'Club Alpha', color: '#e53935',
        cells: [{ filled: 1, capacity: 2, paired: 0 }, { filled: 1, capacity: 2, paired: 0 }],
        pairedPercent: 0,
      },
      {
        clubId: 'c2', name: 'Club Beta', color: '#1e88e5',
        cells: [{ filled: 1, capacity: 2, paired: 0 }, { filled: 1, capacity: 2, paired: 0 }],
        pairedPercent: 0,
      },
    ],
    ...makeUrgency(),
    ...overrides,
  };
}

function groupBreakdown(overrides: Partial<GroupBreakdown> = {}): GroupBreakdown {
  return {
    kind: 'group',
    filled: 6,
    total: 8,
    groups: [
      { group: 'A', label: 'Men', filled: 3, capacity: 4 },
      { group: 'B', label: 'Women', filled: 3, capacity: 4 },
    ],
    ...makeUrgency(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('TournamentBreakdownView', () => {
  afterEach(cleanup);

  describe('simple breakdown', () => {
    it('renders progress bar', () => {
      const { container } = render(<TournamentBreakdownView breakdown={simpleBreakdown()} />);
      const fill = container.querySelector('[class*="progressFill"]');
      expect(fill).toBeTruthy();
      // 6/12 = 50%
      expect(fill!.getAttribute('style')).toContain('50%');
    });

    it('renders urgency text', () => {
      render(<TournamentBreakdownView breakdown={simpleBreakdown()} />);
      expect(screen.getByText('4 spots left')).toBeTruthy();
    });

    it('does not render expandable content for simple breakdown', () => {
      const { container } = render(<TournamentBreakdownView breakdown={simpleBreakdown()} />);
      expect(container.querySelector('[class*="expandedContent"]')).toBeNull();
    });

    it('does not render chevron for simple breakdown', () => {
      const { container } = render(<TournamentBreakdownView breakdown={simpleBreakdown()} />);
      expect(container.querySelector('[class*="chevron"]')).toBeNull();
    });

    it('clamps progress bar at 100% for overbooked', () => {
      const { container } = render(<TournamentBreakdownView breakdown={simpleBreakdown({ filled: 15, total: 12 })} />);
      const fill = container.querySelector('[class*="progressFill"]');
      expect(fill!.getAttribute('style')).toContain('100%');
    });

    it('renders action element when provided', () => {
      render(
        <TournamentBreakdownView
          breakdown={simpleBreakdown()}
          action={<button data-testid="join-btn">Join</button>}
        />,
      );
      expect(screen.getByTestId('join-btn')).toBeTruthy();
    });
  });

  describe('club breakdown', () => {
    it('renders expanded club bars by default', () => {
      render(<TournamentBreakdownView breakdown={clubBreakdown()} />);
      expect(screen.getByText('Club Alpha')).toBeTruthy();
      expect(screen.getByText('Club Beta')).toBeTruthy();
    });

    it('shows club fill counts', () => {
      render(<TournamentBreakdownView breakdown={clubBreakdown()} />);
      expect(screen.getAllByText('4/6').length).toBe(2);
    });

    it('collapses on footer click', () => {
      render(<TournamentBreakdownView breakdown={clubBreakdown()} />);
      expect(screen.getByText('Club Alpha')).toBeTruthy();

      // Click the urgency text area to collapse
      fireEvent.click(screen.getByText('4 spots left'));
      expect(screen.queryByText('Club Alpha')).toBeNull();
    });

    it('renders chevron for expandable breakdown', () => {
      const { container } = render(<TournamentBreakdownView breakdown={clubBreakdown()} />);
      expect(container.querySelector('[class*="chevron"]')).toBeTruthy();
    });

    it('renders simple list in captain mode', () => {
      render(<TournamentBreakdownView breakdown={clubBreakdown({ captainMode: true })} />);
      expect(screen.getByText('Club Alpha')).toBeTruthy();
      // Captain mode: shows just filled count, no capacity bar
      expect(screen.getAllByText('4').length).toBe(2);
      expect(screen.queryByText('4/6')).toBeNull();
    });

    it('uses approvedCount for progress bar in captain mode', () => {
      const { container } = render(
        <TournamentBreakdownView
          breakdown={clubBreakdown({ captainMode: true })}
          approvedCount={3}
        />,
      );
      const fill = container.querySelector('[class*="progressFill"]');
      // 3/12 = 25%
      expect(fill!.getAttribute('style')).toContain('25%');
    });
  });

  describe('club-ranked breakdown', () => {
    it('renders matrix table', () => {
      render(<TournamentBreakdownView breakdown={clubRankedBreakdown()} />);
      // Rank labels should be shortened — both 'Rank 1' and 'Rank 2' → 'Ran'
      expect(screen.getAllByText('Ran').length).toBe(2);
    });

    it('renders club rows with fill counts', () => {
      render(<TournamentBreakdownView breakdown={clubRankedBreakdown()} />);
      // Each cell shows 1/2
      expect(screen.getAllByText('1/2').length).toBe(4);
    });

    it('shows column totals in footer', () => {
      render(<TournamentBreakdownView breakdown={clubRankedBreakdown()} />);
      // Each rank column total: 2/4
      expect(screen.getAllByText('2/4').length).toBe(2);
    });

    it('shows paired column when hasPairs is true', () => {
      render(<TournamentBreakdownView breakdown={clubRankedBreakdown({ hasPairs: true })} />);
      expect(screen.getByText('Paired')).toBeTruthy();
      expect(screen.getAllByText('0%').length).toBe(2);
    });

    it('hides footer totals in captain mode', () => {
      render(<TournamentBreakdownView breakdown={clubRankedBreakdown({ captainMode: true })} />);
      // Captain mode: cells show just filled count, no /capacity
      expect(screen.getAllByText('1').length).toBe(4);
      expect(screen.queryByText('1/2')).toBeNull();
    });
  });

  describe('group breakdown', () => {
    it('renders group bars with labels', () => {
      render(<TournamentBreakdownView breakdown={groupBreakdown()} />);
      expect(screen.getByText('Men')).toBeTruthy();
      expect(screen.getByText('Women')).toBeTruthy();
    });

    it('shows group fill counts', () => {
      render(<TournamentBreakdownView breakdown={groupBreakdown()} />);
      expect(screen.getAllByText('3/4').length).toBe(2);
    });

    it('toggles expanded state on click', () => {
      render(<TournamentBreakdownView breakdown={groupBreakdown()} />);
      expect(screen.getByText('Men')).toBeTruthy();

      fireEvent.click(screen.getByText('4 spots left'));
      expect(screen.queryByText('Men')).toBeNull();

      fireEvent.click(screen.getByText('4 spots left'));
      expect(screen.getByText('Men')).toBeTruthy();
    });
  });

  describe('urgency levels', () => {
    it('applies neutral urgency class', () => {
      render(<TournamentBreakdownView breakdown={simpleBreakdown(makeUrgency('neutral'))} />);
      const text = screen.getByText('4 spots left');
      expect(text.className).toContain('urgency');
    });

    it('applies warning urgency class', () => {
      render(<TournamentBreakdownView breakdown={simpleBreakdown(makeUrgency('warning'))} />);
      const text = screen.getByText('4 spots left');
      expect(text.className).toContain('urgency');
    });

    it('applies success urgency class', () => {
      render(<TournamentBreakdownView breakdown={simpleBreakdown(makeUrgency('success', 'breakdown.full'))} />);
      expect(screen.getByText('Full')).toBeTruthy();
    });

    it('applies danger urgency class', () => {
      render(<TournamentBreakdownView breakdown={simpleBreakdown(makeUrgency('danger', 'breakdown.overbooked'))} />);
      expect(screen.getByText('Overbooked')).toBeTruthy();
    });
  });

  describe('keyboard interaction', () => {
    it('toggles expansion on Enter key', () => {
      render(<TournamentBreakdownView breakdown={clubBreakdown()} />);
      expect(screen.getByText('Club Alpha')).toBeTruthy();

      const footer = screen.getByText('4 spots left').parentElement!;
      fireEvent.keyDown(footer, { key: 'Enter' });
      expect(screen.queryByText('Club Alpha')).toBeNull();
    });

    it('toggles expansion on Space key', () => {
      render(<TournamentBreakdownView breakdown={clubBreakdown()} />);
      expect(screen.getByText('Club Alpha')).toBeTruthy();

      const footer = screen.getByText('4 spots left').parentElement!;
      fireEvent.keyDown(footer, { key: ' ' });
      expect(screen.queryByText('Club Alpha')).toBeNull();
    });
  });
});
