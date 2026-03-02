// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSupporters, getSavedName } from './useSupporters';

beforeEach(() => {
  localStorage.clear();
});

describe('getSavedName', () => {
  it('returns empty string when nothing saved', () => {
    expect(getSavedName()).toBe('');
  });

  it('returns stored name', () => {
    localStorage.setItem('supporter-name', 'Alice');
    expect(getSavedName()).toBe('Alice');
  });
});

describe('useSupporters', () => {
  // dbUrl is undefined in test env (no VITE_FIREBASE_DATABASE_URL at module load)
  // so the hook takes the early-return path — fetch is never called

  it('finishes loading immediately when dbUrl is not configured', async () => {
    const { result } = renderHook(() => useSupporters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.supporters).toEqual([]);
    expect(result.current.grouped).toEqual([]);
  });

  it('sayThanks is a no-op when dbUrl is not configured', async () => {
    const { result } = renderHook(() => useSupporters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // should not throw
    await result.current.sayThanks('Alice', 5);
    expect(result.current.supporters).toEqual([]);
  });
});
