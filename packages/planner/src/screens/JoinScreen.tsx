import { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import { getPlayerStatuses } from '../utils/playerStatus';
import { downloadICS } from '../utils/icsExport';
import styles from './JoinScreen.module.css';

export function JoinScreen() {
  const { tournament, players, uid, registerPlayer, updateConfirmed, updatePlayerName, isRegistered, setScreen, organizerName, userName, telegramUser } = usePlanner();
  const [name, setName] = useState(userName ?? telegramUser?.displayName ?? '');
  const [registering, setRegistering] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Pre-fill name from profile or Telegram when it loads
  useEffect(() => {
    if (!name) {
      const prefill = userName ?? telegramUser?.displayName;
      if (prefill) setName(prefill);
    }
  }, [userName, telegramUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-register Telegram users (only once per mount to prevent
  // re-registration loop when organizer removes a player)
  const autoRegistered = useRef(false);
  useEffect(() => {
    if (!telegramUser || isRegistered || !uid || !tournament || autoRegistered.current) return;
    autoRegistered.current = true;
    const regName = userName || telegramUser.displayName;
    registerPlayer(regName);
  }, [telegramUser, isRegistered, uid, tournament]); // eslint-disable-line react-hooks/exhaustive-deps

  const capacity = tournament ? tournament.courts.length * 4 + (tournament.extraSpots ?? 0) : 0;
  const statuses = useMemo(() => getPlayerStatuses(players, capacity), [players, capacity]);
  const myRegistration = uid ? players.find(p => p.id === uid) : undefined;
  const myStatus = myRegistration ? statuses.get(myRegistration.id) : undefined;

  // Compute reserve position (1-based) for current player
  const myReservePosition = useMemo(() => {
    if (myStatus !== 'reserve' || !myRegistration) return 0;
    const confirmed = players.filter(p => p.confirmed !== false);
    const sorted = [...confirmed].sort((a, b) => a.timestamp - b.timestamp);
    const reservePlayers = sorted.slice(capacity);
    return reservePlayers.findIndex(p => p.id === myRegistration.id) + 1;
  }, [myStatus, myRegistration, players, capacity]);

  if (!tournament) return null;

  const confirmedCount = players.filter(p => p.confirmed !== false).length;
  const spotsLeft = capacity - confirmedCount;
  const reserveCount = [...statuses.values()].filter(s => s === 'reserve').length;
  const isConfirmed = myRegistration?.confirmed !== false;

  const registeringRef = useRef(false);
  const handleRegister = async () => {
    const trimmed = name.trim();
    if (!trimmed || registeringRef.current) return;
    registeringRef.current = true;
    setRegistering(true);
    try {
      await registerPlayer(trimmed);
    } catch {
      // handled silently
    }
    setRegistering(false);
    registeringRef.current = false;
    setName('');
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || !uid || trimmed === myRegistration?.name) {
      setEditingName(false);
      return;
    }
    await updatePlayerName(uid, trimmed);
    setEditingName(false);
  };

  const handleToggleConfirmed = async () => {
    setUpdating(true);
    try {
      await updateConfirmed(!isConfirmed);
    } catch {
      // handled silently
    }
    setUpdating(false);
  };

  const handleBack = () => {
    setScreen('home');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label="Back">&larr;</button>
        <h1 className={styles.title}>{tournament.name}</h1>
      </header>

      <main>

      {(tournament.date || tournament.place || organizerName || tournament.chatLink || tournament.description) && (
        <Card>
          <div className={styles.detailsList}>
            {tournament.date && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date</span>
                <span>{new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {tournament.place && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Place</span>
                <span>{tournament.place}</span>
              </div>
            )}
            {organizerName && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Organizer</span>
                <span>{organizerName}</span>
              </div>
            )}
            {tournament.chatLink && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Group chat</span>
                <a href={tournament.chatLink.match(/^https?:\/\//) ? tournament.chatLink : `https://${tournament.chatLink}`} target="_blank" rel="noopener noreferrer" className={styles.chatLink}>
                  Join group chat
                </a>
              </div>
            )}
            {tournament.description && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Description</span>
                <p className={styles.description}>{tournament.description}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        {isRegistered ? (
          <div className={styles.registered}>
            {isConfirmed && myStatus === 'reserve' ? (
              <>
                <div className={styles.reserveIcon}>&#9888;</div>
                <h3>You're on the reserve list</h3>
                <p className={styles.hint}>Reserve #{myReservePosition} — you'll move up if someone cancels</p>
              </>
            ) : isConfirmed ? (
              <>
                <div className={styles.checkmark}>&#10003;</div>
                <h3>You're confirmed!</h3>
                <p className={styles.hint}>You'll appear in the player list below</p>
              </>
            ) : (
              <>
                <div className={styles.cancelled}>&#10007;</div>
                <h3>You've cancelled</h3>
                <p className={styles.hint}>You can confirm again at any time</p>
              </>
            )}

            {myRegistration && !editingName && (
              <div className={styles.registeredName}>
                <span className={styles.registeredAs}>Registered as <strong>{myRegistration.name}</strong></span>
                <button
                  className={styles.editBtn}
                  onClick={() => { setNameDraft(myRegistration.name); setEditingName(true); }}
                  aria-label="Edit name"
                >
                  &#x270E;
                </button>
              </div>
            )}
            {editingName && (
              <div className={styles.editNameRow}>
                <input
                  className={styles.nameInput}
                  type="text"
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  autoFocus
                />
                <Button size="small" onClick={handleSaveName} disabled={!nameDraft.trim()}>
                  Save
                </Button>
              </div>
            )}

            {isConfirmed ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={handleToggleConfirmed}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Cancel participation'}
              </Button>
            ) : (
              <Button
                fullWidth
                onClick={handleToggleConfirmed}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Confirm participation'}
              </Button>
            )}

            {isConfirmed && tournament.date && (
              <button
                className={styles.calendarBtn}
                onClick={() => downloadICS(tournament)}
              >
                &#128197; Add to Calendar
              </button>
            )}
          </div>
        ) : (
          <div className={styles.registerForm}>
            <h3 className={styles.formTitle}>Join this tournament as</h3>
            <input
              className={styles.nameInput}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              autoFocus
            />
            <Button
              fullWidth
              onClick={handleRegister}
              disabled={registering || !name.trim()}
            >
              {registering ? 'Registering...' : 'Register'}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h3 className={styles.sectionTitle}>
          Players ({confirmedCount} / {capacity})
        </h3>
        <p className={styles.capacityHint}>
          {spotsLeft > 0
            ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`
            : reserveCount > 0
              ? `Full \u00b7 ${reserveCount} on reserve list`
              : 'Full'}
          {` \u00b7 ${tournament.courts.length} court${tournament.courts.length !== 1 ? 's' : ''} \u00d7 4${(tournament.extraSpots ?? 0) > 0 ? ` + ${tournament.extraSpots}` : ''}`}
        </p>
        {players.length === 0 ? (
          <p className={styles.empty}>No players yet. Be the first!</p>
        ) : (
          <div className={styles.playerList}>
            {players.map((player, i) => (
              <div key={player.id} className={styles.playerItem}>
                <span className={styles.playerNum}>{i + 1}</span>
                <span className={styles.playerName}>
                  {player.telegramUsername ? (
                    <a
                      href={`https://t.me/${player.telegramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.playerLink}
                    >
                      {player.name}
                    </a>
                  ) : (
                    player.name
                  )}
                  {statuses.get(player.id) === 'reserve' && (
                    <span className={styles.reserveBadge}>reserve</span>
                  )}
                </span>
                <span className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}>
                  {player.confirmed !== false ? '\u2713' : '\u2717'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      </main>
    </div>
  );
}
