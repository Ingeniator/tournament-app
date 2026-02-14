import type { TournamentConfig, TournamentFormat, Court } from '@padel/common';
import { Button, generateId, useTranslation } from '@padel/common';
import { resolveConfigDefaults, computeSitOutInfo } from '../../utils/resolveConfigDefaults';
import styles from './TournamentConfigForm.module.css';

const MINUTES_PER_POINT = 0.5;
const CHANGEOVER_MINUTES = 3;
const DEFAULT_DURATION_MINUTES = 120;

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
  const { t } = useTranslation();
  const maxCourts = Math.max(1, Math.floor(playerCount / 4));

  // Resolve: what values will actually be used (fills in defaults for empty fields)
  const resolved = resolveConfigDefaults(config, playerCount);
  const effectivePoints = resolved.pointsPerMatch;
  const effectiveRounds = resolved.maxRounds ?? 1;

  // Per-field suggestions: what each field would be if cleared, given the other's current value
  const suggestedRoundsConfig = resolveConfigDefaults({ ...config, maxRounds: null }, playerCount);
  const suggestedPointsConfig = resolveConfigDefaults({ ...config, pointsPerMatch: 0 }, playerCount);
  const suggestedRounds = suggestedRoundsConfig.maxRounds ?? 1;
  const suggestedPoints = suggestedPointsConfig.pointsPerMatch;

  // Duration estimate
  const durationLimit = config.targetDuration ?? DEFAULT_DURATION_MINUTES;
  const roundDuration = Math.round(effectivePoints * MINUTES_PER_POINT + CHANGEOVER_MINUTES);
  const estimatedMinutes = effectiveRounds * roundDuration;
  const exceedsLimit = estimatedMinutes > durationLimit;

  // Check if some players will never play
  const playersPerRound = Math.min(config.courts.length * 4, playerCount);
  const minRoundsForAll = playersPerRound > 0 ? Math.ceil(playerCount / playersPerRound) : 0;
  const somePlayersExcluded = playersPerRound < playerCount && effectiveRounds < minRoundsForAll;

  // Check if sit-outs are distributed equally
  const sitOutInfo = computeSitOutInfo(playerCount, config.courts.length, effectiveRounds);

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
        <label className={styles.label} htmlFor="config-format">{t('config.format')}</label>
        <select
          id="config-format"
          className={styles.input}
          value={config.format}
          onChange={e => onUpdate({ format: e.target.value as TournamentFormat })}
        >
          <option value="americano">{t('config.formatAmericano')}</option>
          <option value="team-americano">{t('config.formatTeamAmericano')}</option>
          <option value="mexicano">{t('config.formatMexicano')}</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} id="courts-label">{t('config.courts')}</label>
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
                  aria-label={t('config.removeCourt')}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {config.courts.length < maxCourts && (
          <Button variant="ghost" size="small" onClick={addCourt}>
            {t('config.addCourt')}
          </Button>
        )}
        <span className={styles.hint}>
          {t('config.maxCourts', { max: maxCourts, players: playerCount })}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="config-rounds">{t('config.numberOfRounds')}</label>
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
        <span className={styles.hint}>{t('config.recommendedRounds', { rounds: suggestedRounds, players: playerCount, courts: config.courts.length })}</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="config-points">{t('config.pointsPerMatch')}</label>
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
        <span className={styles.hint}>{t('config.recommendedPoints', { points: suggestedPoints, duration: formatDuration(durationLimit) })}</span>
      </div>

      <div className={styles.estimate}>
        {t('config.estimatedDuration')}<strong>{formatDuration(estimatedMinutes)}</strong>
        <span className={styles.estimateBreakdown}>
          {t('config.estimateBreakdown', { rounds: effectiveRounds, minutes: roundDuration })}
        </span>
      </div>

      {somePlayersExcluded && (
        <div className={styles.warning}>
          <div className={styles.warningTitle}>{t('config.somePlayersWontPlay')}</div>
          <div className={styles.warningBody}>
            {t('config.playersPerRound', { playing: playersPerRound, total: playerCount, minRounds: minRoundsForAll })}
          </div>
        </div>
      )}

      {exceedsLimit && (
        <div className={styles.warning}>
          <div className={styles.warningTitle}>{t('config.mayExceed', { duration: formatDuration(durationLimit) })}</div>
          <div className={styles.warningBody}>
            {t('config.fitWithin', { duration: formatDuration(durationLimit) })}{' '}
            {suggestedPoints !== effectivePoints && (
              <><strong>{t('config.pointsSuggestion', { points: suggestedPoints })}</strong></>
            )}
            <strong>{t('config.roundsSuggestion', { rounds: suggestedRounds })}</strong>.
          </div>
        </div>
      )}

      {!sitOutInfo.isEqual && sitOutInfo.sitOutsPerRound > 0 && (
        <div className={styles.warning}>
          <div className={styles.warningTitle}>{t('config.unequalSitOuts')}</div>
          <div className={styles.warningBody}>
            {t('config.sitOutBody', { rounds: effectiveRounds, sitOuts: sitOutInfo.sitOutsPerRound, players: playerCount })}
            {sitOutInfo.nearestFairBelow && sitOutInfo.nearestFairAbove && sitOutInfo.nearestFairBelow !== sitOutInfo.nearestFairAbove ? (
              <> {t('config.trySitOut', { below: sitOutInfo.nearestFairBelow, above: sitOutInfo.nearestFairAbove })}</>
            ) : sitOutInfo.nearestFairAbove ? (
              <> {t('config.trySitOutSingle', { rounds: sitOutInfo.nearestFairAbove })}</>
            ) : sitOutInfo.nearestFairBelow ? (
              <> {t('config.trySitOutSingle', { rounds: sitOutInfo.nearestFairBelow })}</>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
