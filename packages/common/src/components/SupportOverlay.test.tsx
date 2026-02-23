// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { I18nProvider } from '../i18n/context';
import type { ReactNode } from 'react';

const mockSayThanks = vi.fn(() => Promise.resolve());
let mockReturnValue = {
  supporters: [] as Array<{ id: string; name: string; amount?: number; timestamp: number }>,
  grouped: [] as Array<{ name: string; totalAmount: number; count: number; message?: string }>,
  loading: false,
  sayThanks: mockSayThanks,
};

vi.mock('../hooks/useSupporters', () => ({
  useSupporters: () => mockReturnValue,
  getSavedName: () => '',
}));

// Must import after vi.mock
const { SupportOverlay } = await import('./SupportOverlay');

const translations = {
  en: {
    'support.title': 'Support Us',
    'support.helpKeepFree': 'Help keep it free',
    'support.description': 'Description text',
    'support.yourName': 'Your name',
    'support.leaveMessage': 'Leave a message',
    'support.support': 'Support',
    'support.supporters': 'Supporters',
    'support.beFirst': 'Be the first!',
    'support.thankYou': 'Thank you!',
    'support.testingFlow': 'Testing flow',
  } as Record<string, string>,
};

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider translations={translations}>{children}</I18nProvider>;
}

describe('SupportOverlay', () => {
  let onClose: ReturnType<typeof vi.fn>;

  afterEach(cleanup);

  beforeEach(() => {
    onClose = vi.fn();
    mockSayThanks.mockClear();
    mockReturnValue = {
      supporters: [],
      grouped: [],
      loading: false,
      sayThanks: mockSayThanks,
    };
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <Wrapper>
        <SupportOverlay open={false} onClose={onClose} />
      </Wrapper>
    );
    expect(container.querySelector('h3')).toBeNull();
  });

  it('renders title and form when open', () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    expect(screen.getByText('Support Us')).toBeTruthy();
    expect(screen.getByText('Help keep it free')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Leave a message')).toBeTruthy();
  });

  it('renders amount buttons', () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    expect(screen.getByText('3\u20AC')).toBeTruthy();
    expect(screen.getByText('5\u20AC')).toBeTruthy();
    expect(screen.getByText('10\u20AC')).toBeTruthy();
  });

  it('disables support button when name is empty', () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    const btn = screen.getByText('Support');
    expect(btn.closest('button')!.disabled).toBe(true);
  });

  it('enables support button when name is entered', () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Alice' },
    });
    const btn = screen.getByText('Support');
    expect(btn.closest('button')!.disabled).toBe(false);
  });

  it('calls sayThanks with default amount and no message', async () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Alice' },
    });
    fireEvent.click(screen.getByText('Support'));

    expect(mockSayThanks).toHaveBeenCalledWith('Alice', 0, undefined);
  });

  it('calls sayThanks with selected amount and message', async () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Bob' },
    });
    fireEvent.click(screen.getByText('5\u20AC'));
    fireEvent.change(screen.getByPlaceholderText('Leave a message'), {
      target: { value: 'Great app!' },
    });
    fireEvent.click(screen.getByText('Support'));

    expect(mockSayThanks).toHaveBeenCalledWith('Bob', 5, 'Great app!');
  });

  it('shows confirmation after successful submit', async () => {
    vi.useFakeTimers();

    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Alice' },
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Support'));
    });

    expect(screen.getByText('Thank you!')).toBeTruthy();
    expect(screen.getByText('Testing flow')).toBeTruthy();
    // Form should be replaced by confirmation
    expect(screen.queryByPlaceholderText('Your name')).toBeNull();

    // Confirmation disappears after 3 seconds
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText('Thank you!')).toBeNull();
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();

    vi.useRealTimers();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find(b => b.textContent === '\u2715');
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows empty supporters message', () => {
    render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );
    expect(screen.getByText('Be the first!')).toBeTruthy();
  });

  it('renders supporter list with amounts and counts', () => {
    mockReturnValue = {
      supporters: [
        { id: '1', name: 'Alice', amount: 5, timestamp: 1000 },
        { id: '2', name: 'Bob', amount: 0, timestamp: 2000 },
      ],
      grouped: [
        { name: 'Alice', totalAmount: 10, count: 2, message: 'Love it!' },
        { name: 'Bob', totalAmount: 0, count: 1 },
      ],
      loading: false,
      sayThanks: mockSayThanks,
    };

    const { container } = render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );

    // Supporter names rendered in the list
    const items = container.querySelectorAll('[class*="supporterItem"]');
    expect(items).toHaveLength(2);

    // First supporter: Alice with 10€ x2 and a message
    const alice = items[0];
    expect(alice.querySelector('[class*="supporterName"]')!.textContent).toBe('Alice');
    expect(alice.querySelector('[class*="supporterAmount"]')!.textContent).toBe('10\u20AC \u00D72');
    expect(alice.querySelector('[class*="supporterMessage"]')!.textContent).toBe('Love it!');

    // Second supporter: Bob with heart (0€) and no message
    const bob = items[1];
    expect(bob.querySelector('[class*="supporterName"]')!.textContent).toBe('Bob');
    expect(bob.querySelector('[class*="supporterAmount"]')!.textContent).toBe('\u2764\uFE0F');
    expect(bob.querySelector('[class*="supporterMessage"]')).toBeNull();

    // "Be the first" should not show when there are supporters
    expect(screen.queryByText('Be the first!')).toBeNull();
  });

  it('shows wall header with totals when supporters exist', () => {
    mockReturnValue = {
      supporters: [
        { id: '1', name: 'Alice', amount: 5, timestamp: 1000 },
        { id: '2', name: 'Bob', amount: 0, timestamp: 2000 },
      ],
      grouped: [
        { name: 'Alice', totalAmount: 5, count: 1 },
        { name: 'Bob', totalAmount: 0, count: 1 },
      ],
      loading: false,
      sayThanks: mockSayThanks,
    };

    const { container } = render(
      <Wrapper>
        <SupportOverlay open={true} onClose={onClose} />
      </Wrapper>
    );

    const wallHeader = container.querySelector('[class*="wallHeader"]');
    expect(wallHeader).toBeTruthy();
    expect(wallHeader!.textContent).toContain('Supporters');
    expect(wallHeader!.textContent).toContain('5\u20AC');
    expect(wallHeader!.textContent).toContain('1 \u2764\uFE0F');
  });
});
