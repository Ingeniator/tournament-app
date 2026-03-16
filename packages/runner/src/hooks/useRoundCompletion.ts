import { useState, useEffect, useRef } from 'react';
import type { Round } from '@padel/common';

export function useRoundCompletion(activeRound: Round | null, rounds: Round[] | undefined) {
  const [roundCompleteNum, setRoundCompleteNum] = useState<number | null>(null);
  const prevActiveRoundIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prevId = prevActiveRoundIdRef.current;
    const curId = activeRound?.id ?? null;

    if (prevId !== null && curId !== null && prevId !== curId) {
      const completedRound = rounds?.find(r => r.id === prevId);
      if (completedRound) {
        setRoundCompleteNum(completedRound.roundNumber);
      }
    }

    prevActiveRoundIdRef.current = curId;
  }, [activeRound?.id, rounds]);

  return { roundCompleteNum, setRoundCompleteNum };
}
