import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Team, Club, TournamentFormat } from '@padel/common';
import type { PlannerRegistration } from '@padel/common';
import { Modal, Button, NO_COLOR, CLUB_COLORS, getClubColor, shortLabel, formatHasGroups, formatHasClubs, useTranslation, deduplicateNames, generateId } from '@padel/common';
import { createTeams, createCrossGroupTeams, createClubTeams } from '@padel/common';
import styles from './TeamPairingModal.module.css';

interface TeamPairingModalProps {
  open: boolean;
  players: PlannerRegistration[];
  format: TournamentFormat;
  clubs?: Club[];
  rankLabels?: string[];
  onStart: (teams: Team[], aliases: Map<string, string>) => void;
  onClose: () => void;
}

function matchPartnerPairs(players: PlannerRegistration[]): { prePaired: Team[]; remaining: PlannerRegistration[] } {
  const paired = new Set<string>();
  const prePaired: Team[] = [];

  for (const p of players) {
    if (paired.has(p.id) || !p.partnerName) continue;
    // Try to match by telegram first, then by name
    const match = players.find(other => {
      if (other.id === p.id || paired.has(other.id)) return false;
      // Match: p's partnerTelegram matches other's telegramUsername
      if (p.partnerTelegram && other.telegramUsername &&
          p.partnerTelegram.toLowerCase() === other.telegramUsername.toLowerCase()) return true;
      // Match: other's partnerTelegram matches p's telegramUsername
      if (other.partnerTelegram && p.telegramUsername &&
          other.partnerTelegram.toLowerCase() === p.telegramUsername.toLowerCase()) return true;
      // Match: p's partnerName matches other's name (case-insensitive)
      if (p.partnerName!.toLowerCase() === other.name.toLowerCase()) return true;
      // Match: other's partnerName matches p's name
      if (other.partnerName && other.partnerName.toLowerCase() === p.name.toLowerCase()) return true;
      return false;
    });
    if (match) {
      paired.add(p.id);
      paired.add(match.id);
      prePaired.push({ id: generateId(), player1Id: p.id, player2Id: match.id });
    }
  }

  const remaining = players.filter(p => !paired.has(p.id));
  return { prePaired, remaining };
}

function generateTeams(players: PlannerRegistration[], format: TournamentFormat, clubs?: Club[]): Team[] {
  // Pre-pair players with partner preferences
  const { prePaired, remaining } = matchPartnerPairs(players);

  // PlannerRegistration is compatible with Player for team creation
  const toPlayer = (p: PlannerRegistration) => ({
    id: p.id,
    name: p.name,
    group: p.group,
    clubId: p.clubId,
    rankSlot: p.rankSlot,
  });

  const remainingPlayers = remaining.map(toPlayer);

  if (formatHasClubs(format) && clubs?.length) {
    const autoTeams = createClubTeams(remainingPlayers, clubs);
    return [...prePaired, ...autoTeams];
  }
  if (formatHasGroups(format)) {
    // Auto-assign missing groups alternately so no players are dropped
    const unassigned = remainingPlayers.filter(p => !p.group);
    let nextGroup: 'A' | 'B' = 'A';
    for (const p of unassigned) {
      p.group = nextGroup;
      nextGroup = nextGroup === 'A' ? 'B' : 'A';
    }
    const autoTeams = createCrossGroupTeams(remainingPlayers);
    return [...prePaired, ...autoTeams];
  }
  const autoTeams = createTeams(remainingPlayers);
  return [...prePaired, ...autoTeams];
}

function buildInitialAliases(players: PlannerRegistration[]): Map<string, string> {
  // Start with player-set aliases
  const aliased = players.map(p => ({ id: p.id, name: p.alias || p.name }));
  // Then deduplicate any collisions
  const deduped = deduplicateNames(aliased);
  const result = new Map<string, string>();
  for (const p of players) {
    const dedupName = deduped.get(p.id);
    if (dedupName) {
      result.set(p.id, dedupName);
    } else if (p.alias) {
      result.set(p.id, p.alias);
    }
  }
  return result;
}

