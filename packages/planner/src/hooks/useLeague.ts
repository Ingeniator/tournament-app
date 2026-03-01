import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update as firebaseUpdate } from 'firebase/database';
import type { League, LeagueRankingRules } from '@padel/common';
import { generateId } from '@padel/common';
import { db } from '../firebase';

const DEFAULT_RULES: LeagueRankingRules = {
  pointsPerWin: 3,
  pointsPerDraw: 1,
  pointsPerLoss: 0,
  tiebreaker: 'pointDifference',
};

function toLeague(id: string, data: Record<string, unknown>): League {
  const tournamentIds = data.tournamentIds;
  return {
    id,
    name: data.name as string,
    date: data.date as string,
    tournamentIds: Array.isArray(tournamentIds) ? tournamentIds : [],
    rankingRules: (data.rankingRules as LeagueRankingRules) ?? DEFAULT_RULES,
    status: (data.status as League['status']) ?? 'draft',
    organizerId: data.organizerId as string,
    createdAt: data.createdAt as number,
    updatedAt: data.updatedAt as number,
  };
}

export function useLeague(leagueId: string | null) {
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time subscription
  useEffect(() => {
    if (!leagueId || !db) return;
    setLoading(true);
    const unsubscribe = onValue(ref(db, `leagues/${leagueId}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLeague(toLeague(leagueId, data));
      } else {
        setLeague(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [leagueId]);

  const createLeague = useCallback(async (
    name: string,
    date: string,
    organizerId: string,
    rankingRules?: LeagueRankingRules,
  ): Promise<string> => {
    if (!db) throw new Error('Firebase not configured');
    const id = generateId();
    const now = Date.now();
    const league: League = {
      id,
      name,
      date,
      tournamentIds: [],
      rankingRules: rankingRules ?? DEFAULT_RULES,
      status: 'draft',
      organizerId,
      createdAt: now,
      updatedAt: now,
    };
    const updates: Record<string, unknown> = {
      [`leagues/${id}`]: league,
      [`users/${organizerId}/leagues/${id}`]: true,
    };
    await firebaseUpdate(ref(db), updates);
    return id;
  }, []);

  const updateLeague = useCallback(async (
    updates: Partial<Pick<League, 'name' | 'date' | 'rankingRules' | 'status' | 'tournamentIds'>>,
  ) => {
    if (!leagueId || !db) return;
    const pathUpdates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      pathUpdates[`leagues/${leagueId}/${k}`] = v === undefined ? null : v;
    }
    pathUpdates[`leagues/${leagueId}/updatedAt`] = Date.now();
    await firebaseUpdate(ref(db), pathUpdates);
  }, [leagueId]);

  const linkTournament = useCallback(async (tournamentId: string) => {
    if (!leagueId || !db || !league) return;
    const ids = [...league.tournamentIds];
    if (!ids.includes(tournamentId)) {
      ids.push(tournamentId);
      await updateLeague({ tournamentIds: ids });
    }
  }, [leagueId, league, updateLeague]);

  const unlinkTournament = useCallback(async (tournamentId: string) => {
    if (!leagueId || !db || !league) return;
    const ids = league.tournamentIds.filter(id => id !== tournamentId);
    await updateLeague({ tournamentIds: ids });
  }, [leagueId, league, updateLeague]);

  const deleteLeague = useCallback(async (organizerId: string) => {
    if (!leagueId || !db) return;
    const deletes: Record<string, null> = {
      [`leagues/${leagueId}`]: null,
      [`users/${organizerId}/leagues/${leagueId}`]: null,
    };
    await firebaseUpdate(ref(db), deletes);
  }, [leagueId]);

  return {
    league,
    loading,
    createLeague,
    updateLeague,
    linkTournament,
    unlinkTournament,
    deleteLeague,
  };
}
