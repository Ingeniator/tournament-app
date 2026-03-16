import { useReducer, useMemo, type Dispatch, type ClipboardEvent } from 'react';
import type { Tournament } from '@padel/common';
import { Button, Card, NO_COLOR, getClubColor, useTranslation, parsePlayerList, formatHasGroups, formatHasClubs } from '@padel/common';
import type { TournamentAction } from '../../state/actions';
import styles from '../../screens/SettingsScreen.module.css';

interface PlayerListProps {
  tournament: Tournament;
  dispatch: Dispatch<TournamentAction>;
  showToast: (msg: string) => void;
}

type EditMode =
  | { type: 'idle' }
  | { type: 'editing'; playerId: string; name: string; group: 'A' | 'B' }
  | { type: 'replacing'; playerId: string; name: string }
  | { type: 'adding'; name: string; group: 'A' | 'B' };

function editReducer(state: EditMode, action:
  | { type: 'START_EDIT'; playerId: string; name: string; group: 'A' | 'B' }
  | { type: 'SET_EDIT_NAME'; name: string }
  | { type: 'SET_EDIT_GROUP'; group: 'A' | 'B' }
  | { type: 'START_REPLACE'; playerId: string }
  | { type: 'SET_REPLACE_NAME'; name: string }
  | { type: 'START_ADD' }
  | { type: 'SET_ADD_NAME'; name: string }
  | { type: 'SET_ADD_GROUP'; group: 'A' | 'B' }
  | { type: 'CANCEL' }
): EditMode {
  switch (action.type) {
    case 'START_EDIT': return { type: 'editing', playerId: action.playerId, name: action.name, group: action.group };
    case 'SET_EDIT_NAME': return state.type === 'editing' ? { ...state, name: action.name } : state;
    case 'SET_EDIT_GROUP': return state.type === 'editing' ? { ...state, group: action.group } : state;
    case 'START_REPLACE': return { type: 'replacing', playerId: action.playerId, name: '' };
    case 'SET_REPLACE_NAME': return state.type === 'replacing' ? { ...state, name: action.name } : state;
    case 'START_ADD': return { type: 'adding', name: '', group: 'A' };
    case 'SET_ADD_NAME': return state.type === 'adding' ? { ...state, name: action.name } : state;
    case 'SET_ADD_GROUP': return state.type === 'adding' ? { ...state, group: action.group } : state;
    case 'CANCEL': return { type: 'idle' };
  }
}

