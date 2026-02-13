import { describe, it, expect } from 'vitest';
import { getStrategy, registerStrategy } from './index';

describe('getStrategy', () => {
  it('returns americano strategy', () => {
    const strategy = getStrategy('americano');
    expect(strategy).toBeDefined();
    expect(strategy.isDynamic).toBe(false);
  });

  it('returns mexicano strategy', () => {
    const strategy = getStrategy('mexicano');
    expect(strategy).toBeDefined();
    expect(strategy.isDynamic).toBe(true);
  });

  it('throws for unknown format', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getStrategy('unknown' as any)).toThrow('No strategy registered for format: unknown');
  });
});

describe('registerStrategy', () => {
  it('registers and retrieves a custom strategy', () => {
    const mock = { isDynamic: false } as ReturnType<typeof getStrategy>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerStrategy('test-format' as any, mock);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getStrategy('test-format' as any)).toBe(mock);
  });
});
