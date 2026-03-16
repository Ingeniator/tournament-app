import { useState, useEffect, useRef, useCallback } from 'react';
import type { Nomination } from '@padel/common';

export function useNominationLayout(nominations: Nomination[]) {
  const nomCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [nomMinHeight, setNomMinHeight] = useState(0);

  const setNomRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    nomCardRefs.current[index] = el;
  }, []);

  useEffect(() => {
    if (nominations.length === 0) return;
    setNomMinHeight(0);
    const rafId = requestAnimationFrame(() => {
      const heights = nomCardRefs.current
        .filter((el): el is HTMLDivElement => el !== null)
        .map(el => el.scrollHeight);
      if (heights.length > 0) {
        setNomMinHeight(Math.max(...heights));
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [nominations]);

  return { nomMinHeight, setNomRef };
}
