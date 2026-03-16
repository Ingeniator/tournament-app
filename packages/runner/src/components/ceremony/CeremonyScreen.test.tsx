// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { Nomination } from '@padel/common';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'ceremony.skip') return 'Skip';
      if (key === 'ceremony.tapToReveal') return 'Tap to reveal';
      if (key === 'ceremony.tapForNext') return 'Tap for next';
      if (key === 'ceremony.tapToFinish') return 'Tap to finish';
      return key;
    },
  }),
}));

import { CeremonyScreen } from './CeremonyScreen';

// ── Helpers ────────────────────────────────────────────────────

function makeNomination(overrides: Partial<Nomination> = {}): Nomination {
  return {
    id: 'award-1',
    title: 'Best Scorer',
    emoji: '🏆',
    description: 'Most points scored',
    playerIds: ['p1'],
    playerNames: ['Player 1'],
    stat: '42 points',
    ...overrides,
  };
}

function makePodiumNominations(): Nomination[] {
  return [
    makeNomination({ id: 'podium-1', title: 'Champion', emoji: '🥇', playerNames: ['Player 1'], stat: '100 pts' }),
    makeNomination({ id: 'podium-2', title: 'Silver', emoji: '🥈', playerNames: ['Player 2'], stat: '90 pts' }),
    makeNomination({ id: 'podium-3', title: 'Bronze', emoji: '🥉', playerNames: ['Player 3'], stat: '80 pts' }),
  ];
}

// ── Tests ──────────────────────────────────────────────────────

describe('CeremonyScreen', () => {
  afterEach(cleanup);

  it('renders nothing when nominations are empty', () => {
    const onComplete = vi.fn();
    const { container } = render(<CeremonyScreen nominations={[]} onComplete={onComplete} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders first nomination category', () => {
    const nominations = [makeNomination()];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);
    expect(screen.getByText('Best Scorer')).toBeTruthy();
    expect(screen.getByText('Most points scored')).toBeTruthy();
    expect(screen.getByText('Tap to reveal')).toBeTruthy();
  });

  it('shows progress counter', () => {
    const nominations = [makeNomination(), makeNomination({ id: 'award-2', title: 'Other' })];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('reveals winner on first tap', () => {
    const nominations = [makeNomination()];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);

    // Tap overlay to reveal
    fireEvent.click(screen.getByText('Tap to reveal').closest('[class]')!.parentElement!.parentElement!);
    expect(screen.getByText('Player 1')).toBeTruthy();
    expect(screen.getByText('42 points')).toBeTruthy();
  });

  it('calls onComplete after last nomination is tapped through', () => {
    const onComplete = vi.fn();
    const nominations = [makeNomination()];
    render(<CeremonyScreen nominations={nominations} onComplete={onComplete} />);

    // Find the overlay (outermost click target)
    const overlay = screen.getByText('Tap to reveal').closest('[class]')!.parentElement!.parentElement!;

    // Tap 1: reveal winner
    fireEvent.click(overlay);
    expect(screen.getByText('Tap to finish')).toBeTruthy();

    // Tap 2: complete
    fireEvent.click(overlay);
    expect(onComplete).toHaveBeenCalledWith(nominations);
  });

  it('advances to next nomination after reveal + tap', () => {
    const nominations = [
      makeNomination({ id: 'award-1', title: 'Best Scorer' }),
      makeNomination({ id: 'award-2', title: 'Most Aces' }),
    ];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);

    const overlay = screen.getByText('Tap to reveal').closest('[class]')!.parentElement!.parentElement!;

    // Tap 1: reveal first
    fireEvent.click(overlay);
    expect(screen.getByText('Tap for next')).toBeTruthy();

    // Tap 2: advance to second
    fireEvent.click(overlay);
    expect(screen.getByText('Most Aces')).toBeTruthy();
    expect(screen.getByText('2 / 2')).toBeTruthy();
  });

  it('skips ceremony and calls onComplete', () => {
    const onComplete = vi.fn();
    const nominations = [makeNomination(), makeNomination({ id: 'award-2' })];
    render(<CeremonyScreen nominations={nominations} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Skip'));
    expect(onComplete).toHaveBeenCalledWith(nominations);
  });

  it('renders podium nominations in reverse order (bronze → silver → champion)', () => {
    const onComplete = vi.fn();
    const nominations = makePodiumNominations();
    render(<CeremonyScreen nominations={nominations} onComplete={onComplete} />);

    // buildCeremonyOrder puts podium in reverse: 3 → 2 → 1
    expect(screen.getByText('Bronze')).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();
  });

  it('renders non-podium awards before podium', () => {
    const nonPodium = makeNomination({ id: 'lucky', title: 'Lucky One' });
    const nominations = [...makePodiumNominations(), nonPodium];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);

    // Lucky appears first (non-podium before podium)
    expect(screen.getByText('Lucky One')).toBeTruthy();
    expect(screen.getByText('1 / 4')).toBeTruthy();
  });

  it('renders multi-player nomination with ampersand', () => {
    const nominations = [makeNomination({
      playerNames: ['Alice', 'Bob'],
    })];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);

    const overlay = screen.getByText('Tap to reveal').closest('[class]')!.parentElement!.parentElement!;
    fireEvent.click(overlay);

    expect(screen.getByText(/Alice/)).toBeTruthy();
    expect(screen.getByText(/Bob/)).toBeTruthy();
  });

  it('shows tier badge for legendary nominations', () => {
    const nominations = [makeNomination({ tier: 'legendary' })];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);
    expect(screen.getByText('LEGENDARY')).toBeTruthy();
  });

  it('shows tier badge for rare nominations', () => {
    const nominations = [makeNomination({ tier: 'rare' })];
    render(<CeremonyScreen nominations={nominations} onComplete={vi.fn()} />);
    expect(screen.getByText('RARE')).toBeTruthy();
  });
});