export function PlayerList({ tournament, dispatch, showToast }: PlayerListProps) {
  const { t } = useTranslation();
  const [mode, editDispatch] = useReducer(editReducer, { type: 'idle' } as EditMode);

  const isMixicano = formatHasGroups(tournament.config.format);

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
    if (mode.type !== 'editing') return;
    const trimmed = mode.name.trim();
    if (trimmed && trimmed !== tournament.players.find(p => p.id === playerId)?.name) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { playerId, name: trimmed } });
    }
    editDispatch({ type: 'CANCEL' });
  };

  const handleReplacePlayer = (oldPlayerId: string) => {
    if (mode.type !== 'replacing') return;
    const trimmed = mode.name.trim();
    if (!trimmed) return;
    dispatch({ type: 'REPLACE_PLAYER', payload: { oldPlayerId, newPlayerName: trimmed } });
    editDispatch({ type: 'CANCEL' });
    showToast(t('settings.playerReplaced'));
  };

  const handleAddPlayer = () => {
    if (mode.type !== 'adding') return;
    const trimmed = mode.name.trim();
    if (!trimmed) return;
    const group = formatHasGroups(tournament.config.format) ? mode.group : undefined;
    dispatch({ type: 'ADD_PLAYER_LIVE', payload: { name: trimmed, group } });
    editDispatch({ type: 'CANCEL' });
    showToast(t('settings.playerAdded'));
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n') && !text.includes(',')) return;
    e.preventDefault();
    const names = parsePlayerList(text);
    if (names.length === 0) return;
    const group = mode.type === 'adding' && formatHasGroups(tournament.config.format) ? mode.group : undefined;
    for (const name of names) {
      dispatch({ type: 'ADD_PLAYER_LIVE', payload: { name, group } });
    }
    editDispatch({ type: 'CANCEL' });
    showToast(t('settings.playerAdded'));
  };

  return (
    <Card>
      <h3 className={styles.sectionTitle}>{t('settings.playersTitle', { count: tournament.players.length })}</h3>
      <div className={styles.playerList}>
        {tournament.players.map((player, i) => {
          const isEditing = mode.type === 'editing' && mode.playerId === player.id;
          const isReplacing = mode.type === 'replacing' && mode.playerId === player.id;

          return (
            <div key={player.id} className={styles.playerItem}>
              <span className={styles.playerNum}>{i + 1}</span>

              {isEditing ? (
                <div className={styles.playerEditPanel}>
                  <input
                    className={styles.editInput}
                    type="text"
                    value={mode.type === 'editing' ? mode.name : ''}
                    onChange={e => editDispatch({ type: 'SET_EDIT_NAME', name: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSave(player.id);
                      if (e.key === 'Escape') editDispatch({ type: 'CANCEL' });
                    }}
                    onBlur={() => handleRenameSave(player.id)}
                    autoFocus
                  />
                  {isMixicano && (
                    <div className={styles.groupSelector}>
                      <button
                        className={`${styles.groupBtn} ${(mode.type === 'editing' ? mode.group : 'A') === 'A' ? styles.groupBtnActive : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          editDispatch({ type: 'SET_EDIT_GROUP', group: 'A' });
                          if (player.group !== 'A') {
                            dispatch({ type: 'SET_PLAYER_GROUP', payload: { playerId: player.id, group: 'A' } });
                          }
                        }}
                      >
                        {tournament.config.groupLabels?.[0] || t('config.groupLabelAPlaceholder')}
                      </button>
                      <button
                        className={`${styles.groupBtn} ${(mode.type === 'editing' ? mode.group : 'A') === 'B' ? styles.groupBtnActive : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          editDispatch({ type: 'SET_EDIT_GROUP', group: 'B' });
                          if (player.group !== 'B') {
                            dispatch({ type: 'SET_PLAYER_GROUP', payload: { playerId: player.id, group: 'B' } });
                          }
                        }}
                      >
                        {tournament.config.groupLabels?.[1] || t('config.groupLabelBPlaceholder')}
                      </button>
                    </div>
                  )}
                  <label className={styles.availabilityToggle} onMouseDown={e => e.preventDefault()}>
                    <input
                      type="checkbox"
                      className={styles.toggleInput}
                      checked={!player.unavailable}
                      onChange={() => {
                        dispatch({
                          type: 'TOGGLE_PLAYER_AVAILABILITY',
                          payload: { playerId: player.id },
                        });
                      }}
                    />
                    <span className={styles.toggleTrack}>
                      <span className={styles.toggleThumb} />
                    </span>
                    <span className={styles.toggleLabel}>
                      {player.unavailable ? t('settings.unavailable') : t('settings.available')}
                    </span>
                  </label>
                  {tournament.phase === 'in-progress' && (
                    <button
                      className={styles.replaceBtn}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        editDispatch({ type: 'START_REPLACE', playerId: player.id });
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
                    value={mode.type === 'replacing' ? mode.name : ''}
                    placeholder={t('settings.newPlayerNamePlaceholder')}
                    onChange={e => editDispatch({ type: 'SET_REPLACE_NAME', name: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleReplacePlayer(player.id);
                      if (e.key === 'Escape') editDispatch({ type: 'CANCEL' });
                    }}
                    autoFocus
                  />
                  <div className={styles.replaceActions}>
                    <Button size="small" onClick={() => handleReplacePlayer(player.id)} disabled={!(mode.type === 'replacing' && mode.name.trim())}>
                      {t('settings.replace')}
                    </Button>
                    <Button size="small" variant="ghost" onClick={() => editDispatch({ type: 'CANCEL' })}>
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
                    onClick: () => { editDispatch({ type: 'START_EDIT', playerId: player.id, name: player.name, group: player.group ?? 'A' }); },
                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editDispatch({ type: 'START_EDIT', playerId: player.id, name: player.name, group: player.group ?? 'A' }); } },
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
                  {formatHasClubs(tournament.config.format) && player.clubId && tournament.clubs && (() => {
                    const clubIdx = tournament.clubs.findIndex(c => c.id === player.clubId);
                    if (clubIdx < 0) return null;
                    return (
                      <span
                        className={styles.clubBadge}
                        style={getClubColor(tournament.clubs[clubIdx], clubIdx) !== NO_COLOR ? { backgroundColor: getClubColor(tournament.clubs[clubIdx], clubIdx) } : undefined}
                      >
                        {tournament.clubs[clubIdx].name}
                      </span>
                    );
                  })()}
                  {player.unavailable && (
                    <span className={styles.statusBadge}>{t('settings.out')}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tournament.phase === 'completed' ? null : mode.type === 'adding' ? (
        <div className={styles.addPlayerPanel}>
          <input
            className={styles.editInput}
            type="text"
            placeholder={t('settings.newPlayerPlaceholder')}
            value={mode.type === 'adding' ? mode.name : ''}
            onChange={e => editDispatch({ type: 'SET_ADD_NAME', name: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddPlayer();
              if (e.key === 'Escape') editDispatch({ type: 'CANCEL' });
            }}
            onPaste={handlePaste}
            autoFocus
          />
          {formatHasGroups(tournament.config.format) && (
            <div className={styles.groupSelector}>
              <button
                className={`${styles.groupBtn} ${(mode.type === 'adding' ? mode.group : 'A') === 'A' ? styles.groupBtnActive : ''}`}
                onClick={() => editDispatch({ type: 'SET_ADD_GROUP', group: 'A' })}
              >
                {tournament.config.groupLabels?.[0] || t('config.groupLabelAPlaceholder')}
              </button>
              <button
                className={`${styles.groupBtn} ${(mode.type === 'adding' ? mode.group : 'A') === 'B' ? styles.groupBtnActive : ''}`}
                onClick={() => editDispatch({ type: 'SET_ADD_GROUP', group: 'B' })}
              >
                {tournament.config.groupLabels?.[1] || t('config.groupLabelBPlaceholder')}
              </button>
            </div>
          )}
          <div className={styles.addPlayerActions}>
            <Button size="small" onClick={handleAddPlayer} disabled={!(mode.type === 'adding' && mode.name.trim())}>
              {t('settings.add')}
            </Button>
            <Button size="small" variant="ghost" onClick={() => editDispatch({ type: 'CANCEL' })}>
              {t('settings.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="small"
          fullWidth
          onClick={() => { editDispatch({ type: 'START_ADD' }); }}
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
