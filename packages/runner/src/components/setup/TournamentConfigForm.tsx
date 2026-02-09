import type { TournamentConfig, TournamentFormat, Court } from '@padel/common';
import { Button, generateId } from '@padel/common';
import styles from './TournamentConfigForm.module.css';

interface TournamentConfigFormProps {
  config: TournamentConfig;
  playerCount: number;
  onUpdate: (update: Partial<TournamentConfig>) => void;
}

export function TournamentConfigForm({ config, playerCount, onUpdate }: TournamentConfigFormProps) {
  const maxCourts = Math.max(1, Math.floor(playerCount / 4));
  const defaultRounds = Math.max(1, playerCount - 1);

  const addCourt = () => {
    if (config.courts.length >= maxCourts) return;
    const newCourt: Court = {
      id: generateId(),
      name: `Court ${config.courts.length + 1}`,
    };
    onUpdate({ courts: [...config.courts, newCourt] });
  };

  const removeCourt = (courtId: string) => {
    if (config.courts.length <= 1) return;
    onUpdate({ courts: config.courts.filter(c => c.id !== courtId) });
  };

  const updateCourtName = (courtId: string, name: string) => {
    onUpdate({
      courts: config.courts.map(c => (c.id === courtId ? { ...c, name } : c)),
    });
  };

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Format</label>
        <select
          className={styles.input}
          value={config.format}
          onChange={e => onUpdate({ format: e.target.value as TournamentFormat })}
        >
          <option value="americano">Americano</option>
          <option value="mexicano">Mexicano</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Points per match</label>
        <input
          className={styles.input}
          type="number"
          min={1}
          value={config.pointsPerMatch}
          onChange={e => onUpdate({ pointsPerMatch: Math.max(1, parseInt(e.target.value) || 1) })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Courts</label>
        <div className={styles.courtList}>
          {config.courts.map(court => (
            <div key={court.id} className={styles.courtRow}>
              <input
                className={styles.courtInput}
                type="text"
                value={court.name}
                onChange={e => updateCourtName(court.id, e.target.value)}
              />
              {config.courts.length > 1 && (
                <button
                  className={styles.removeCourt}
                  onClick={() => removeCourt(court.id)}
                  aria-label="Remove court"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {config.courts.length < maxCourts && (
          <Button variant="ghost" size="small" onClick={addCourt}>
            + Add court
          </Button>
        )}
        <span className={styles.hint}>
          Max {maxCourts} court(s) for {playerCount} players
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Number of rounds</label>
        <input
          className={styles.input}
          type="number"
          min={1}
          value={config.maxRounds ?? defaultRounds}
          onChange={e => {
            const val = parseInt(e.target.value);
            onUpdate({ maxRounds: val > 0 ? val : null });
          }}
        />
        <span className={styles.hint}>Default: {defaultRounds} (players count minus one)</span>
      </div>
    </div>
  );
}
