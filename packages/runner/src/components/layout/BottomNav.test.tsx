// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  afterEach(cleanup);

  it('renders 3 tab buttons', () => {
    render(<BottomNav activeTab="play" onTabChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders tab labels from translation keys', () => {
    render(<BottomNav activeTab="play" onTabChange={vi.fn()} />);
    expect(screen.getByText('nav.play')).toBeTruthy();
    expect(screen.getByText('nav.log')).toBeTruthy();
    expect(screen.getByText('nav.settings')).toBeTruthy();
  });

  it('applies active class to the active tab', () => {
    const { container } = render(<BottomNav activeTab="log" onTabChange={vi.fn()} />);
    const buttons = container.querySelectorAll('button');
    // Second button (log) should have the active class
    expect(buttons[1].className).toContain('active');
    expect(buttons[0].className).not.toContain('active');
    expect(buttons[2].className).not.toContain('active');
  });

  it('calls onTabChange with the clicked tab id', () => {
    const onTabChange = vi.fn();
    render(<BottomNav activeTab="play" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('nav.settings'));
    expect(onTabChange).toHaveBeenCalledWith('settings');
  });
});
