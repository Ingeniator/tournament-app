import { useRef } from 'react';
import { useTranslation, resolveConfigDefaults, computeSitOutInfo, formatHasClubs, MINUTES_PER_POINT, MINUTES_PER_GAME, MINUTES_PER_SET, CHANGEOVER_MINUTES } from '@padel/common';
import type { PlannerTournament } from '@padel/common';
import { CollapsibleSection } from './CollapsibleSection';
import styles from '../../screens/OrganizerScreen.module.css';

const DEFAULT_DURATION_MINUTES = 120;

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

interface MatchSettingsSectionProps {
  tournament: PlannerTournament;
  playerCount: number;
  confirmedCount: number;
  capacity: number;
  updateTournament: (updates: Record<string, unknown>) => Promise<void>;
  showToast: (msg: string) => void;
}

export function MatchSettingsSection({ tournament, playerCount, confirmedCount, capacity, updateTournament, showToast }: MatchSettingsSectionProps) {
  const { t } = useTranslation();
  const lastAutoSwitchRef = useRef(false);

  const clubCount = formatHasClubs(tournament.format) ? (tournament.clubs?.length ?? 0) : undefined;
  const resolved = resolveConfigDefaults({
    format: tournament.format,
    pointsPerMatch: tournament.pointsPerMatch ?? 0,
    courts: tournament.courts,
    maxRounds: tournament.maxRounds ?? null,
    targetDuration: tournament.duration,
    scoringMode: tournament.scoringMode,
    minutesPerRound: tournament.minutesPerRound,
  }, playerCount, clubCount);

  const isGamesMode = resolved.scoringMode === 'games';
  const isSetsMode = resolved.scoringMode === 'sets';
  const isTimedMode = resolved.scoringMode === 'timed';
  const minutesPer = isSetsMode ? MINUTES_PER_SET : isGamesMode ? MINUTES_PER_GAME : MINUTES_PER_POINT;
  const effectivePoints = resolved.pointsPerMatch;
  const effectiveRounds = resolved.maxRounds ?? 1;

  const autoSwitchedToGames = tournament.scoringMode === undefined && isGamesMode;
  lastAutoSwitchRef.current = autoSwitchedToGames;

  // Per-field suggestions
  const suggestedRoundsConfig = resolveConfigDefaults({ ...resolved, maxRounds: null, pointsPerMatch: tournament.pointsPerMatch ?? 0 }, playerCount, clubCount);
  const suggestedPointsConfig = resolveConfigDefaults({ ...resolved, pointsPerMatch: 0, maxRounds: tournament.maxRounds ?? null }, playerCount, clubCount);
  const suggestedRounds = suggestedRoundsConfig.maxRounds ?? 1;
  const suggestedMinutes = suggestedRoundsConfig.minutesPerRound ?? 20;
  const suggestedPoints = suggestedPointsConfig.pointsPerMatch;

  const clubFixedRounds = clubCount && clubCount >= 2
    ? (clubCount % 2 === 0 ? clubCount - 1 : clubCount)
    : null;

  const timedRoundDuration = resolved.minutesPerRound ?? 20;
  const roundDuration = isTimedMode ? timedRoundDuration : Math.round(effectivePoints * minutesPer + CHANGEOVER_MINUTES);
  const estimatedMinutes = effectiveRounds * roundDuration;
  const estimatedH = Math.floor(estimatedMinutes / 60);
  const estimatedM = Math.round(estimatedMinutes % 60);
  const estimatedStr = estimatedH > 0
    ? (estimatedM > 0 ? `~${estimatedH}h ${estimatedM}min` : `~${estimatedH}h`)
    : `~${estimatedM}min`;

  const matchSettingsSummary = isTimedMode
    ? `${effectiveRounds} rounds \u00b7 ${timedRoundDuration} min \u00b7 ${estimatedStr}`
    : `${effectiveRounds} rounds \u00b7 ${effectivePoints} ${isSetsMode ? 'sets' : isGamesMode ? 'games' : 'pts'} \u00b7 ${estimatedStr}`;

  const durationLimit = tournament.duration ?? DEFAULT_DURATION_MINUTES;
  const exceedsLimit = estimatedMinutes > durationLimit;

  const playersPerRound = Math.min(tournament.courts.length * 4, playerCount);
  const minRoundsForAll = playersPerRound > 0 ? Math.ceil(playerCount / playersPerRound) : 0;
  const somePlayersExcluded = playersPerRound < playerCount && effectiveRounds < minRoundsForAll;

  const sitOutInfo = computeSitOutInfo(playerCount, tournament.courts.length, effectiveRounds);

  return (
    <CollapsibleSection
      title={t('organizer.matchSettings')}
      summary={matchSettingsSummary}
      defaultOpen={false}
    >
      <div className={styles.configGrid}>
        <label className={styles.configLabel}>{t('organizer.scoringMode')}</label>
        <select
          className={styles.select}
          value={isTimedMode ? 'timed' : isSetsMode ? 'sets' : isGamesMode ? 'games' : 'points'}
          onChange={e => {
            const mode = e.target.value as 'points' | 'games' | 'sets' | 'timed';
            if (mode === 'points' && lastAutoSwitchRef.current) {
              showToast(t('organizer.gamesModeSuggestion', { rounds: effectiveRounds }));
            }
            if (mode === 'timed') {
              updateTournament({ scoringMode: 'timed', pointsPerMatch: undefined });
            } else {
              updateTournament({ scoringMode: mode, pointsPerMatch: undefined, minutesPerRound: undefined });
            }
          }}
        >
          <option value="points">{t('organizer.scoringPoints')}</option>
          <option value="games">{t('organizer.scoringGames')}</option>
          <option value="sets">{t('organizer.scoringSets')}</option>
          <option value="timed">{t('organizer.scoringTimed')}</option>
        </select>
      </div>

      <div className={styles.configGrid}>
        <label className={styles.configLabel}>{t('organizer.numberOfRounds')}</label>
        <input
          className={styles.configInput}
          type="number"
          min={1}
          value={tournament.maxRounds ?? ''}
          placeholder={String(suggestedRounds)}
          onChange={e => {
            const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
            updateTournament({ maxRounds: val && val > 0 ? val : undefined });
          }}
        />
      </div>
      <span className={styles.hint}>
        {clubFixedRounds && !isTimedMode
          ? t('organizer.clubFixedRounds', { rounds: clubFixedRounds, clubs: clubCount! })
          : isTimedMode
            ? t('organizer.recommendedTimedPair', { rounds: suggestedRounds, minutes: suggestedMinutes })
            : t('organizer.recommendedRounds', { rounds: suggestedRounds, players: confirmedCount || capacity, courts: tournament.courts.length })}
      </span>

      {isTimedMode ? (
        <>
          <div className={styles.configGrid}>
            <label className={styles.configLabel}>{t('organizer.minutesPerRound')}</label>
            <input
              className={styles.configInput}
              type="number"
              min={1}
              value={tournament.minutesPerRound || ''}
              placeholder={String(resolved.minutesPerRound ?? 20)}
              onChange={e => {
                const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                updateTournament({ minutesPerRound: v && v > 0 ? v : undefined });
              }}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.configGrid}>
            <label className={styles.configLabel}>
              {isSetsMode ? t('organizer.setsPerMatch') : isGamesMode ? t('organizer.gamesPerMatch') : t('organizer.pointsPerMatch')}
            </label>
            <input
              className={styles.configInput}
              type="number"
              min={1}
              value={tournament.pointsPerMatch || ''}
              placeholder={String(suggestedPoints)}
              onChange={e => {
                const v = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                updateTournament({ pointsPerMatch: isNaN(v) ? 0 : Math.max(0, v) });
              }}
            />
          </div>
          <span className={styles.hint}>
            {isSetsMode
              ? t('organizer.recommendedSets', { sets: suggestedPoints })
              : isGamesMode
                ? t('organizer.recommendedGames', { games: suggestedPoints })
                : t('organizer.recommendedPoints', { points: suggestedPoints })}
          </span>
        </>
      )}

      <div className={styles.estimate}>
        {t('organizer.estimatedDuration')}<strong>{estimatedStr}</strong>
        <span className={styles.estimateBreakdown}>
          {t('organizer.estimateBreakdown', { rounds: effectiveRounds, minutes: roundDuration })}
        </span>
      </div>

      {somePlayersExcluded && (
        <div className={styles.matchWarning}>
          <div className={styles.matchWarningTitle}>{t('organizer.somePlayersWontPlay')}</div>
          <div className={styles.matchWarningBody}>
            {t('organizer.playersPerRound', { playing: playersPerRound, total: playerCount, minRounds: minRoundsForAll })}
          </div>
        </div>
      )}

      {exceedsLimit && (
        <div className={styles.matchWarning}>
          <div className={styles.matchWarningTitle}>{t('organizer.mayExceed', { duration: formatDuration(durationLimit) })}</div>
          <div className={styles.matchWarningBody}>
            {t('organizer.fitWithin', { duration: formatDuration(durationLimit) })}{' '}
            {isTimedMode ? (
              <strong>{t('organizer.timedSuggestion', { rounds: suggestedRounds, minutes: suggestedMinutes })}</strong>
            ) : (
              <>
                {suggestedPoints !== effectivePoints && (
                  <><strong>{isSetsMode
                    ? t('organizer.setsSuggestion', { sets: suggestedPoints })
                    : isGamesMode
                      ? t('organizer.gamesSuggestion', { games: suggestedPoints })
                      : t('organizer.pointsSuggestion', { points: suggestedPoints })}</strong></>
                )}
                <strong>{t('organizer.roundsSuggestion', { rounds: suggestedRounds })}</strong>
              </>
            )}.
          </div>
        </div>
      )}

      {!sitOutInfo.isEqual && sitOutInfo.sitOutsPerRound > 0 && (
        <div className={styles.matchWarning}>
          <div className={styles.matchWarningTitle}>{t('organizer.unequalSitOuts')}</div>
          <div className={styles.matchWarningBody}>
            {t('organizer.sitOutBody', { rounds: effectiveRounds, sitOuts: sitOutInfo.sitOutsPerRound, players: playerCount })}
            {sitOutInfo.nearestFairBelow && sitOutInfo.nearestFairAbove && sitOutInfo.nearestFairBelow !== sitOutInfo.nearestFairAbove ? (
              <> {t('organizer.trySitOut', { below: sitOutInfo.nearestFairBelow, above: sitOutInfo.nearestFairAbove })}</>
            ) : sitOutInfo.nearestFairAbove ? (
              <> {t('organizer.trySitOutSingle', { rounds: sitOutInfo.nearestFairAbove })}</>
            ) : sitOutInfo.nearestFairBelow ? (
              <> {t('organizer.trySitOutSingle', { rounds: sitOutInfo.nearestFairBelow })}</>
            ) : null}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
