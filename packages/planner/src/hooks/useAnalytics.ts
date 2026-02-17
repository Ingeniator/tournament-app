import { useState, useEffect, useCallback } from 'react';
import { ref, get } from 'firebase/database';
import type { PlannerTournament, PlannerRegistration } from '@padel/common';
import { db } from '../firebase';

export interface AnalyticsData {
  totalTournaments: number;
  totalPlayers: number;
  totalOrganizers: number;
  avgPlayersPerTournament: number;
  avgTournamentsPerOrganizer: number;
  formatBreakdown: Record<string, number>;
  places: Record<string, number>;
}

const EMPTY: AnalyticsData = {
  totalTournaments: 0,
  totalPlayers: 0,
  totalOrganizers: 0,
  avgPlayersPerTournament: 0,
  avgTournamentsPerOrganizer: 0,
  formatBreakdown: {},
  places: {},
};

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!db) {
      setError('Firebase not configured');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const snap = await get(ref(db, 'tournaments'));
      if (!snap.exists()) {
        setData(EMPTY);
        setLoading(false);
        return;
      }

      const tournaments = snap.val() as Record<string, PlannerTournament & { players?: Record<string, PlannerRegistration> }>;
      const ids = Object.keys(tournaments);

      const organizerCounts = new Map<string, number>();
      const formatCounts: Record<string, number> = {};
      const placeCounts: Record<string, number> = {};
      let totalPlayers = 0;
      const uniquePlayers = new Set<string>();

      for (const id of ids) {
        const t = tournaments[id];

        // Organizer counts
        const org = t.organizerId;
        if (org) {
          organizerCounts.set(org, (organizerCounts.get(org) ?? 0) + 1);
        }

        // Format breakdown
        const fmt = t.format ?? 'unknown';
        formatCounts[fmt] = (formatCounts[fmt] ?? 0) + 1;

        // Place counts
        if (t.place) {
          const place = t.place.trim();
          if (place) {
            placeCounts[place] = (placeCounts[place] ?? 0) + 1;
          }
        }

        // Player counts
        if (t.players) {
          const playerEntries = Object.entries(t.players);
          totalPlayers += playerEntries.length;
          for (const [pid] of playerEntries) {
            uniquePlayers.add(pid);
          }
        }
      }

      const totalTournaments = ids.length;
      const totalOrganizers = organizerCounts.size;

      setData({
        totalTournaments,
        totalPlayers: uniquePlayers.size,
        totalOrganizers,
        avgPlayersPerTournament: totalTournaments > 0 ? Math.round((totalPlayers / totalTournaments) * 10) / 10 : 0,
        avgTournamentsPerOrganizer: totalOrganizers > 0 ? Math.round((totalTournaments / totalOrganizers) * 10) / 10 : 0,
        formatBreakdown: formatCounts,
        places: placeCounts,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
