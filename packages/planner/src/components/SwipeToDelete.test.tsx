// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SwipeToDelete } from './SwipeToDelete';

afterEach(cleanup);

describe('SwipeToDelete', () => {
  it('renders children', () => {
    render(
      <SwipeToDelete onDelete={() => {}}>
        <span>Player 1</span>
      </SwipeToDelete>,
    );
    expect(screen.getByText('Player 1')).toBeDefined();
  });

  it('renders delete button with default label', () => {
    render(
      <SwipeToDelete onDelete={() => {}}>
        <span>Content</span>
      </SwipeToDelete>,
    );
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('renders delete button with custom label', () => {
    render(
      <SwipeToDelete onDelete={() => {}} label="Remove">
        <span>Content</span>
      </SwipeToDelete>,
    );
    expect(screen.getByText('Remove')).toBeDefined();
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <SwipeToDelete onDelete={onDelete}>
        <span>Content</span>
      </SwipeToDelete>,
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
