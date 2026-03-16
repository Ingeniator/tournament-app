// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { StartWarningModal } from './StartWarningModal';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'startWarning.title') return 'Warning';
      if (key === 'startWarning.alreadyStartedSelf') return 'You already started this tournament';
      if (key === 'startWarning.restartWillErase') return 'Restarting will erase current data';
      if (key === 'startWarning.continueTournament') return 'Continue';
      if (key === 'startWarning.proceedAnyway') return 'Proceed Anyway';
      if (key === 'startWarning.alreadyStarted') return `${params?.name} already started`;
      if (key === 'startWarning.onePersonOnly') return 'Only one person can run';
      if (key === 'startWarning.dataLost') return 'Data will be lost';
      return key;
    },
  }),
  Modal: ({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) =>
    open ? <div data-testid="modal"><h2>{title}</h2><button onClick={onClose}>close</button>{children}</div> : null,
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) =>
    <button onClick={onClick} {...rest}>{children}</button>,
}));

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
});

describe('StartWarningModal', () => {
  const defaultProps = {
    open: true,
    startedBy: { uid: 'other', name: 'Bob', timestamp: 1000 },
    onProceed: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders nothing when closed', () => {
    render(<StartWarningModal {...defaultProps} open={false} reason="different-user" />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows different-user warning', () => {
    render(<StartWarningModal {...defaultProps} reason="different-user" />);
    expect(screen.getByText('Bob already started')).toBeDefined();
    expect(screen.getByText('Only one person can run')).toBeDefined();
    expect(screen.getByText('Proceed Anyway')).toBeDefined();
  });

  it('shows same-user warning with continue and proceed options', () => {
    render(<StartWarningModal {...defaultProps} reason="same-user" />);
    expect(screen.getByText('You already started this tournament')).toBeDefined();
    expect(screen.getByText('Continue')).toBeDefined();
    expect(screen.getByText('Proceed Anyway')).toBeDefined();
  });

  it('calls onProceed when Proceed Anyway is clicked (different-user)', () => {
    const onProceed = vi.fn();
    render(<StartWarningModal {...defaultProps} reason="different-user" onProceed={onProceed} />);
    fireEvent.click(screen.getByText('Proceed Anyway'));
    expect(onProceed).toHaveBeenCalled();
  });

  it('calls onProceed when Proceed Anyway is clicked (same-user)', () => {
    const onProceed = vi.fn();
    render(<StartWarningModal {...defaultProps} reason="same-user" onProceed={onProceed} />);
    fireEvent.click(screen.getByText('Proceed Anyway'));
    expect(onProceed).toHaveBeenCalled();
  });

  it('redirects to /play when Continue is clicked and runner data exists', () => {
    localStorage.setItem('padel-tournament-v1', '{"test":true}');
    let href = '';
    Object.defineProperty(window, 'location', {
      value: { get href() { return href; }, set href(v: string) { href = v; } },
      writable: true,
      configurable: true,
    });

    const onProceed = vi.fn();
    render(<StartWarningModal {...defaultProps} reason="same-user" onProceed={onProceed} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(href).toBe('/play');
    expect(onProceed).not.toHaveBeenCalled();
  });

  it('calls onProceed when Continue is clicked but no runner data', () => {
    const onProceed = vi.fn();
    render(<StartWarningModal {...defaultProps} reason="same-user" onProceed={onProceed} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(onProceed).toHaveBeenCalled();
  });
});
