// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CompletedView } from './CompletedView';
import type { PlannerTournament } from '@padel/common';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'organizer.completed') return 'Completed';
      if (key === 'organizer.completedOn') return `Completed on ${params?.date}`;
      if (key === 'organizer.viewResults') return 'View Results';
      if (key === 'organizer.undoComplete') return 'Reopen';
      if (key === 'organizer.deleteTournament') return 'Delete';
      if (key === 'organizer.back') return 'Back';
      if (key === 'organizer.reopenTitle') return 'Reopen Tournament';
      if (key === 'organizer.reopenWarning') return 'Are you sure?';
      if (key === 'organizer.reopenConfirm') return 'Yes, Reopen';
      if (key === 'home.cancel') return 'Cancel';
      if (key === 'organizer.deleteConfirm') return 'Delete?';
      if (key === 'organizer.noBackupData') return 'No backup';
      return key;
    },
  }),
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) =>
    <button onClick={onClick}>{children}</button>,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Modal: ({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) =>
    open ? <div data-testid="modal"><h2>{title}</h2><button onClick={onClose}>close-modal</button>{children}</div> : null,
}));

vi.mock('../../utils/restoreFromBackup', () => ({
  restoreFromBackup: vi.fn().mockResolvedValue(false),
}));

afterEach(cleanup);

const tournament = { id: 't1', name: 'Sunday Cup' } as PlannerTournament;

describe('CompletedView', () => {
  it('renders tournament name and completed status', () => {
    render(
      <CompletedView
        tournament={tournament}
        completedAt={1710600000000}
        undoComplete={vi.fn()}
        deleteTournament={vi.fn()}
        setScreen={vi.fn()}
        showToast={vi.fn()}
      />,
    );
    expect(screen.getByText('Sunday Cup')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('navigates back when back button is clicked', () => {
    const setScreen = vi.fn();
    render(
      <CompletedView
        tournament={tournament}
        completedAt={1710600000000}
        undoComplete={vi.fn()}
        deleteTournament={vi.fn()}
        setScreen={setScreen}
        showToast={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Back'));
    expect(setScreen).toHaveBeenCalledWith('home');
  });

  it('opens reopen modal when Reopen is clicked', () => {
    render(
      <CompletedView
        tournament={tournament}
        completedAt={1710600000000}
        undoComplete={vi.fn()}
        deleteTournament={vi.fn()}
        setScreen={vi.fn()}
        showToast={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('modal')).toBeNull();
    fireEvent.click(screen.getByText('Reopen'));
    expect(screen.getByTestId('modal')).toBeDefined();
    expect(screen.getByText('Reopen Tournament')).toBeDefined();
  });

  it('calls undoComplete when reopen is confirmed', async () => {
    const undoComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <CompletedView
        tournament={tournament}
        completedAt={1710600000000}
        undoComplete={undoComplete}
        deleteTournament={vi.fn()}
        setScreen={vi.fn()}
        showToast={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Reopen'));
    fireEvent.click(screen.getByText('Yes, Reopen'));
    expect(undoComplete).toHaveBeenCalled();
  });

  it('calls deleteTournament when delete is confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteTournament = vi.fn().mockResolvedValue(undefined);
    render(
      <CompletedView
        tournament={tournament}
        completedAt={1710600000000}
        undoComplete={vi.fn()}
        deleteTournament={deleteTournament}
        setScreen={vi.fn()}
        showToast={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(deleteTournament).toHaveBeenCalled();
  });
});
