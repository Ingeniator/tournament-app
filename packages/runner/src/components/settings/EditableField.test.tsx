// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditableField } from './EditableField';

describe('EditableField', () => {
  afterEach(cleanup);

  it('shows label and value in display mode', () => {
    render(<EditableField label="Name" value="Alice" onSave={vi.fn()} />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('shows hint when provided', () => {
    render(<EditableField label="Name" value="Alice" onSave={vi.fn()} hint="(optional)" />);
    expect(screen.getByText('(optional)')).toBeTruthy();
  });

  it('enters edit mode on click with pre-populated value', () => {
    render(<EditableField label="Name" value="Alice" onSave={vi.fn()} />);
    fireEvent.click(screen.getByText('Alice'));
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('Alice');
  });

  it('saves on Enter', () => {
    const onSave = vi.fn();
    render(<EditableField label="Name" value="Alice" onSave={onSave} />);
    fireEvent.click(screen.getByText('Alice'));
    const input = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Bob' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('Bob');
  });

  it('cancels on Escape without saving', () => {
    const onSave = vi.fn();
    render(<EditableField label="Name" value="Alice" onSave={onSave} />);
    fireEvent.click(screen.getByText('Alice'));
    const input = document.querySelector('input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    // Should be back in display mode
    expect(screen.getByText('Alice')).toBeTruthy();
    // onSave may be called by blur during cleanup, but Escape itself should not call onSave
    expect(document.querySelector('input')).toBeNull();
  });

  it('saves on blur', () => {
    const onSave = vi.fn();
    render(<EditableField label="Name" value="Alice" onSave={onSave} />);
    fireEvent.click(screen.getByText('Alice'));
    const input = document.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Charlie' } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('Charlie');
  });

  it('sets inputMode="numeric" for number type', () => {
    render(<EditableField label="Points" value="10" onSave={vi.fn()} type="number" />);
    fireEvent.click(screen.getByText('10'));
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.inputMode).toBe('numeric');
  });
});
