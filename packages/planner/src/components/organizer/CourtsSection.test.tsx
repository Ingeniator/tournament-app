// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CourtsSection } from './CourtsSection';
import type { PlannerTournament } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'organizer.courts_section') return 'Courts';
      if (key === 'organizer.courts') return `${params?.count} court(s)`;
      if (key === 'organizer.addCourt') return 'Add Court';
      if (key === 'organizer.extraSpots') return 'Extra Spots';
      if (key === 'organizer.totalSpots') return `Total: ${params?.total}`;
      if (key === 'organizer.courtBonusAuto') return 'bonus pts';
      if (key === 'organizer.extraSuffix') return `+${params?.count}`;
      return key;
    },
  }),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  generateId: () => 'new-id',
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

describe('CourtsSection', () => {
  it('renders Courts title', () => {
    render(<CourtsSection tournament={makeTournament()} updateTournament={vi.fn()} />);
    expect(screen.getByText('Courts')).toBeDefined();
  });

  it('calls updateTournament when Add Court is clicked', async () => {
    const updateTournament = vi.fn();
    render(<CourtsSection tournament={makeTournament()} updateTournament={updateTournament} />);
    fireEvent.click(screen.getByText('Add Court'));
    expect(updateTournament).toHaveBeenCalledWith({
      courts: [
        { id: 'c1', name: 'Court 1' },
        { id: 'new-id', name: 'Court 2' },
      ],
    });
  });

  it('renders court name in editable input', () => {
    render(<CourtsSection tournament={makeTournament()} updateTournament={vi.fn()} />);
    expect(screen.getByDisplayValue('Court 1')).toBeDefined();
  });

  it('calls updateTournament when court name changes', () => {
    const updateTournament = vi.fn();
    render(<CourtsSection tournament={makeTournament()} updateTournament={updateTournament} />);
    fireEvent.change(screen.getByDisplayValue('Court 1'), { target: { value: 'Center Court' } });
    expect(updateTournament).toHaveBeenCalledWith({
      courts: [{ id: 'c1', name: 'Center Court' }],
    });
  });

  it('does not show remove button for single court', () => {
    render(<CourtsSection tournament={makeTournament()} updateTournament={vi.fn()} />);
    // Only the "Add Court" button should exist, no remove button
    const buttons = screen.getAllByRole('button');
    const removeButtons = buttons.filter(b => b.textContent === '×');
    expect(removeButtons).toHaveLength(0);
  });

  it('shows remove button for multiple courts', () => {
    const tournament = makeTournament({
      courts: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
    });
    render(<CourtsSection tournament={tournament} updateTournament={vi.fn()} />);
    // Section starts collapsed with multiple courts, open it first
    fireEvent.click(screen.getByText('Courts'));
    const buttons = screen.getAllByRole('button');
    const removeButtons = buttons.filter(b => b.textContent === '×');
    expect(removeButtons.length).toBeGreaterThan(0);
  });
});
