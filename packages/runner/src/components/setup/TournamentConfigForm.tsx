import type { TournamentConfig, TournamentFormat, Court } from '@padel/common';
import { Button, generateId } from '@padel/common';
import { resolveConfigDefaults } from '../../utils/resolveConfigDefaults';
import styles from './TournamentConfigForm.module.css';

const MINUTES_PER_POINT = 0.5;
const CHANGEOVER_MINUTES = 3;
const MAX_DURATION_MINUTES = 120;

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

interface TournamentConfigFormProps {
  config: TournamentConfig;
  playerCount: number;
  onUpdate: (update: Partial<TournamentConfig>) => void;
}

export function TournamentConfigForm({ config, playerCount, onUpdate }: TournamentConfigFormProps) {
  const maxCourts = Math.max(1, Math.floor(playerCount / 4));

  // Resolve: what values will actually be used (fills in defaults for empty fields)
  const resolved = resolveConfigDefaults(config, playerCount);
  const effectivePoints = resolved.pointsPerMatch;
  const effectiveRounds = resolved.maxRounds ?? 0;

  // Per-field suggestions: what each field would be if cleared, given the other's current value
  const suggestedRoundsConfig = resolveConfigDefaults({ ...config, maxRounds: null }, playerCount);
  const suggestedPointsConfig = resolveConfigDefaults({ ...config, pointsPerMatch: 0 }, playerCount);
  const suggestedRounds = suggestedRoundsConfig.maxRounds ?? 0;
  const suggestedPoints = suggestedPointsConfig.pointsPerMatch;

  // Duration estimate
  const roundDuration = Math.round(effectivePoints * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
  const estimatedMinutes = effectiveRounds * roundDuration;
  const exceedsLimit = estimatedMinutes > MAX_DURATION_MINUTES;

  // Check if some players will never play
  const playersPerRound = Math.min(config.courts.length * 4, playerCount);
  const minRoundsForAll = playersPerRound > 0 ? Math.ceil(playerCount / playersPerRound) : 0;
  const somePlayersExcluded = playersPerRound < playerCount && effectiveRounds < minRoundsForAll;

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
        <label className={styles.label} htmlFor="config-format">Format</label>
        <select
          id="config-format"
          className={styles.input}
          value={config.format}
          onChange={e => onUpdate({ format: e.target.value as TournamentFormat })}
        >
          <option value="americano">Americano</option>
          <option value="team-americano">Team Americano</option>
          <option value="mexicano">Mexicano</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} id="courts-label">Courts</label>
        <div className={styles.courtList} role="group" aria-labelledby="courts-label">
          {config.courts.map(court => (
            <div key={court.id} className={styles.courtRow}>
              <input
                className={styles.courtInput}
                type="text"
                value={court.name}
                onChange={e => updateCourtName(court.id, e.target.value)}
                aria-label={`Court ${config.courts.indexOf(court) + 1} name`}
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
        <label className={styles.label} htmlFor="config-rounds">Number of rounds</label>
        <input
          id="config-rounds"
          className={styles.input}
          type="number"
          min={1}
          value={config.maxRounds ?? ''}
          placeholder={String(suggestedRounds)}
          onChange={e => {
            const val = e.target.value === '' ? null : parseInt(e.target.value);
            onUpdate({ maxRounds: val && val > 0 ? val : null });
          }}
        />
        <span className={styles.hint}>Recommended: {suggestedRounds} rounds for {playerCount} players on {config.courts.length} court(s)</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="config-points">Points per match</label>
        <input
          id="config-points"
          className={styles.input}
          type="number"
          min={1}
          value={config.pointsPerMatch || ''}
          placeholder={String(suggestedPoints)}
          onChange={e => {
            const v = e.target.value === '' ? 0 : parseInt(e.target.value);
            onUpdate({ pointsPerMatch: isNaN(v) ? 0 : Math.max(0, v) });
          }}
        />
        <span className={styles.hint}>Recommended: {suggestedPoints} points to fit in 2 hours</span>
      </div>

      <div className={styles.estimate}>
        Estimated duration: <strong>{formatDuration(estimatedMinutes)}</strong>
        <span className={styles.estimateBreakdown}>
          ({effectiveRounds} rounds × {roundDuration} min per round)
        </span>
      </div>

      {somePlayersExcluded && (
        <div className={styles.warning}>
          <div className={styles.warningTitle}>Some players won't play</div>
          <div className={styles.warningBody}>
            Only {playersPerRound} of {playerCount} players play each round.
            Need at least <strong>{minRoundsForAll} rounds</strong> for everyone to participate.
          </div>
        </div>
      )}

      {exceedsLimit && (
        <div className={styles.warning}>
          <div className={styles.warningTitle}>May exceed 2 hours</div>
          <div className={styles.warningBody}>
            To fit within 2 hours, try{' '}
            {suggestedPoints !== effectivePoints && (
              <><strong>{suggestedPoints} points</strong> per match or </>
            )}
            <strong>{suggestedRounds} rounds</strong>.
          </div>
        </div>
      )}
    </div>
  );
}
