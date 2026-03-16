// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DetailsSection } from './DetailsSection';
import type { PlannerTournament } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'organizer.details') return 'Details';
      if (key === 'organizer.groupChat') return 'Group Chat';
      if (key === 'organizer.groupChatPlaceholder') return 'https://...';
      if (key === 'organizer.description') return 'Description';
      if (key === 'organizer.descriptionPlaceholder') return 'Add a description...';
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

describe('DetailsSection', () => {
  it('renders Details title', () => {
    render(<DetailsSection tournament={makeTournament()} updateTournament={vi.fn()} />);
    expect(screen.getByText('Details')).toBeDefined();
  });

  it('starts open when no details exist', () => {
    render(<DetailsSection tournament={makeTournament()} updateTournament={vi.fn()} />);
    // Should be open by default (no chatLink or description)
    expect(screen.getByText('Group Chat')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
  });

  it('starts collapsed when details exist', () => {
    render(
      <DetailsSection
        tournament={makeTournament({ chatLink: 'https://t.me/group' })}
        updateTournament={vi.fn()}
      />,
    );
    // Collapsed, so labels should not be visible (only summary)
    expect(screen.queryByText('Description')).toBeNull();
  });

  it('calls updateTournament when chat link changes', () => {
    const updateTournament = vi.fn();
    render(<DetailsSection tournament={makeTournament()} updateTournament={updateTournament} />);
    const input = screen.getByPlaceholderText('https://...');
    fireEvent.change(input, { target: { value: 'https://t.me/test' } });
    expect(updateTournament).toHaveBeenCalledWith({ chatLink: 'https://t.me/test' });
  });

  it('calls updateTournament with undefined when chat link is cleared', () => {
    const updateTournament = vi.fn();
    render(
      <DetailsSection
        tournament={makeTournament({ chatLink: 'https://old' })}
        updateTournament={updateTournament}
      />,
    );
    // Open the section first
    fireEvent.click(screen.getByText('Details'));
    const input = screen.getByPlaceholderText('https://...');
    fireEvent.change(input, { target: { value: '' } });
    expect(updateTournament).toHaveBeenCalledWith({ chatLink: undefined });
  });
});
