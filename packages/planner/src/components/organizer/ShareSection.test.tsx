// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ShareSection } from './ShareSection';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'organizer.shareWithPlayers') return 'Share with Players';
      if (key === 'organizer.playersEnterCode') return 'Players can enter this code';
      if (key === 'organizer.copyLink') return 'Copy Link';
      if (key === 'organizer.linkCopied') return 'Link copied!';
      if (key === 'organizer.codeCopied') return 'Code copied!';
      if (key === 'organizer.failedCopy') return 'Failed to copy';
      if (key === 'organizer.startDelegate') return 'Start Delegate';
      if (key === 'organizer.startDelegateOnlyMe') return 'Only me';
      if (key === 'organizer.startDelegateTelegram') return 'Telegram user';
      if (key === 'organizer.startDelegateTelegramPlaceholder') return '@username';
      return key;
    },
    locale: 'en',
  }),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

beforeEach(() => {
  Object.defineProperty(window, 'Telegram', { value: undefined, writable: true, configurable: true });
});

const tournament = {
  id: 't1',
  name: 'Cup',
  code: 'ABC123',
} as PlannerTournament;

const players: PlannerRegistration[] = [
  { id: 'p1', name: 'Alice', confirmed: true, timestamp: 1000 },
  { id: 'p2', name: 'Bob', confirmed: true, timestamp: 2000 },
] as PlannerRegistration[];

describe('ShareSection', () => {
  it('renders tournament code', () => {
    render(
      <ShareSection
        tournament={tournament}
        players={players}
        uid="p1"
        updateTournament={vi.fn()}
        showToast={vi.fn()}
      />,
    );
    expect(screen.getByText('ABC123')).toBeDefined();
  });

  it('renders share title and copy link button', () => {
    render(
      <ShareSection
        tournament={tournament}
        players={players}
        uid="p1"
        updateTournament={vi.fn()}
        showToast={vi.fn()}
      />,
    );
    expect(screen.getByText('Share with Players')).toBeDefined();
    expect(screen.getByText('Copy Link')).toBeDefined();
  });

  it('copies link to clipboard on Copy Link click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const showToast = vi.fn();

    render(
      <ShareSection
        tournament={tournament}
        players={players}
        uid="p1"
        updateTournament={vi.fn()}
        showToast={showToast}
      />,
    );
    fireEvent.click(screen.getByText('Copy Link'));
    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Link copied!');
    });
  });

  it('shows delegate select with players excluding current user', () => {
    render(
      <ShareSection
        tournament={tournament}
        players={players}
        uid="p1"
        updateTournament={vi.fn()}
        showToast={vi.fn()}
      />,
    );
    // Bob should be in the dropdown (not Alice since uid=p1)
    const select = screen.getByRole('combobox');
    expect(select).toBeDefined();
    // Check options
    const options = screen.getAllByRole('option');
    const optionTexts = options.map(o => o.textContent);
    expect(optionTexts).toContain('Only me');
    expect(optionTexts).toContain('Bob');
    expect(optionTexts).not.toContain('Alice');
  });

  it('calls updateTournament when delegate is changed to a player', () => {
    const updateTournament = vi.fn();
    render(
      <ShareSection
        tournament={tournament}
        players={players}
        uid="p1"
        updateTournament={updateTournament}
        showToast={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'player:p2' } });
    expect(updateTournament).toHaveBeenCalledWith({
      startDelegateId: 'p2',
      startDelegateTelegram: undefined,
    });
  });
});
