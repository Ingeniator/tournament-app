import { useState, useEffect } from 'react';
import { Button, Card } from '@padel/common';
import { usePlanner } from '../state/PlannerContext';
import styles from './JoinScreen.module.css';

export function JoinScreen() {
  const { tournament, players, uid, registerPlayer, updateConfirmed, isRegistered, setScreen, organizerName, userName } = usePlanner();
  const [name, setName] = useState(userName ?? '');
  const [registering, setRegistering] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Pre-fill name from profile when it loads
  useEffect(() => {
    if (userName && !name) setName(userName);
  }, [userName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tournament) return null;

  const capacity = tournament.courts.length * 4 + (tournament.extraSpots ?? 0);
  const confirmedCount = players.filter(p => p.confirmed !== false).length;
  const spotsLeft = capacity - confirmedCount;

  const handleRegister = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRegistering(true);
    try {
      await registerPlayer(trimmed);
    } catch {
      // handled silently
    }
    setRegistering(false);
    setName('');
  };

  const myRegistration = uid ? players.find(p => p.id === uid) : undefined;
  const isConfirmed = myRegistration?.confirmed !== false;

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
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack}>&larr;</button>
        <h1 className={styles.title}>{tournament.name}</h1>
      </div>

      {(tournament.date || tournament.place || organizerName) && (
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
          </div>
        </Card>
      )}

      <Card>
        {isRegistered ? (
          <div className={styles.registered}>
            {isConfirmed ? (
              <>
                <div className={styles.checkmark}>&#10003;</div>
                <h3>You're confirmed!</h3>
                <p className={styles.hint}>You'll appear in the player list below</p>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleToggleConfirmed}
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Cancel participation'}
                </Button>
              </>
            ) : (
              <>
                <div className={styles.cancelled}>&#10007;</div>
                <h3>You've cancelled</h3>
                <p className={styles.hint}>You can confirm again at any time</p>
                <Button
                  fullWidth
                  onClick={handleToggleConfirmed}
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Confirm participation'}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className={styles.registerForm}>
            <h3 className={styles.formTitle}>Join this tournament</h3>
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
                <span className={styles.playerName}>{player.name}</span>
                <span className={player.confirmed !== false ? styles.statusConfirmed : styles.statusCancelled}>
                  {player.confirmed !== false ? '\u2713' : '\u2717'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
