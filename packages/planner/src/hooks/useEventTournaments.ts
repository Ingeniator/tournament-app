import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import type { Tournament, PadelEventStatus, EventTournamentLink, PlannerRegistration } from '@padel/common';
import { db } from '../firebase';

export interface EventTournamentInfo {
  id: string;
  name: string;
  format?: string;
  date?: string;
  place?: string;
  hasRunnerData: boolean;
  /** Whether the runner has started (at least one match played) */
  hasStarted: boolean;
  /** Whether the runner is completed */
  isCompleted: boolean;
  /** Number of registered players */
  playerCount: number;
  /** Tournament capacity (courts * 4) */
  capacity: number;
  weight: number;
}

/**
 * Compute event status from linked tournament states.
 * - All draft/registration → draft
 * - Any started → active
 * - All completed → completed
 */
export function computeEventStatus(infos: EventTournamentInfo[]): PadelEventStatus {
  if (infos.length === 0) return 'draft';
  const allCompleted = infos.every(t => t.isCompleted);
  if (allCompleted) return 'completed';
  const anyStarted = infos.some(t => t.hasStarted);
  if (anyStarted) return 'active';
  return 'draft';
}

export function useEventTournaments(links: EventTournamentLink[]) {
  const [tournamentData, setTournamentData] = useState<Map<string, Tournament>>(new Map());
  const [tournamentInfos, setTournamentInfos] = useState<EventTournamentInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const stableKey = links.map(l => `${l.tournamentId}:${l.weight}`).join(',');

  useEffect(() => {
    if (!db || links.length === 0) {
      setTournamentData(new Map());
      setTournamentInfos([]);
      return;
    }
    setLoading(true);

    const unsubscribes: (() => void)[] = [];
    const dataMap = new Map<string, Tournament | null>();
    const infoMap = new Map<string, EventTournamentInfo>();
    const weightMap = new Map<string, number>();
    for (const l of links) weightMap.set(l.tournamentId, l.weight);

    for (const link of links) {
      const tid = link.tournamentId;
      const unsub = onValue(ref(db, `tournaments/${tid}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const name = (data.name as string) ?? tid;
          const runnerData = data.runnerData as Tournament | null;
          const completedAt = data.completedAt;
          const courts = data.courts;
          const players = data.players as Record<string, PlannerRegistration> | null;

          const courtCount = Array.isArray(courts) ? courts.length :
            typeof courts === 'object' && courts !== null ? Object.keys(courts).length : 1;
          const playerCount = players ? Object.keys(players).length : 0;

          // Determine if started: has runnerData with at least one scored match
          let hasStarted = false;
          if (runnerData?.rounds) {
            for (const round of runnerData.rounds) {
              if (round.matches?.some(m => m.score != null)) {
                hasStarted = true;
                break;
              }
            }
          }

          dataMap.set(tid, runnerData ?? null);
          infoMap.set(tid, {
            id: tid,
            name,
            format: data.format as string | undefined,
            date: data.date as string | undefined,
            place: data.place as string | undefined,
            hasRunnerData: !!runnerData,
            hasStarted,
            isCompleted: !!completedAt,
            playerCount,
            capacity: courtCount * 4,
            weight: weightMap.get(tid) ?? 1,
          });
        } else {
          dataMap.delete(tid);
          infoMap.delete(tid);
        }

        // Update state with all current data
        const newDataMap = new Map<string, Tournament>();
        for (const [id, t] of dataMap.entries()) {
          if (t) newDataMap.set(id, t);
        }
        setTournamentData(newDataMap);
        const infos = Array.from(infoMap.values());
        infos.sort((a, b) => {
          if (a.date && b.date) return a.date.localeCompare(b.date);
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        });
        setTournamentInfos(infos);
        setLoading(false);
      });
      unsubscribes.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribes) unsub();
    };
  }, [stableKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = useMemo(() => computeEventStatus(tournamentInfos), [tournamentInfos]);

  return { tournamentData, tournamentInfos, status, loading };
}