export function TeamPairingModal({ open, players, format, clubs, rankLabels, onStart, onClose }: TeamPairingModalProps) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>(() => generateTeams(players, format, clubs));
  const [aliases, setAliases] = useState<Map<string, string>>(() => buildInitialAliases(players));
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Regenerate teams when modal opens (state may be stale from previous open)
  useEffect(() => {
    if (open) {
      setTeams(generateTeams(players, format, clubs));
      setAliases(buildInitialAliases(players));
      setSelectedPlayerId(null);
    }
  }, [open]);

  const isClubFormat = formatHasClubs(format);
  const isCrossGroupFormat = formatHasGroups(format);
  const isSlotMode = format === 'club-ranked';

  const clubColorMap = useMemo(() => {
    const map = new Map<string, string>();
    (clubs ?? []).forEach((c, i) => map.set(c.id, getClubColor(c, i)));
    return map;
  }, [clubs]);

  const teamsByClub = useMemo(() => {
    if (!isClubFormat || !clubs?.length) return null;
    const playerRankOf = (id: string) => players.find(p => p.id === id)?.rankSlot;
    const playerClubOf = (id: string) => players.find(p => p.id === id)?.clubId;
    const grouped = new Map<string, Team[]>();
    for (const club of clubs) {
      grouped.set(club.id, []);
    }
    for (const team of teams) {
      const clubId = playerClubOf(team.player1Id) ?? playerClubOf(team.player2Id);
      if (clubId && grouped.has(clubId)) {
        grouped.get(clubId)!.push(team);
      }
    }
    // Sort teams within each club by rank slot
    for (const [, clubTeams] of grouped) {
      clubTeams.sort((a, b) => {
        const rankA = playerRankOf(a.player1Id) ?? playerRankOf(a.player2Id) ?? 999;
        const rankB = playerRankOf(b.player1Id) ?? playerRankOf(b.player2Id) ?? 999;
        return rankA - rankB;
      });
    }
    return grouped;
  }, [teams, players, clubs, isClubFormat]);

  // Compute slot label per team from players' actual rankSlot (with suffix for duplicates)
  const teamSlotLabel = useMemo(() => {
    if (!isSlotMode || !rankLabels?.length) return new Map<string, string>();
    const labels = new Map<string, string>();
    const playerRankOf = (id: string) => players.find(p => p.id === id)?.rankSlot;
    // Count occurrences of each rank per club to add suffixes
    const clubRankCount = new Map<string, Map<number, number>>(); // clubId → rank → count
    if (teamsByClub && clubs) {
      for (const club of clubs) {
        const rankCounts = new Map<number, number>();
        clubRankCount.set(club.id, rankCounts);
        for (const team of teamsByClub.get(club.id) ?? []) {
          const rank = playerRankOf(team.player1Id) ?? playerRankOf(team.player2Id);
          if (rank != null) {
            rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
          }
        }
      }
    }
    // Second pass: assign labels with suffix when rank appears more than once in a club
    if (teamsByClub && clubs) {
      for (const club of clubs) {
        const seen = new Map<number, number>(); // rank → occurrence index
        for (const team of teamsByClub.get(club.id) ?? []) {
          const rank = playerRankOf(team.player1Id) ?? playerRankOf(team.player2Id);
          if (rank != null && rankLabels[rank]) {
            const base = shortLabel(rankLabels[rank]);
            const totalForRank = clubRankCount.get(club.id)?.get(rank) ?? 1;
            const idx = (seen.get(rank) ?? 0) + 1;
            seen.set(rank, idx);
            labels.set(team.id, totalForRank > 1 ? `${base} [${idx}]` : base);
          }
        }
      }
    }
    return labels;
  }, [isSlotMode, rankLabels, teamsByClub, clubs, players]);

  const displayName = useCallback((id: string) =>
    aliases.get(id) ?? players.find(p => p.id === id)?.name ?? '?',
    [aliases, players]
  );
  const playerClub = useCallback((id: string) => players.find(p => p.id === id)?.clubId, [players]);
  const playerGroup = useCallback((id: string) => players.find(p => p.id === id)?.group, [players]);

  useEffect(() => {
    if (editingPlayerId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPlayerId]);

  const handleEditSave = () => {
    if (editingPlayerId && editDraft.trim()) {
      setAliases(prev => {
        const next = new Map(prev);
        next.set(editingPlayerId, editDraft.trim());
        // Re-deduplicate all effective names to resolve collisions
        const items = players.map(p => ({ id: p.id, name: next.get(p.id) ?? p.name }));
        const deduped = deduplicateNames(items);
        for (const [id, name] of deduped) {
          next.set(id, name);
        }
        return next;
      });
    }
    setEditingPlayerId(null);
  };

  const handlePlayerTap = (playerId: string) => {
    if (editingPlayerId) {
      handleEditSave();
      return;
    }
    if (!selectedPlayerId) {
      setSelectedPlayerId(playerId);
      return;
    }
    if (selectedPlayerId === playerId) {
      // Second tap on same chip → edit mode
      setSelectedPlayerId(null);
      setEditingPlayerId(playerId);
      setEditDraft(displayName(playerId));
      return;
    }
    // Check if same team
    const teamA = teams.find(t => t.player1Id === selectedPlayerId || t.player2Id === selectedPlayerId);
    const teamB = teams.find(t => t.player1Id === playerId || t.player2Id === playerId);
    if (teamA && teamB && teamA.id === teamB.id) {
      setSelectedPlayerId(null);
      return;
    }
    // Club constraint
    if (isClubFormat) {
      if (playerClub(selectedPlayerId) !== playerClub(playerId)) {
        setSelectedPlayerId(playerId);
        return;
      }
    }
    // Group constraint
    if (isCrossGroupFormat) {
      if (playerGroup(selectedPlayerId) !== playerGroup(playerId)) {
        setSelectedPlayerId(playerId);
        return;
      }
    }
    // Swap
    setTeams(prev => prev.map(t => {
      let { player1Id, player2Id } = t;
      if (t.player1Id === selectedPlayerId) player1Id = playerId;
      else if (t.player2Id === selectedPlayerId) player2Id = playerId;
      if (t.player1Id === playerId && t.player1Id !== selectedPlayerId && t.player2Id !== selectedPlayerId) player1Id = selectedPlayerId;
      else if (t.player2Id === playerId && t.player1Id !== selectedPlayerId && t.player2Id !== selectedPlayerId) player2Id = selectedPlayerId;
      return player1Id === t.player1Id && player2Id === t.player2Id ? t : { ...t, player1Id, player2Id };
    }));
    setSelectedPlayerId(null);
  };

  const handleShuffle = () => {
    setSelectedPlayerId(null);
    setEditingPlayerId(null);
    setTeams(generateTeams(players, format, clubs));
  };

  const handleRename = (teamId: string, name: string) => {
    setTeams(prev => prev.map(t =>
      t.id === teamId ? { ...t, name: name.trim() || undefined } : t
    ));
  };

  const renderPlayerChip = (playerId: string) => {
    if (editingPlayerId === playerId) {
      return (
        <div key={playerId} className={`${styles.playerChip} ${styles.playerChipEditing}`}>
          {isCrossGroupFormat && playerGroup(playerId) && (
            <span className={styles.groupBadge}>{playerGroup(playerId)}</span>
          )}
          <input
            ref={editInputRef}
            className={styles.playerNameInput}
            value={editDraft}
            onChange={e => setEditDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleEditSave();
              if (e.key === 'Escape') setEditingPlayerId(null);
            }}
            onBlur={handleEditSave}
          />
        </div>
      );
    }
    return (
      <button
        key={playerId}
        className={`${styles.playerChip} ${selectedPlayerId === playerId ? styles.playerChipSelected : ''}`}
        onClick={() => handlePlayerTap(playerId)}
      >
        {isCrossGroupFormat && playerGroup(playerId) && (
          <span className={styles.groupBadge}>{playerGroup(playerId)}</span>
        )}
        {displayName(playerId)}
      </button>
    );
  };

  const renderTeamCard = (team: Team) => (
    <div key={team.id} className={styles.teamCard}>
      <div className={styles.teamCardHeader}>
        <input
          className={styles.teamNameInput}
          value={team.name ?? ''}
          placeholder={`${displayName(team.player1Id)} & ${displayName(team.player2Id)}`}
          onChange={e => handleRename(team.id, e.target.value)}
        />
        {isSlotMode && teamSlotLabel.has(team.id) && (
          <span className={styles.slotBadge}>{teamSlotLabel.get(team.id)}</span>
        )}
      </div>
      <div className={styles.teamPlayers}>
        {renderPlayerChip(team.player1Id)}
        {renderPlayerChip(team.player2Id)}
      </div>
    </div>
  );

  const unassignedGroupCount = isCrossGroupFormat
    ? players.filter(p => !p.group).length
    : 0;

  if (!open) return null;

  const teamCount = teams.length;
  const playerCount = players.length;

  return (
    <Modal open={open} title={t('teams.title')} onClose={onClose}>
      <div className={styles.content}>
        <div className={styles.subtitle}>
          {t('teams.subtitle', { playerCount, teamCount })}
        </div>
        <div className={styles.hint}>
          {isClubFormat ? t('teams.hintClub') : t('teams.hint')}
        </div>

        {unassignedGroupCount > 0 && (
          <div className={styles.warningBanner}>
            {t('teams.groupsAutoAssigned', { count: unassignedGroupCount })}
          </div>
        )}

        {isClubFormat && teamsByClub && clubs ? (
          <div className={styles.teamList}>
            {clubs.map((club) => {
              const clubTeams = teamsByClub.get(club.id) ?? [];
              const color = clubColorMap.get(club.id) ?? CLUB_COLORS[0];
              return (
                <div key={club.id}>
                  <div className={styles.clubGroupHeader} style={color !== NO_COLOR ? { color } : undefined}>
                    {club.name}
                  </div>
                  {clubTeams.map(team => renderTeamCard(team))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.teamList}>
            {teams.map(renderTeamCard)}
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" fullWidth onClick={handleShuffle}>
            {t('teams.shuffle')}
          </Button>
          <Button fullWidth onClick={() => onStart(teams, aliases)}>
            {t('teams.start')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
