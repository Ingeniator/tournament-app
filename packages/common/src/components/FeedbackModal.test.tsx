// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { FeedbackModal } from './FeedbackModal';
import { I18nProvider } from '../i18n/context';
import type { ReactNode } from 'react';

import type { TranslationMap } from '../i18n/types';

const translations = {
  en: {
    'feedback.title': 'Feedback',
    'feedback.placeholder': 'Your feedback...',
    'feedback.send': 'Send',
    'feedback.sending': 'Sending...',
  } as Record<string, string>,
} as TranslationMap;

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider translations={translations}>{children}</I18nProvider>;
}

describe('FeedbackModal', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSubmit: ReturnType<typeof vi.fn>;

  afterEach(cleanup);

  beforeEach(() => {
    onClose = vi.fn();
    onSubmit = vi.fn(() => Promise.resolve());
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <Wrapper>
        <FeedbackModal open={false} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('renders textarea and send button when open', () => {
    render(
      <Wrapper>
        <FeedbackModal open={true} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    expect(screen.getByText('Feedback')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your feedback...')).toBeTruthy();
    expect(screen.getByText('Send')).toBeTruthy();
  });

  it('disables send when textarea is empty', () => {
    render(
      <Wrapper>
        <FeedbackModal open={true} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    const btn = screen.getByText('Send');
    expect(btn.closest('button')!.disabled).toBe(true);
  });

  it('enables send when textarea has text', () => {
    render(
      <Wrapper>
        <FeedbackModal open={true} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    fireEvent.change(screen.getByPlaceholderText('Your feedback...'), {
      target: { value: 'Great app!' },
    });
    const btn = screen.getByText('Send');
    expect(btn.closest('button')!.disabled).toBe(false);
  });

  it('calls onSubmit with trimmed message and closes on success', async () => {
    render(
      <Wrapper>
        <FeedbackModal open={true} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    fireEvent.change(screen.getByPlaceholderText('Your feedback...'), {
      target: { value: '  Nice work!  ' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Nice work!');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('shows character count', () => {
    render(
      <Wrapper>
        <FeedbackModal open={true} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    expect(screen.getByText('0 / 500')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Your feedback...'), {
      target: { value: 'Hello' },
    });
    expect(screen.getByText('5 / 500')).toBeTruthy();
  });

  it('disables send when message exceeds max length', () => {
    render(
      <Wrapper>
        <FeedbackModal open={true} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    const longText = 'a'.repeat(501);
    fireEvent.change(screen.getByPlaceholderText('Your feedback...'), {
      target: { value: longText },
    });
    const btn = screen.getByText('Send');
    expect(btn.closest('button')!.disabled).toBe(true);
  });

  it('does not close while submission is in progress', async () => {
    let resolveSubmit!: () => void;
    onSubmit = vi.fn(() => new Promise<void>(r => { resolveSubmit = r; }));

    render(
      <Wrapper>
        <FeedbackModal open={true} onClose={onClose} onSubmit={onSubmit} />
      </Wrapper>
    );
    fireEvent.change(screen.getByPlaceholderText('Your feedback...'), {
      target: { value: 'test' },
    });
    fireEvent.click(screen.getByText('Send'));

    // While sending, the button should show "Sending..." and close should be blocked
    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeTruthy();
    });

    // Try to close via the close button — should be blocked
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find(b => b.textContent === '\u2715');
    fireEvent.click(closeBtn!);
    expect(onClose).not.toHaveBeenCalled();

    // Resolve the submission
    resolveSubmit();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
