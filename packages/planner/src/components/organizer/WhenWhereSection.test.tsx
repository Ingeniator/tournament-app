// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { WhenWhereSection } from './WhenWhereSection';
import type { PlannerTournament } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'organizer.whenWhere') return 'When & Where';
      if (key === 'organizer.date') return 'Date';
      if (key === 'organizer.time') return 'Time';
      if (key === 'organizer.durationMin') return 'Duration (min)';
      if (key === 'organizer.durationPlaceholder') return '120';
      if (key === 'organizer.place') return 'Place';
      if (key === 'organizer.placePlaceholder') return 'Where?';
      return key;
    },
  }),
}));

afterEach(cleanup);

function makeTournament(overrides: Partial<PlannerTournament> = {}): PlannerTournament {
  return {
    id: 't1',
    name: 'Cup',
    format: 'americano',
    courts: [{ id: 'c1', name: 'Court 1' }],
    organizerId: 'org1',
    code: 'ABC',
    createdAt: 1000,
    players: [],
    clubs: [],
    rankLabels: [],
    rankColors: [],
    captainMode: false,
    maldiciones: false,
    ...overrides,
  } as PlannerTournament;
}

describe('WhenWhereSection', () => {
  it('renders When & Where title', () => {
    render(<WhenWhereSection tournament={makeTournament()} updateTournament={vi.fn()} />);
    expect(screen.getByText('When & Where')).toBeDefined();
  });

  it('starts open when no date or place set', () => {
    render(<WhenWhereSection tournament={makeTournament()} updateTournament={vi.fn()} />);
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Place')).toBeDefined();
  });

  it('starts collapsed when date is set', () => {
    render(
      <WhenWhereSection
        tournament={makeTournament({ date: '2026-06-15T10:00' })}
        updateTournament={vi.fn()}
      />,
    );
    expect(screen.queryByText('Place')).toBeNull();
  });

  it('calls updateTournament with combined date+time on date change', () => {
    const updateTournament = vi.fn();
    render(<WhenWhereSection tournament={makeTournament()} updateTournament={updateTournament} />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });
    expect(updateTournament).toHaveBeenCalledWith({ date: '2026-07-01T12:00' });
  });

  it('calls updateTournament with undefined when date is cleared', () => {
    const updateTournament = vi.fn();
    render(
      <WhenWhereSection
        tournament={makeTournament({ date: '2026-06-15T10:00' })}
        updateTournament={updateTournament}
      />,
    );
    // Open the section
    fireEvent.click(screen.getByText('When & Where'));
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '' } });
    expect(updateTournament).toHaveBeenCalledWith({ date: undefined });
  });

  it('calls updateTournament when place changes', () => {
    const updateTournament = vi.fn();
    render(<WhenWhereSection tournament={makeTournament()} updateTournament={updateTournament} />);
    const placeInput = screen.getByPlaceholderText('Where?');
    fireEvent.change(placeInput, { target: { value: 'Club Padel' } });
    expect(updateTournament).toHaveBeenCalledWith({ place: 'Club Padel' });
  });
});
