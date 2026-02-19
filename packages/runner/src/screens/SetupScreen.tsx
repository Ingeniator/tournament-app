import { useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { getStrategy } from '../strategies';
import { resolveConfigDefaults } from '../utils/resolveConfigDefaults';
import { AppShell } from '../components/layout/AppShell';
import { PlayerInput } from '../components/setup/PlayerInput';
import { PlayerList } from '../components/setup/PlayerList';
import { TournamentConfigForm } from '../components/setup/TournamentConfigForm';
import { Button, Card, useTranslation } from '@padel/common';
import styles from './SetupScreen.module.css';

export function SetupScreen() {
  const { tournament, dispatch } = useTournament();
  const { t } = useTranslation();

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
    if (confirm(t('setup.discardConfirm'))) {
      dispatch({ type: 'RESET_TOURNAMENT' });
    }
  };

  return (
    <AppShell
      title={t('setup.title')}
      headerRight={
        <Button variant="ghost" size="small" onClick={handleBack}>
          {t('setup.cancel')}
        </Button>
      }
    >
      <div className={styles.section}>
        <label className={styles.nameLabel} htmlFor="tournament-name">{t('setup.tournamentName')}</label>
        <input
          id="tournament-name"
          className={styles.nameInput}
          type="text"
          value={tournament.name}
          onChange={e =>
            dispatch({ type: 'UPDATE_NAME', payload: { name: e.target.value } })
          }
          placeholder={t('setup.tournamentNamePlaceholder')}
        />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('setup.players')}</h2>
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
          format={tournament.config.format}
          groupLabels={tournament.config.groupLabels}
          onSetGroup={(playerId, group) =>
            dispatch({ type: 'SET_PLAYER_GROUP', payload: { playerId, group } })
          }
        />
      </div>

      <Card>
        <h2 className={styles.sectionTitle}>{t('setup.settings')}</h2>
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
          {t('setup.playerCount', { count: tournament.players.length })}
        </div>
        <Button fullWidth onClick={handleGenerate} disabled={errors.length > 0}>
          {strategy.hasFixedPartners ? t('setup.setUpTeams') : t('setup.generateSchedule')}
        </Button>
      </div>
    </AppShell>
  );
}
