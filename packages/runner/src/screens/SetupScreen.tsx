import { useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { useRunnerTheme } from '../state/ThemeContext';
import { getStrategy } from '../strategies';
import { resolveConfigDefaults } from '../utils/resolveConfigDefaults';
import { AppShell } from '../components/layout/AppShell';
import { PlayerInput } from '../components/setup/PlayerInput';
import { PlayerList } from '../components/setup/PlayerList';
import { TournamentConfigForm } from '../components/setup/TournamentConfigForm';
import { Button, Card, SkinPicker } from '@padel/common';
import styles from './SetupScreen.module.css';

export function SetupScreen() {
  const { tournament, dispatch } = useTournament();
  const { skin, setSkin } = useRunnerTheme();

  const errors = useMemo(() => {
    if (!tournament) return [];
    const strategy = getStrategy(tournament.config.format);
    const resolvedConfig = resolveConfigDefaults(tournament.config, tournament.players.length);
    return strategy.validateSetup(tournament.players, resolvedConfig);
  }, [tournament]);

  if (!tournament) return null;

  const strategy = getStrategy(tournament.config.format);

  const handleGenerate = () => {
    if (errors.length > 0) return;
    if (strategy.hasFixedPartners) {
      dispatch({ type: 'SET_TEAMS' });
    } else {
      dispatch({ type: 'GENERATE_SCHEDULE' });
    }
  };

  const handleBack = () => {
    if (confirm('Discard this tournament?')) {
      dispatch({ type: 'RESET_TOURNAMENT' });
    }
  };

  return (
    <AppShell
      title="Setup"
      headerRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SkinPicker skin={skin} onSelect={setSkin} />
          <Button variant="ghost" size="small" onClick={handleBack}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className={styles.section}>
        <label className={styles.nameLabel} htmlFor="tournament-name">Tournament name</label>
        <input
          id="tournament-name"
          className={styles.nameInput}
          type="text"
          value={tournament.name}
          onChange={e =>
            dispatch({ type: 'UPDATE_NAME', payload: { name: e.target.value } })
          }
          placeholder="Tournament name"
        />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Players</h2>
        <PlayerInput
          onAdd={name => dispatch({ type: 'ADD_PLAYER', payload: { name } })}
          onBulkAdd={names =>
            dispatch({ type: 'ADD_PLAYERS_BULK', payload: { names } })
          }
        />
        <PlayerList
          players={tournament.players}
          onRemove={playerId =>
            dispatch({ type: 'REMOVE_PLAYER', payload: { playerId } })
          }
        />
      </div>

      <Card>
        <h2 className={styles.sectionTitle}>Settings</h2>
        <TournamentConfigForm
          config={tournament.config}
          playerCount={tournament.players.length}
          onUpdate={update => dispatch({ type: 'UPDATE_CONFIG', payload: update })}
        />
      </Card>

      <div className={styles.footer}>
        {errors.length > 0 && (
          <div className={styles.errors}>
            {errors.map((err, i) => (
              <div key={i} className={styles.error}>
                {err}
              </div>
            ))}
          </div>
        )}
        <div className={styles.playerCount}>
          {tournament.players.length} player(s) added
        </div>
        <Button fullWidth onClick={handleGenerate} disabled={errors.length > 0}>
          {strategy.hasFixedPartners ? 'Set up Teams' : 'Generate Schedule'}
        </Button>
      </div>
    </AppShell>
  );
}
