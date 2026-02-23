// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from '../i18n/context';

// Provide __COMMIT_HASH__ global
vi.stubGlobal('__COMMIT_HASH__', 'abc123');

vi.mock('./OptionsModal', () => ({
  OptionsModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="options-modal">Options</div> : null,
}));

vi.mock('./SupportOverlay', () => ({
  SupportOverlay: ({ open }: { open: boolean }) =>
    open ? <div data-testid="support-overlay">Support</div> : null,
}));

const { AppFooter } = await import('./AppFooter');

import type { TranslationMap } from '../i18n/types';

const translations = {
  en: {
    'footer.freeOpenSource': 'Free & Open Source',
    'footer.madeWithCare': 'Made with care',
    'footer.supportUs': 'Support Us',
    'footer.sendFeedback': 'Send Feedback',
    'footer.options': 'Options',
  } as Record<string, string>,
} as TranslationMap;

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider translations={translations}>{children}</I18nProvider>;
}

describe('AppFooter', () => {
  afterEach(cleanup);

  it('renders footer text', () => {
    render(
      <Wrapper>
        <AppFooter onFeedbackClick={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.getByText(/Free & Open Source/)).toBeTruthy();
    expect(screen.getByText(/Made with care/)).toBeTruthy();
  });

  it('renders 3 buttons: Support, Feedback, Options', () => {
    render(
      <Wrapper>
        <AppFooter onFeedbackClick={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.getByText('Support Us')).toBeTruthy();
    expect(screen.getByText('Send Feedback')).toBeTruthy();
    expect(screen.getByText('Options')).toBeTruthy();
  });

  it('calls onFeedbackClick when Feedback button is clicked', () => {
    const onFeedbackClick = vi.fn();
    render(
      <Wrapper>
        <AppFooter onFeedbackClick={onFeedbackClick} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByText('Send Feedback'));
    expect(onFeedbackClick).toHaveBeenCalledOnce();
  });

  it('opens SupportOverlay when Support button is clicked', () => {
    render(
      <Wrapper>
        <AppFooter onFeedbackClick={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.queryByTestId('support-overlay')).toBeNull();
    fireEvent.click(screen.getByText('Support Us'));
    expect(screen.getByTestId('support-overlay')).toBeTruthy();
  });

  it('opens OptionsModal when Options button is clicked', () => {
    render(
      <Wrapper>
        <AppFooter onFeedbackClick={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.queryByTestId('options-modal')).toBeNull();
    fireEvent.click(screen.getByText('Options'));
    expect(screen.getByTestId('options-modal')).toBeTruthy();
  });

  it('renders version string', () => {
    render(
      <Wrapper>
        <AppFooter onFeedbackClick={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.getByText('v.abc123')).toBeTruthy();
  });
});
