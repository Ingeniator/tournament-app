import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Team, Club, TournamentFormat } from '@padel/common';
import type { PlannerRegistration } from '@padel/common';
import { Modal, Button, NO_COLOR, CLUB_COLORS, getClubColor, shortLabel, formatHasGroups, formatHasClubs, useTranslation, deduplicateNames } from '@padel/common';
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

function generateTeams(players: PlannerRegistration[], format: TournamentFormat, clubs?: Club[]): Team[] {
  // PlannerRegistration is compatible with Player for team creation
  const asPlayers = players.map(p => ({
    id: p.id,
    name: p.name,
    group: p.group,
    clubId: p.clubId,
    rankSlot: p.rankSlot,
  }));
  if (formatHasClubs(format) && clubs?.length) {
    return createClubTeams(asPlayers, clubs);
  }
  if (formatHasGroups(format)) {
    // Auto-assign missing groups alternately so no players are dropped
    const unassigned = asPlayers.filter(p => !p.group);
    let nextGroup: 'A' | 'B' = 'A';
    for (const p of unassigned) {
      p.group = nextGroup;
      nextGroup = nextGroup === 'A' ? 'B' : 'A';
    }
    return createCrossGroupTeams(asPlayers);
  }
  return createTeams(asPlayers);
}

export function TeamPairingModal({ open, players, format, clubs, rankLabels, onStart, onClose }: TeamPairingModalProps) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>(() => generateTeams(players, format, clubs));
  const [aliases, setAliases] = useState<Map<string, string>>(() => deduplicateNames(players));
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

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
    return grouped;
  }, [teams, players, clubs, isClubFormat]);

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
      const copy = { ...t };
      if (copy.player1Id === selectedPlayerId) copy.player1Id = playerId;
      else if (copy.player2Id === selectedPlayerId) copy.player2Id = playerId;
      if (copy.player1Id === playerId && t.player1Id !== selectedPlayerId && t.player2Id !== selectedPlayerId) copy.player1Id = selectedPlayerId;
      else if (copy.player2Id === playerId && t.player1Id !== selectedPlayerId && t.player2Id !== selectedPlayerId) copy.player2Id = selectedPlayerId;
      return copy;
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

  const renderTeamCard = (team: Team, slotIndex?: number) => (
    <div key={team.id} className={styles.teamCard}>
      <div className={styles.teamCardHeader}>
        <input
          className={styles.teamNameInput}
          value={team.name ?? ''}
          placeholder={`${displayName(team.player1Id)} & ${displayName(team.player2Id)}`}
          onChange={e => handleRename(team.id, e.target.value)}
        />
        {isSlotMode && slotIndex != null && rankLabels?.[slotIndex] && (
          <span className={styles.slotBadge}>{shortLabel(rankLabels[slotIndex])}</span>
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
                  {clubTeams.map((team, idx) => renderTeamCard(team, idx))}
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
