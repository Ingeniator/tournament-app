// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FormatSection } from './FormatSection';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'organizer.formatSection': 'Format',
        'organizer.format': 'Format',
        'organizer.formatMexicano': 'Mexicano',
        'organizer.groupLabels': 'Group labels',
        'organizer.groupLabelAPlaceholder': 'Group A',
        'organizer.groupLabelBPlaceholder': 'Group B',
        'organizer.clubs': `Clubs (${params?.count ?? 0})`,
        'organizer.addClub': 'Add club',
        'organizer.noClub': 'No clubs',
        'organizer.modesSubtitle': 'Modes',
        'organizer.maldicionesEnabled': 'Maldiciones',
        'organizer.maldicionesHint': 'Add chaos to your tournament',
        'organizer.chaosLevel': 'Chaos level',
        'organizer.chaosLite': 'Lite',
        'organizer.chaosMedium': 'Medium',
        'organizer.chaosHardcore': 'Hardcore',
        'organizer.captainMode': 'Captain mode',
        'organizer.captainModeHint': 'Each club picks a captain',
        'organizer.rankLabels': 'Rank labels',
        'format.americano': 'Americano',
        'format.mexicano': 'Mexicano',
        'format.mixicano': 'Mixicano',
        'format.club-americano': 'Club Americano',
      };
      return map[key] ?? key;
    },
  }),
  getPresetByFormat: (format: string) => {
    const presets: Record<string, { nameKey: string }> = {
      americano: { nameKey: 'format.americano' },
      mexicano: { nameKey: 'format.mexicano' },
      mixicano: { nameKey: 'format.mixicano' },
      'club-americano': { nameKey: 'format.club-americano' },
    };
    return presets[format] ?? null;
  },
  formatHasGroups: (f: string) => f === 'mixicano',
  formatHasClubs: (f: string) => f.startsWith('club-'),
  formatHasFixedPartners: (f: string) => ['americano', 'team-americano', 'team-mexicano'].includes(f),
  FormatPicker: ({ format, onChange }: { format: string; onChange: (f: string) => void }) => (
    <select data-testid="format-picker" value={format} onChange={e => onChange(e.target.value)}>
      <option value="americano">Americano</option>
      <option value="mexicano">Mexicano</option>
      <option value="mixicano">Mixicano</option>
      <option value="club-americano">Club Americano</option>
    </select>
  ),
  NO_COLOR: 'none',
  CLUB_COLORS: ['none', '#ff0000', '#0000ff', '#00ff00'],
  RANK_COLORS: [{ bg: 'none', border: 'none' }, { bg: '#gold', border: '#gold' }],
  getClubColor: (club: { color?: string }) => club.color ?? 'none',
  getRankColor: (i: number) => ({ bg: 'none', border: 'none' }),
  cycleColor: () => 1,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  generateId: () => 'new-id',
}));

vi.mock('./CollapsibleSection', () => ({
  CollapsibleSection: ({ title, children }: { title: string; summary?: string; defaultOpen?: boolean; children: React.ReactNode }) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}));

vi.mock('./EditableItem', () => ({
  EditableItem: ({ name, onRemove, icon, subtitle }: { name: string; onChange: (n: string) => void; onRemove?: () => void; icon?: React.ReactNode; subtitle?: React.ReactNode }) => (
    <div data-testid="editable-item">
      {icon}
      <span>{name}</span>
      {onRemove && <button onClick={onRemove}>Remove</button>}
      {subtitle}
    </div>
  ),
}));

afterEach(cleanup);

function makeTournament(overrides: Partial<PlannerTournament> = {}): PlannerTournament {
  return {
    id: 't1',
    name: 'Test',
    format: 'americano',
    courts: [{ id: 'c1', name: 'Court 1' }],
    status: 'draft',
    createdBy: 'u1',
    ...overrides,
  } as PlannerTournament;
}

const players: PlannerRegistration[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
] as PlannerRegistration[];

