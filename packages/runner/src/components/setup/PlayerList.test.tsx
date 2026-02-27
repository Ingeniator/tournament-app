// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { Player } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { PlayerList } from './PlayerList';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
  }));
}

describe('PlayerList', () => {
  afterEach(cleanup);

  it('shows empty message when no players', () => {
    render(<PlayerList players={[]} onRemove={vi.fn()} />);
    expect(screen.getByText('playerList.empty')).toBeTruthy();
  });

  it('renders player names with numbers', () => {
    render(<PlayerList players={makePlayers(3)} onRemove={vi.fn()} />);
    expect(screen.getByText('Player 1')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
    expect(screen.getByText('Player 3')).toBeTruthy();
  });

  it('renders remove buttons with accessible labels', () => {
    render(<PlayerList players={makePlayers(2)} onRemove={vi.fn()} />);
    expect(screen.getByLabelText('Remove Player 1')).toBeTruthy();
    expect(screen.getByLabelText('Remove Player 2')).toBeTruthy();
  });

  it('calls onRemove with player id when remove is clicked', () => {
    const onRemove = vi.fn();
    render(<PlayerList players={makePlayers(2)} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove Player 1'));
    expect(onRemove).toHaveBeenCalledWith('p0');
  });

  it('shows group toggle buttons for mixicano format', () => {
    const onSetGroup = vi.fn();
    const players = makePlayers(2).map(p => ({ ...p, group: 'A' as const }));
    render(
      <PlayerList
        players={players}
        onRemove={vi.fn()}
        format="mixicano"
        groupLabels={['Men', 'Women']}
        onSetGroup={onSetGroup}
      />,
    );
    expect(screen.getAllByText('Men')).toHaveLength(2);
    expect(screen.getAllByText('Women')).toHaveLength(2);
  });

  it('calls onSetGroup when group button is clicked', () => {
    const onSetGroup = vi.fn();
    const players = makePlayers(1).map(p => ({ ...p, group: 'A' as const }));
    render(
      <PlayerList
        players={players}
        onRemove={vi.fn()}
        format="mixicano"
        groupLabels={['Men', 'Women']}
        onSetGroup={onSetGroup}
      />,
    );
    fireEvent.click(screen.getByText('Women'));
    expect(onSetGroup).toHaveBeenCalledWith('p0', 'B');
  });

  it('enters edit mode when player name is clicked and onRename is provided', () => {
    const onRename = vi.fn();
    render(<PlayerList players={makePlayers(1)} onRemove={vi.fn()} onRename={onRename} />);
    fireEvent.click(screen.getByText('Player 1'));
    const input = screen.getByDisplayValue('Player 1');
    expect(input).toBeTruthy();
  });

  it('calls onRename with new name on Enter', () => {
    const onRename = vi.fn();
    render(<PlayerList players={makePlayers(1)} onRemove={vi.fn()} onRename={onRename} />);
    fireEvent.click(screen.getByText('Player 1'));
    const input = screen.getByDisplayValue('Player 1');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('p0', 'New Name');
  });

  it('does not call onRename if name is unchanged', () => {
    const onRename = vi.fn();
    render(<PlayerList players={makePlayers(1)} onRemove={vi.fn()} onRename={onRename} />);
    fireEvent.click(screen.getByText('Player 1'));
    const input = screen.getByDisplayValue('Player 1');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).not.toHaveBeenCalled();
  });

  it('cancels editing on Escape', () => {
    const onRename = vi.fn();
    render(<PlayerList players={makePlayers(1)} onRemove={vi.fn()} onRename={onRename} />);
    fireEvent.click(screen.getByText('Player 1'));
    const input = screen.getByDisplayValue('Player 1');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Player 1')).toBeTruthy();
  });

  it('does not enter edit mode when onRename is not provided', () => {
    render(<PlayerList players={makePlayers(1)} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('Player 1'));
    expect(screen.queryByDisplayValue('Player 1')).toBeNull();
  });
});
