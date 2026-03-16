// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asyncConfirm } from './confirm';

beforeEach(() => {
  vi.restoreAllMocks();
  // Clear Telegram from window
  Object.defineProperty(window, 'Telegram', { value: undefined, writable: true, configurable: true });
});

describe('asyncConfirm', () => {
  it('uses window.confirm when Telegram is not available', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = await asyncConfirm('Are you sure?');
    expect(result).toBe(true);
    expect(window.confirm).toHaveBeenCalledWith('Are you sure?');
  });

  it('returns false from window.confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const result = await asyncConfirm('Delete?');
    expect(result).toBe(false);
  });

  it('uses Telegram showConfirm when available', async () => {
    const mockShowConfirm = vi.fn((message: string, resolve: (ok: boolean) => void) => {
      resolve(true);
    });
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: { showConfirm: mockShowConfirm } },
      writable: true,
      configurable: true,
    });
    const result = await asyncConfirm('Confirm?');
    expect(result).toBe(true);
    expect(mockShowConfirm).toHaveBeenCalledWith('Confirm?', expect.any(Function));
  });

  it('falls back to window.confirm when Telegram exists but showConfirm is undefined', async () => {
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: {} },
      writable: true,
      configurable: true,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const result = await asyncConfirm('Proceed?');
    expect(result).toBe(true);
    expect(window.confirm).toHaveBeenCalledWith('Proceed?');
  });
});
