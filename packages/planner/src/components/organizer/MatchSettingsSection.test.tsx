// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MatchSettingsSection } from './MatchSettingsSection';
import type { PlannerTournament } from '@padel/common';

vi.mock('@padel/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@padel/common')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, params?: Record<string, string | number>) => {
        const map: Record<string, string> = {
          'organizer.matchSettings': 'Match Settings',
          'organizer.scoringMode': 'Scoring mode',
          'organizer.scoringPoints': 'Points',
          'organizer.scoringGames': 'Games',
          'organizer.scoringSets': 'Sets',
          'organizer.scoringTimed': 'Timed',
          'organizer.numberOfRounds': 'Rounds',
          'organizer.pointsPerMatch': 'Points per match',
          'organizer.gamesPerMatch': 'Games per match',
          'organizer.setsPerMatch': 'Sets per match',
          'organizer.minutesPerRound': 'Minutes per round',
          'organizer.estimatedDuration': 'Estimated: ',
          'organizer.somePlayersWontPlay': 'Some players won\'t play',
          'organizer.unequalSitOuts': 'Unequal sit-outs',
          'organizer.gamesModeSuggestion': 'Consider games mode',
        };
        if (map[key]) return map[key];
        // For parameterized keys, just return key with params
        if (params) return `${key}(${JSON.stringify(params)})`;
        return key;
      },
    }),
  };
});

afterEach(cleanup);

function makeTournament(overrides: Partial<PlannerTournament> = {}): PlannerTournament {
  return {
    id: 't1',
    name: 'Test',
    format: 'americano',
    courts: [{ id: 'c1', name: 'Court 1' }],
    maxRounds: 8,
    pointsPerMatch: 24,
    status: 'draft',
    createdBy: 'u1',
    ...overrides,
  } as PlannerTournament;
}

describe('MatchSettingsSection', () => {
  const defaultProps = {
    playerCount: 8,
    confirmedCount: 8,
    capacity: 8,
    updateTournament: vi.fn().mockResolvedValue(undefined),
    showToast: vi.fn(),
  };

  it('renders scoring mode selector and round/points fields', () => {
    render(
      <MatchSettingsSection tournament={makeTournament()} {...defaultProps} />,
    );
    // Collapsed by default — click to open
    fireEvent.click(screen.getByText('Match Settings'));

    expect(screen.getByText('Scoring mode')).toBeDefined();
    expect(screen.getByText('Rounds')).toBeDefined();
    expect(screen.getByText('Points per match')).toBeDefined();
  });

  it('shows games per match label when scoring mode is games', () => {
    render(
      <MatchSettingsSection
        tournament={makeTournament({ scoringMode: 'games' })}
        {...defaultProps}
      />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    expect(screen.getByText('Games per match')).toBeDefined();
  });

  it('shows sets per match label when scoring mode is sets', () => {
    render(
      <MatchSettingsSection
        tournament={makeTournament({ scoringMode: 'sets' })}
        {...defaultProps}
      />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    expect(screen.getByText('Sets per match')).toBeDefined();
  });

  it('shows minutes per round when scoring mode is timed', () => {
    render(
      <MatchSettingsSection
        tournament={makeTournament({ scoringMode: 'timed' })}
        {...defaultProps}
      />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    expect(screen.getByText('Minutes per round')).toBeDefined();
  });

  it('calls updateTournament when scoring mode changes', () => {
    const updateTournament = vi.fn().mockResolvedValue(undefined);
    render(
      <MatchSettingsSection
        tournament={makeTournament()}
        {...defaultProps}
        updateTournament={updateTournament}
      />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    const select = screen.getByDisplayValue('Points');
    fireEvent.change(select, { target: { value: 'timed' } });

    expect(updateTournament).toHaveBeenCalledWith(
      expect.objectContaining({ scoringMode: 'timed' }),
    );
  });

  it('calls updateTournament when rounds value changes', () => {
    const updateTournament = vi.fn().mockResolvedValue(undefined);
    render(
      <MatchSettingsSection
        tournament={makeTournament()}
        {...defaultProps}
        updateTournament={updateTournament}
      />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    const roundsInput = screen.getByDisplayValue('8');
    fireEvent.change(roundsInput, { target: { value: '10' } });

    expect(updateTournament).toHaveBeenCalledWith({ maxRounds: 10 });
  });

  it('clears rounds when input is emptied', () => {
    const updateTournament = vi.fn().mockResolvedValue(undefined);
    render(
      <MatchSettingsSection
        tournament={makeTournament()}
        {...defaultProps}
        updateTournament={updateTournament}
      />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    const roundsInput = screen.getByDisplayValue('8');
    fireEvent.change(roundsInput, { target: { value: '' } });

    expect(updateTournament).toHaveBeenCalledWith({ maxRounds: undefined });
  });

  it('shows estimated duration', () => {
    render(
      <MatchSettingsSection tournament={makeTournament()} {...defaultProps} />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    expect(screen.getByText('Estimated:')).toBeDefined();
  });

  it('shows warning when some players will be excluded', () => {
    // 12 players, 1 court (4 per round), only 1 round — not all can play
    render(
      <MatchSettingsSection
        tournament={makeTournament({ maxRounds: 1 })}
        {...defaultProps}
        playerCount={12}
        confirmedCount={12}
        capacity={12}
      />,
    );
    fireEvent.click(screen.getByText('Match Settings'));

    expect(screen.getByText("Some players won't play")).toBeDefined();
  });
});
