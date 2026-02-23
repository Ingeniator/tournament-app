import { useState, useMemo, type Dispatch } from 'react';
import type { Tournament } from '@padel/common';
import { Button, Card, useTranslation } from '@padel/common';
import type { TournamentAction } from '../../state/actions';
import styles from '../../screens/SettingsScreen.module.css';

interface PlayerListProps {
  tournament: Tournament;
  dispatch: Dispatch<TournamentAction>;
  showToast: (msg: string) => void;
}

export function PlayerList({ tournament, dispatch, showToast }: PlayerListProps) {
  const { t } = useTranslation();
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerGroup, setEditPlayerGroup] = useState<'A' | 'B'>('A');
  const [replacingPlayerId, setReplacingPlayerId] = useState<string | null>(null);
  const [replacePlayerName, setReplacePlayerName] = useState('');
  const [addPlayerName, setAddPlayerName] = useState('');
  const [addPlayerGroup, setAddPlayerGroup] = useState<'A' | 'B'>('A');
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const isMixicano = tournament.config.format === 'mixicano';

  const groupWarning = useMemo(() => {
    if (!isMixicano) return null;
    const groupA = tournament.players.filter(p => p.group === 'A' && !p.unavailable);
    const groupB = tournament.players.filter(p => p.group === 'B' && !p.unavailable);
    if (groupA.length >= 2 && groupB.length >= 2 && groupA.length !== groupB.length) {
      return t('settings.groupWarning', { a: String(groupA.length), b: String(groupB.length) });
    }
    return null;
  }, [tournament, isMixicano, t]);

  const handleRenameSave = (playerId: string) => {
    const trimmed = editPlayerName.trim();
    if (trimmed && trimmed !== tournament.players.find(p => p.id === playerId)?.name) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { playerId, name: trimmed } });
    }
    setEditingPlayerId(null);
  };

  const handleReplacePlayer = (oldPlayerId: string) => {
    const trimmed = replacePlayerName.trim();
    if (!trimmed) return;
    dispatch({ type: 'REPLACE_PLAYER', payload: { oldPlayerId, newPlayerName: trimmed } });
    setReplacingPlayerId(null);
    setReplacePlayerName('');
    showToast(t('settings.playerReplaced'));
  };

  const handleAddPlayer = () => {
    const trimmed = addPlayerName.trim();
    if (!trimmed) return;
    if (tournament.phase === 'in-progress') {
      const group = tournament.config.format === 'mixicano' ? addPlayerGroup : undefined;
      dispatch({ type: 'ADD_PLAYER_LIVE', payload: { name: trimmed, group } });
    } else {
      dispatch({ type: 'ADD_PLAYER', payload: { name: trimmed } });
    }
    setAddPlayerName('');
    setShowAddPlayer(false);
    showToast(t('settings.playerAdded'));
  };

  return (
    <Card>
      <h3 className={styles.sectionTitle}>{t('settings.playersTitle', { count: tournament.players.length })}</h3>
      <div className={styles.playerList}>
        {tournament.players.map((player, i) => {
          const isEditing = editingPlayerId === player.id;
          const isReplacing = replacingPlayerId === player.id;

          return (
            <div key={player.id} className={styles.playerItem}>
              <span className={styles.playerNum}>{i + 1}</span>

              {isEditing ? (
                <div className={styles.playerEditPanel}>
                  <input
                    className={styles.editInput}
                    type="text"
                    value={editPlayerName}
                    onChange={e => setEditPlayerName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSave(player.id);
                      if (e.key === 'Escape') setEditingPlayerId(null);
                    }}
                    onBlur={() => handleRenameSave(player.id)}
                    autoFocus
                  />
                  {isMixicano && (
                    <div className={styles.groupSelector}>
                      <button
                        className={`${styles.groupBtn} ${editPlayerGroup === 'A' ? styles.groupBtnActive : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setEditPlayerGroup('A');
                          if (player.group !== 'A') {
                            dispatch({ type: 'SET_PLAYER_GROUP', payload: { playerId: player.id, group: 'A' } });
                          }
                        }}
                      >
                        {tournament.config.groupLabels?.[0] || t('config.groupLabelAPlaceholder')}
                      </button>
                      <button
                        className={`${styles.groupBtn} ${editPlayerGroup === 'B' ? styles.groupBtnActive : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setEditPlayerGroup('B');
                          if (player.group !== 'B') {
                            dispatch({ type: 'SET_PLAYER_GROUP', payload: { playerId: player.id, group: 'B' } });
                          }
                        }}
                      >
                        {tournament.config.groupLabels?.[1] || t('config.groupLabelBPlaceholder')}
                      </button>
                    </div>
                  )}
                  <button
                    className={`${styles.availabilityToggle} ${player.unavailable ? styles.toggleUnavailable : styles.toggleAvailable}`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      dispatch({
                        type: 'TOGGLE_PLAYER_AVAILABILITY',
                        payload: { playerId: player.id },
                      });
                    }}
                  >
                    {player.unavailable ? t('settings.unavailable') : t('settings.available')}
                  </button>
                  {tournament.phase === 'in-progress' && (
                    <button
                      className={styles.replaceBtn}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setEditingPlayerId(null);
                        setReplacingPlayerId(player.id);
                        setReplacePlayerName('');
                      }}
                    >
                      {t('settings.replaceWith')}
                    </button>
                  )}
                </div>
              ) : isReplacing ? (
                <div className={styles.playerEditPanel}>
                  <div className={styles.replaceLabel}>
                    {t('settings.replaceLabel', { name: player.name })}
                  </div>
                  <input
                    className={styles.editInput}
                    type="text"
                    value={replacePlayerName}
                    placeholder={t('settings.newPlayerNamePlaceholder')}
                    onChange={e => setReplacePlayerName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleReplacePlayer(player.id);
                      if (e.key === 'Escape') setReplacingPlayerId(null);
                    }}
                    autoFocus
                  />
                  <div className={styles.replaceActions}>
                    <Button size="small" onClick={() => handleReplacePlayer(player.id)} disabled={!replacePlayerName.trim()}>
                      {t('settings.replace')}
                    </Button>
                    <Button size="small" variant="ghost" onClick={() => setReplacingPlayerId(null)}>
                      {t('settings.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.playerNameRow}
                  {...(tournament.phase !== 'completed' ? {
                    role: 'button' as const,
                    tabIndex: 0,
                    onClick: () => { setEditPlayerName(player.name); setEditPlayerGroup(player.group ?? 'A'); setEditingPlayerId(player.id); },
                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditPlayerName(player.name); setEditPlayerGroup(player.group ?? 'A'); setEditingPlayerId(player.id); } },
                  } : {})}
                >
                  <span className={`${styles.playerName} ${player.unavailable ? styles.playerInactive : ''}`}>
                    {player.name}
                  </span>
                  {isMixicano && player.group && (
                    <span className={`${styles.groupBadge} ${player.group === 'A' ? styles.groupBadgeA : styles.groupBadgeB}`}>
                      {player.group === 'A' ? (tournament.config.groupLabels?.[0] || 'A') : (tournament.config.groupLabels?.[1] || 'B')}
                    </span>
                  )}
                  {player.unavailable && (
                    <span className={styles.statusBadge}>{t('settings.out')}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tournament.phase === 'completed' ? null : showAddPlayer ? (
        <div className={styles.addPlayerPanel}>
          <input
            className={styles.editInput}
            type="text"
            placeholder={t('settings.newPlayerPlaceholder')}
            value={addPlayerName}
            onChange={e => setAddPlayerName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddPlayer();
              if (e.key === 'Escape') setShowAddPlayer(false);
            }}
            autoFocus
          />
          {tournament.config.format === 'mixicano' && (
            <div className={styles.groupSelector}>
              <button
                className={`${styles.groupBtn} ${addPlayerGroup === 'A' ? styles.groupBtnActive : ''}`}
                onClick={() => setAddPlayerGroup('A')}
              >
                {tournament.config.groupLabels?.[0] || t('config.groupLabelAPlaceholder')}
              </button>
              <button
                className={`${styles.groupBtn} ${addPlayerGroup === 'B' ? styles.groupBtnActive : ''}`}
                onClick={() => setAddPlayerGroup('B')}
              >
                {tournament.config.groupLabels?.[1] || t('config.groupLabelBPlaceholder')}
              </button>
            </div>
          )}
          <div className={styles.addPlayerActions}>
            <Button size="small" onClick={handleAddPlayer} disabled={!addPlayerName.trim()}>
              {t('settings.add')}
            </Button>
            <Button size="small" variant="ghost" onClick={() => setShowAddPlayer(false)}>
              {t('settings.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="small"
          fullWidth
          onClick={() => { setShowAddPlayer(true); setAddPlayerGroup('A'); }}
          style={{ marginTop: 'var(--space-sm)' }}
        >
          {t('settings.addPlayer')}
        </Button>
      )}
      {groupWarning && (
        <div className={styles.groupWarning}>{groupWarning}</div>
      )}
    </Card>
  );
}
