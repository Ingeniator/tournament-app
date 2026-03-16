// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EditableItem } from './EditableItem';

afterEach(cleanup);

describe('EditableItem', () => {
  it('renders input with name value', () => {
    render(<EditableItem name="Court 1" onChange={() => {}} />);
    const input = screen.getByDisplayValue('Court 1');
    expect(input).toBeDefined();
  });

  it('calls onChange when input changes', () => {
    const onChange = vi.fn();
    render(<EditableItem name="Court 1" onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Court 1'), { target: { value: 'Court 2' } });
    expect(onChange).toHaveBeenCalledWith('Court 2');
  });

  it('shows remove button when onRemove is provided', () => {
    const onRemove = vi.fn();
    render(<EditableItem name="Court 1" onChange={() => {}} onRemove={onRemove} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onRemove).toHaveBeenCalled();
  });

  it('does not show remove button when onRemove is not provided', () => {
    render(<EditableItem name="Court 1" onChange={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders subtitle when provided', () => {
    render(<EditableItem name="Court 1" onChange={() => {}} subtitle={<span>Indoor</span>} />);
    expect(screen.getByText('Indoor')).toBeDefined();
  });

  it('renders icon when provided', () => {
    render(<EditableItem name="Court 1" onChange={() => {}} icon={<span data-testid="icon">IC</span>} />);
    expect(screen.getByTestId('icon')).toBeDefined();
  });
});
