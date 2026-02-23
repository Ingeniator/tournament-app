// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard } from './clipboard';

describe('copyToClipboard', () => {
  beforeEach(() => {
    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn() },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when clipboard API succeeds', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    expect(await copyToClipboard('hello')).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard API fails', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('denied'),
    );
    document.execCommand = vi.fn(() => true);

    expect(await copyToClipboard('hello')).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false when both methods fail', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('denied'),
    );
    document.execCommand = vi.fn(() => {
      throw new Error('not supported');
    });

    expect(await copyToClipboard('hello')).toBe(false);
  });

  it('cleans up textarea from DOM in fallback path', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('denied'),
    );
    document.execCommand = vi.fn(() => true);

    await copyToClipboard('hello');
    expect(document.querySelector('textarea')).toBeNull();
  });
});
