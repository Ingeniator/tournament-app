import { useState, useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { AppShell } from '../components/layout/AppShell';
import { Button, useTranslation, NO_COLOR, CLUB_COLORS, getClubColor, formatHasGroups, formatHasClubs, shortLabel } from '@padel/common';
import styles from './TeamPairingScreen.module.css';

export function TeamPairingScreen() {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const clubs = useMemo(() => tournament?.clubs ?? [], [tournament?.clubs]);

  // Build club color map
  const clubColorMap = useMemo(() => {
    const map = new Map<string, string>();
    clubs.forEach((c, i) => map.set(c.id, getClubColor(c, i)));
    return map;
  }, [clubs]);

  // Group teams by club for club formats
  const teamsByClub = useMemo(() => {
    if (!tournament?.teams || !formatHasClubs(tournament.config.format) || clubs.length === 0) return null;
    const playerClubOf = (id: string) => tournament.players.find(p => p.id === id)?.clubId;
    const grouped = new Map<string, typeof tournament.teams>();
    for (const club of clubs) {
      grouped.set(club.id, []);
    }
    for (const team of tournament.teams) {
      const clubId = playerClubOf(team.player1Id) ?? playerClubOf(team.player2Id);
      if (clubId && grouped.has(clubId)) {
        grouped.get(clubId)!.push(team);
      }
    }
    return grouped;
  }, [tournament, clubs]);

  // Detect unequal club sizes
  const unequalClubs = useMemo(() => {
    if (!tournament?.teams || !formatHasClubs(tournament.config.format) || !teamsByClub) return false;
    const pairCounts = clubs.map(c => (teamsByClub.get(c.id) ?? []).length);
    return pairCounts.length > 1 && new Set(pairCounts).size > 1;
  }, [tournament, clubs, teamsByClub]);

  if (!tournament || !tournament.teams) return null;

  const isClubFormat = formatHasClubs(tournament.config.format);
  const isCrossGroupFormat = formatHasGroups(tournament.config.format);

  const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';
  const playerClub = (id: string) => tournament.players.find(p => p.id === id)?.clubId;
  const playerGroup = (id: string) => tournament.players.find(p => p.id === id)?.group;

  const handlePlayerTap = (playerId: string) => {
    if (!selectedPlayerId) {
      setSelectedPlayerId(playerId);
      return;
    }

    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
      return;
    }

    // Check if same team
    const teamA = tournament.teams!.find(t => t.player1Id === selectedPlayerId || t.player2Id === selectedPlayerId);
    const teamB = tournament.teams!.find(t => t.player1Id === playerId || t.player2Id === playerId);

    if (teamA && teamB && teamA.id === teamB.id) {
      setSelectedPlayerId(null);
      return;
    }

    // Club constraint: only swap within same club
    if (isClubFormat) {
      const clubA = playerClub(selectedPlayerId);
      const clubB = playerClub(playerId);
      if (clubA !== clubB) {
        // Different clubs — select the new player instead
        setSelectedPlayerId(playerId);
        return;
      }
    }

    // Cross-group constraint: only swap players from the same group
    // (preserves the 1A+1B team invariant)
    if (isCrossGroupFormat) {
      const groupA = playerGroup(selectedPlayerId);
      const groupB = playerGroup(playerId);
      if (groupA !== groupB) {
        setSelectedPlayerId(playerId);
        return;
      }
    }

    dispatch({
      type: 'SWAP_PLAYERS',
      payload: { playerA: selectedPlayerId, playerB: playerId },
    });
    setSelectedPlayerId(null);
  };

  const handleShuffle = () => {
    setSelectedPlayerId(null);
    dispatch({ type: 'SHUFFLE_TEAMS' });
  };

  const handleStart = () => {
    dispatch({ type: 'GENERATE_SCHEDULE' });
  };

  const handleBack = () => {
    setSelectedPlayerId(null);
    dispatch({ type: 'SET_TEAMS_BACK' });
  };

  const teamCount = tournament.teams.length;
  const playerCount = tournament.players.length;

  const isSlotMode = tournament.config.format === 'club-ranked';

  // Compute slot label per team from players' actual rankSlot (with [N] suffix for duplicates)
  const teamSlotLabel = useMemo(() => {
    if (!isSlotMode || !tournament.config.rankLabels?.length || !teamsByClub || !clubs.length) {
      return new Map<string, string>();
    }
    const rankLabels = tournament.config.rankLabels;
    const labels = new Map<string, string>();
    const playerRankOf = (id: string) => tournament.players.find(p => p.id === id)?.rankSlot;

    // Count occurrences of each rank per club
    const clubRankCount = new Map<string, Map<number, number>>();
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
    // Assign labels with suffix when rank appears more than once in a club
    for (const club of clubs) {
      const seen = new Map<number, number>();
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
    return labels;
  }, [isSlotMode, tournament.config.rankLabels, tournament.players, teamsByClub, clubs]);

  const renderTeamCard = (team: typeof tournament.teams[0]) => (
    <div key={team.id} className={styles.teamCard}>
      <div className={styles.teamCardHeader}>
        <input
          className={styles.teamNameInput}
          value={team.name ?? ''}
          placeholder={`${nameOf(team.player1Id)} & ${nameOf(team.player2Id)}`}
          onChange={e => dispatch({ type: 'RENAME_TEAM', payload: { teamId: team.id, name: e.target.value } })}
        />
        {isSlotMode && teamSlotLabel.has(team.id) && (
          <span className={styles.slotBadge}>
            {teamSlotLabel.get(team.id)}
          </span>
        )}
      </div>
      <div className={styles.teamPlayers}>
        <button
          className={`${styles.playerChip} ${selectedPlayerId === team.player1Id ? styles.playerChipSelected : ''}`}
          onClick={() => handlePlayerTap(team.player1Id)}
        >
          {isCrossGroupFormat && playerGroup(team.player1Id) && (
            <span className={styles.groupBadge}>{playerGroup(team.player1Id)}</span>
          )}
          {nameOf(team.player1Id)}
        </button>
        <button
          className={`${styles.playerChip} ${selectedPlayerId === team.player2Id ? styles.playerChipSelected : ''}`}
          onClick={() => handlePlayerTap(team.player2Id)}
        >
          {isCrossGroupFormat && playerGroup(team.player2Id) && (
            <span className={styles.groupBadge}>{playerGroup(team.player2Id)}</span>
          )}
          {nameOf(team.player2Id)}
        </button>
      </div>
    </div>
  );

  return (
    <AppShell
      title={t('teams.title')}
      headerRight={
        <Button variant="ghost" size="small" onClick={handleBack}>
          {t('teams.back')}
        </Button>
      }
    >
      <div className={styles.header}>
        <div className={styles.subtitle}>
          {t('teams.subtitle', { playerCount, teamCount })}
        </div>
      </div>

      <div className={styles.hint}>
        {isClubFormat ? t('teams.hintClub') : t('teams.hint')}
      </div>

      {isClubFormat && (
        <div className={styles.infoBanner}>
          <div className={styles.infoBannerTitle}>{t('teams.fixedPairsTitle')}</div>
          <div className={styles.infoBannerBody}>
            {t('teams.fixedPairsBody')}
          </div>
          {tournament.config.format === 'club-ranked' && (
            <div className={styles.infoBannerBody}>
              {t('teams.fixedSlotsBody')}
            </div>
          )}
        </div>
      )}

      {isClubFormat && unequalClubs && (
        <div className={styles.warningBanner}>
          <div className={styles.warningBannerTitle}>{t('teams.unequalClubsTitle')}</div>
          <div className={styles.warningBannerBody}>
            {t('teams.unequalClubsBody')}
          </div>
        </div>
      )}

      {isClubFormat && teamsByClub ? (
        <div className={styles.teamList}>
          {clubs.map((club) => {
            const clubTeams = teamsByClub.get(club.id) ?? [];
            const color = clubColorMap.get(club.id) ?? CLUB_COLORS[0];
            return (
              <div key={club.id}>
                <div
                  className={styles.clubGroupHeader}
                  style={color !== NO_COLOR ? { color } : undefined}
                >
                  {club.name}
                </div>
                {clubTeams.map(team => renderTeamCard(team))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.teamList}>
          {tournament.teams.map(renderTeamCard)}
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={handleShuffle}>
          {t('teams.shuffle')}
        </Button>
        <Button fullWidth onClick={handleStart}>
          {t('teams.start')}
        </Button>
      </div>
    </AppShell>
  );
}
