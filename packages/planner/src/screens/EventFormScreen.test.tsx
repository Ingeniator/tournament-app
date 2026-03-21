// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { EventFormScreen } from './EventFormScreen';

const mockCreateEvent = vi.fn();

vi.mock('../hooks/useEvent', () => ({
  useEvent: () => ({ createEvent: mockCreateEvent }),
}));

vi.mock('@padel/common', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'event.createTitle': 'Create Event',
        'event.name': 'Event name',
        'event.namePlaceholder': 'e.g. Sunday Tournament',
        'event.date': 'Date',
        'event.create': 'Create',
        'event.creating': 'Creating…',
        'event.createFailed': 'Failed to create event',
        'event.back': 'Back',
      };
      return map[key] ?? key;
    },
  }),
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button onClick={onClick} disabled={disabled}>{children}</button>,
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  cleanup();
  mockCreateEvent.mockReset();
});

describe('EventFormScreen', () => {
  it('renders the form fields', () => {
    render(<EventFormScreen uid="u1" onBack={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByText('Create Event')).toBeDefined();
    expect(screen.getByLabelText('Event name')).toBeDefined();
    expect(screen.getByLabelText('Date')).toBeDefined();
    expect(screen.getByText('Create')).toBeDefined();
  });

  it('disables button when name is empty', () => {
    render(<EventFormScreen uid="u1" onBack={vi.fn()} onCreated={vi.fn()} />);

    const btn = screen.getByText('Create') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables button when uid is null', () => {
    render(<EventFormScreen uid={null} onBack={vi.fn()} onCreated={vi.fn()} />);

    const input = screen.getByLabelText('Event name');
    fireEvent.change(input, { target: { value: 'Test Event' } });

    const btn = screen.getByText('Create') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls createEvent and onCreated on submit', async () => {
    mockCreateEvent.mockResolvedValue('evt-123');
    const onCreated = vi.fn();

    render(<EventFormScreen uid="u1" onBack={vi.fn()} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('evt-123'));
    expect(mockCreateEvent).toHaveBeenCalledWith('My Event', expect.any(String), 'u1');
  });

  it('shows error when createEvent fails', async () => {
    mockCreateEvent.mockRejectedValue(new Error('network'));
    const onCreated = vi.fn();

    render(<EventFormScreen uid="u1" onBack={vi.fn()} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Event name'), { target: { value: 'Fail Event' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(screen.getByText('Failed to create event')).toBeDefined());
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<EventFormScreen uid="u1" onBack={onBack} onCreated={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('trims whitespace from name before creating', async () => {
    mockCreateEvent.mockResolvedValue('evt-1');

    render(<EventFormScreen uid="u1" onBack={vi.fn()} onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Event name'), { target: { value: '  Padel Cup  ' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(mockCreateEvent).toHaveBeenCalledWith('Padel Cup', expect.any(String), 'u1'));
  });
});
