// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { ScoreInput } from './ScoreInput';

describe('ScoreInput', () => {
  afterEach(cleanup);

  it('shows dashes when no score is set', () => {
    render(<ScoreInput score={null} pointsPerMatch={24} onSave={vi.fn()} onClear={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    // First two buttons are the score display buttons
    expect(buttons[0].textContent).toBe('\u2013');
    expect(buttons[1].textContent).toBe('\u2013');
  });

  it('shows score when set', () => {
    render(
      <ScoreInput
        score={{ team1Points: 14, team2Points: 10 }}
        pointsPerMatch={24}
        onSave={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('opens picker when clicking team1 score button', () => {
    render(<ScoreInput score={null} pointsPerMatch={4} onSave={vi.fn()} onClear={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Click team1 score
    // Should show picker values 0..4
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('renders picker values from 0 to pointsPerMatch', () => {
    render(<ScoreInput score={null} pointsPerMatch={6} onSave={vi.fn()} onClear={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    // Should have 7 picker cells (0..6) + cancel button
    for (let i = 0; i <= 6; i++) {
      expect(screen.getByText(String(i))).toBeTruthy();
    }
  });

  it('calls onSave with complement score when picking team1 value', () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    render(<ScoreInput score={null} pointsPerMatch={24} onSave={onSave} onClear={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Open picker for team1
    fireEvent.click(screen.getByText('10')); // Pick 10

    act(() => { vi.advanceTimersByTime(300); });

    expect(onSave).toHaveBeenCalledWith({ team1Points: 10, team2Points: 14 });
    vi.useRealTimers();
  });

  it('shows clear button when score exists and picker is open', () => {
    render(
      <ScoreInput
        score={{ team1Points: 14, team2Points: 10 }}
        pointsPerMatch={24}
        onSave={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('14')); // Open picker
    expect(screen.getByText('score.clear')).toBeTruthy();
  });

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn();
    render(
      <ScoreInput
        score={{ team1Points: 14, team2Points: 10 }}
        pointsPerMatch={24}
        onSave={vi.fn()}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByText('14'));
    fireEvent.click(screen.getByText('score.clear'));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
