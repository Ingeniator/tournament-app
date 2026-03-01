// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@padel/common', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
  parsePlayerList: (text: string) =>
    text.split(/[\n,]/).map((l: string) => l.trim()).filter(Boolean),
}));

import { PlayerInput } from './PlayerInput';

describe('PlayerInput', () => {
  afterEach(cleanup);

  it('renders input and submit button', () => {
    render(<PlayerInput onAdd={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('submit button is disabled when input is empty', () => {
    render(<PlayerInput onAdd={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('calls onAdd and clears input on submit', () => {
    const onAdd = vi.fn();
    render(<PlayerInput onAdd={onAdd} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.submit(input.closest('form')!);
    expect(onAdd).toHaveBeenCalledWith('Alice');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('triggers onBulkAdd for multi-line paste', () => {
    const onBulkAdd = vi.fn();
    render(<PlayerInput onAdd={vi.fn()} onBulkAdd={onBulkAdd} />);
    const input = screen.getByRole('textbox');
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'Alice\nBob\nCharlie' },
    });
    expect(onBulkAdd).toHaveBeenCalledWith(['Alice', 'Bob', 'Charlie']);
  });

  it('does not trigger onBulkAdd for single-line paste', () => {
    const onBulkAdd = vi.fn();
    render(<PlayerInput onAdd={vi.fn()} onBulkAdd={onBulkAdd} />);
    const input = screen.getByRole('textbox');
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'Alice' },
    });
    expect(onBulkAdd).not.toHaveBeenCalled();
  });

  it('triggers onBulkAdd for comma-separated paste', () => {
    const onBulkAdd = vi.fn();
    render(<PlayerInput onAdd={vi.fn()} onBulkAdd={onBulkAdd} />);
    const input = screen.getByRole('textbox');
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'Alice, Bob, Charlie' },
    });
    expect(onBulkAdd).toHaveBeenCalledWith(['Alice', 'Bob', 'Charlie']);
  });

  it('triggers onBulkAdd on submit when input has commas', () => {
    const onAdd = vi.fn();
    const onBulkAdd = vi.fn();
    render(<PlayerInput onAdd={onAdd} onBulkAdd={onBulkAdd} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Alice, Bob' } });
    fireEvent.submit(input.closest('form')!);
    expect(onBulkAdd).toHaveBeenCalledWith(['Alice', 'Bob']);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
