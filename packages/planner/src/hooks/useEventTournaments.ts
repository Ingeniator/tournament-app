import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import type { Tournament, PadelEventStatus, EventTournamentLink, PlannerRegistration, TournamentFormat, Club } from '@padel/common';
import { db } from '../firebase';
import { getPlayerStatuses } from '../utils/playerStatus';

export interface EventTournamentRawData {
  players: PlannerRegistration[];
  clubs: Club[];
  rankLabels: string[];
  rankColors: number[];
  groupLabels: [string, string] | undefined;
  captainMode: boolean;
  maldiciones: boolean;
  format: TournamentFormat | undefined;
}

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
  /** Number of playing players */
  playerCount: number;
  /** For captain mode: number of captain-approved players (independent of pairing) */
  approvedCount: number;
  /** Total registered (non-cancelled) players */
  registeredCount: number;
  /** Tournament capacity (courts * 4) */
  capacity: number;
  weight: number;
  /** Raw data for breakdown views */
  raw: EventTournamentRawData;
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
  const [error, setError] = useState<string | null>(null);

  const stableKey = links.map(l => `${l.tournamentId}:${l.weight}`).join(',');

  useEffect(() => {
    if (!db || links.length === 0) {
      setTournamentData(new Map());
      setTournamentInfos([]);
      return;
    }
    setLoading(true);
    setError(null);

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
          const playerList = players ? Object.values(players) : [];
          const capacity = courtCount * 4;
          const clubs = (data.clubs as Club[] | undefined) ?? [];
          const rankLabels = (data.rankLabels as string[] | undefined) ?? [];
          const rankColors = (data.rankColors as number[] | undefined) ?? [];
          const groupLabels = data.groupLabels as [string, string] | undefined;
          const captainMode = !!(data.captainMode as boolean | undefined);
          const maldicionesData = data.maldiciones as { enabled?: boolean } | undefined;
          const maldiciones = !!(maldicionesData?.enabled);
          const format = data.format as TournamentFormat | undefined;
          const registeredCount = playerList.filter(p => p.confirmed !== false).length;

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

          // For started/completed tournaments, all confirmed players are "playing"
          // (draft status logic only applies to pre-start registration)
          let playerCount: number;
          let approvedCount: number;
          if (completedAt || hasStarted) {
            playerCount = registeredCount;
            approvedCount = registeredCount;
          } else {
            const statuses = getPlayerStatuses(playerList, capacity, {
              format,
              clubs: clubs.length > 0 ? clubs : undefined,
              rankLabels: rankLabels.length > 0 ? rankLabels : undefined,
              captainMode: captainMode || undefined,
            });
            playerCount = [...statuses.values()].filter(s => s === 'playing').length;
            approvedCount = captainMode
              ? playerList.filter(p => p.confirmed !== false && p.captainApproved === true).length
              : playerCount;
          }

          dataMap.set(tid, runnerData ?? null);
          infoMap.set(tid, {
            id: tid,
            name,
            format: format as string | undefined,
            date: data.date as string | undefined,
            place: data.place as string | undefined,
            hasRunnerData: !!runnerData,
            hasStarted,
            isCompleted: !!completedAt,
            playerCount,
            approvedCount,
            registeredCount,
            capacity,
            weight: weightMap.get(tid) ?? 1,
            raw: { players: playerList, clubs, rankLabels, rankColors, groupLabels, captainMode, maldiciones, format },
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
      }, (err) => {
        console.warn(`Event tournament ${tid} listener failed:`, err.message);
        setError(err.message);
        setLoading(false);
      });
      unsubscribes.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribes) unsub();
    };
  }, [stableKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = useMemo(() => computeEventStatus(tournamentInfos), [tournamentInfos]);

  return { tournamentData, tournamentInfos, status, loading, error };
}
