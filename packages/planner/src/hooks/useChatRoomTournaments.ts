import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import type { TournamentSummary } from '@padel/common';
import { db } from '../firebase';

interface ChatRoomEntry {
  name: string;
  date?: string;
  code: string;
  organizerName?: string;
  linkedAt: number;
  linkedBy: string;
}

function toSummary(id: string, entry: ChatRoomEntry): TournamentSummary {
  return {
    id,
    name: entry.name,
    date: entry.date,
    code: entry.code,
    organizerName: entry.organizerName,
    organizerId: entry.linkedBy,
    createdAt: entry.linkedAt,
  };
}

function sortByLinkedAt(a: TournamentSummary, b: TournamentSummary): number {
  return b.createdAt - a.createdAt;
}

export function useChatRoomTournaments(chatInstance: string | null) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatInstance || !db) {
      setTournaments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(ref(db, `chatRooms/${chatInstance}/tournaments`), (snapshot) => {
      const data = snapshot.val() as Record<string, ChatRoomEntry> | null;
      if (!data) {
        setTournaments([]);
        setLoading(false);
        return;
      }
      const results = Object.entries(data).map(([id, entry]) => toSummary(id, entry));
      results.sort(sortByLinkedAt);
      setTournaments(results);
      setLoading(false);
    });
    return unsubscribe;
  }, [chatInstance]);

  return { tournaments, loading };
}
