// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  afterEach(cleanup);
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Modal open={false} title="Test" onClose={() => {}}>
        <p>content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders title and children when open', () => {
    render(
      <Modal open={true} title="My Title" onClose={() => {}}>
        <p>Hello world</p>
      </Modal>
    );
    expect(screen.getByText('My Title')).toBeTruthy();
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>content</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>content</p>
      </Modal>
    );
    // The overlay is the outermost div
    fireEvent.click(container.firstChild!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>content</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('content'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