describe('FormatSection', () => {
  it('renders format picker with current format', () => {
    render(
      <FormatSection
        tournament={makeTournament()}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    // "Format" appears in section title and label
    expect(screen.getAllByText('Format').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('format-picker')).toBeDefined();
  });

  it('calls updateTournament when format changes', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    render(
      <FormatSection
        tournament={makeTournament()}
        players={players}
        capacity={8}
        updateTournament={update}
      />,
    );

    fireEvent.change(screen.getByTestId('format-picker'), { target: { value: 'mexicano' } });
    expect(update).toHaveBeenCalledWith({ format: 'mexicano' });
  });

  it('shows group labels for mixicano format', () => {
    render(
      <FormatSection
        tournament={makeTournament({ format: 'mixicano' })}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    expect(screen.getByText('Group labels')).toBeDefined();
    expect(screen.getByPlaceholderText('Group A')).toBeDefined();
    expect(screen.getByPlaceholderText('Group B')).toBeDefined();
  });

  it('does not show group labels for non-mixicano formats', () => {
    render(
      <FormatSection
        tournament={makeTournament({ format: 'americano' })}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    expect(screen.queryByText('Group labels')).toBeNull();
  });

  it('shows maldiciones toggle for americano (fixed partners)', () => {
    render(
      <FormatSection
        tournament={makeTournament({ format: 'americano' })}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    expect(screen.getByText('Maldiciones')).toBeDefined();
  });

  it('does not show maldiciones for mexicano (no fixed partners)', () => {
    render(
      <FormatSection
        tournament={makeTournament({ format: 'mexicano' })}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    expect(screen.queryByText('Maldiciones')).toBeNull();
  });

  it('enables maldiciones and calls updateTournament', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    render(
      <FormatSection
        tournament={makeTournament({ format: 'americano' })}
        players={players}
        capacity={8}
        updateTournament={update}
      />,
    );

    fireEvent.click(screen.getByText('Maldiciones'));
    expect(update).toHaveBeenCalledWith({
      maldiciones: { enabled: true, chaosLevel: 'medium' },
    });
  });

  it('shows chaos level selector when maldiciones is enabled', () => {
    render(
      <FormatSection
        tournament={makeTournament({
          format: 'americano',
          maldiciones: { enabled: true, chaosLevel: 'medium' },
        })}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    expect(screen.getByText('Chaos level')).toBeDefined();
    expect(screen.getByText('Lite')).toBeDefined();
    expect(screen.getByText('Medium')).toBeDefined();
    expect(screen.getByText('Hardcore')).toBeDefined();
  });

  it('shows club management for club formats', () => {
    render(
      <FormatSection
        tournament={makeTournament({
          format: 'club-americano',
          clubs: [
            { id: 'c1', name: 'Alpha', color: '#ff0000' },
            { id: 'c2', name: 'Bravo', color: '#0000ff' },
          ],
        })}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    expect(screen.getByText('Add club')).toBeDefined();
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Bravo')).toBeDefined();
  });

  it('adds a new club when Add club is clicked', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    render(
      <FormatSection
        tournament={makeTournament({
          format: 'club-americano',
          clubs: [{ id: 'c1', name: 'Alpha', color: '#ff0000' }],
        })}
        players={players}
        capacity={8}
        updateTournament={update}
      />,
    );

    fireEvent.click(screen.getByText('Add club'));
    expect(update).toHaveBeenCalledWith({
      clubs: expect.arrayContaining([
        expect.objectContaining({ id: 'c1', name: 'Alpha' }),
        expect.objectContaining({ id: 'new-id', name: 'Club 2' }),
      ]),
    });
  });

  it('shows captain mode toggle for club formats', () => {
    render(
      <FormatSection
        tournament={makeTournament({ format: 'club-americano', clubs: [] })}
        players={players}
        capacity={8}
        updateTournament={vi.fn()}
      />,
    );

    expect(screen.getByText('Captain mode')).toBeDefined();
  });

  it('updates group label A', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    render(
      <FormatSection
        tournament={makeTournament({ format: 'mixicano' })}
        players={players}
        capacity={8}
        updateTournament={update}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Group A'), { target: { value: 'Men' } });
    expect(update).toHaveBeenCalledWith({ groupLabels: ['Men', ''] });
  });
});
