import { useState } from 'react';
import { useTournament } from '../hooks/useTournament';
import { useRunnerTheme } from '../state/ThemeContext';
import { AppShell } from '../components/layout/AppShell';
import { Button, SkinPicker } from '@padel/common';
import styles from './TeamPairingScreen.module.css';

export function TeamPairingScreen() {
  const { tournament, dispatch } = useTournament();
  const { skin, setSkin } = useRunnerTheme();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  if (!tournament || !tournament.teams) return null;

  const nameOf = (id: string) => tournament.players.find(p => p.id === id)?.name ?? '?';

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
      // Same team — deselect
      setSelectedPlayerId(null);
      return;
    }

    // Different teams — swap
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

  return (
    <AppShell
      title="Teams"
      headerRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SkinPicker skin={skin} onSelect={setSkin} />
          <Button variant="ghost" size="small" onClick={handleBack}>
            Back
          </Button>
        </div>
      }
    >
      <div className={styles.header}>
        <div className={styles.subtitle}>
          {playerCount} players &rarr; {teamCount} teams
        </div>
      </div>

      <div className={styles.hint}>
        Tap two players to swap them between teams
      </div>

      <div className={styles.teamList}>
        {tournament.teams.map((team) => (
          <div key={team.id} className={styles.teamCard}>
            <input
              className={styles.teamNameInput}
              value={team.name ?? ''}
              placeholder={`${nameOf(team.player1Id)} & ${nameOf(team.player2Id)}`}
              onChange={e => dispatch({ type: 'RENAME_TEAM', payload: { teamId: team.id, name: e.target.value } })}
            />
            <div className={styles.teamPlayers}>
              <button
                className={`${styles.playerChip} ${selectedPlayerId === team.player1Id ? styles.playerChipSelected : ''}`}
                onClick={() => handlePlayerTap(team.player1Id)}
              >
                {nameOf(team.player1Id)}
              </button>
              <button
                className={`${styles.playerChip} ${selectedPlayerId === team.player2Id ? styles.playerChipSelected : ''}`}
                onClick={() => handlePlayerTap(team.player2Id)}
              >
                {nameOf(team.player2Id)}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={handleShuffle}>
          Shuffle Teams
        </Button>
        <Button fullWidth onClick={handleStart}>
          Start Tournament
        </Button>
      </div>
    </AppShell>
  );
}
