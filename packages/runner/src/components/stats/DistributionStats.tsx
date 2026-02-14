import { useState, useTransition } from 'react';
import type { DistributionData } from '../../hooks/useDistributionStats';
import { Button, useTranslation } from '@padel/common';
import styles from './DistributionStats.module.css';

interface Props {
  data: DistributionData;
  canReshuffle: boolean;
  onReshuffle: () => void;
  onOptimize: () => void;
  onCancelOptimize: () => void;
  optimizeElapsed: number | null;
  hasOptimalBackup: boolean;
  onRevertOptimal: () => void;
  onPlay?: () => void;
}

function InfoButton({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        className={styles.infoBtn}
        onClick={() => setOpen(true)}
        aria-label="Info"
      >
        i
      </button>
      {open && (
        <div className={styles.tooltipOverlay} onClick={() => setOpen(false)}>
          <div className={styles.tooltip} onClick={e => e.stopPropagation()}>
            <p>{hint}</p>
            <button className={styles.tooltipClose} onClick={() => setOpen(false)}>
              {t('distribution.gotIt')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}\u2013${max}`;
}

export function DistributionStats({ data, canReshuffle, onReshuffle, onOptimize, onCancelOptimize, optimizeElapsed, hasOptimalBackup, onRevertOptimal, onPlay }: Props) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const isOptimizing = optimizeElapsed !== null;
  const repeatPartnersOk = data.repeatPartners.length <= data.idealRepeatPartners;
  const hasNeverPlayed = data.neverPlayed.length > 0;
  const neverPlayedOk = data.neverPlayed.length <= data.idealNeverPlayed;
  const idealSpread = data.idealOpponentSpread.max - data.idealOpponentSpread.min;
  const isBalanced = data.opponentSpread
    ? (data.opponentSpread.max - data.opponentSpread.min) <= idealSpread
    : true;

  const restOk = data.restBalance.games.max - data.restBalance.games.min <= 1;

  const courtBalanceOk = data.courtBalance.every(c => {
    const idealSpread = c.idealMax - c.idealMin;
    return (c.max - c.min) <= idealSpread;
  });
  const skewedCourts = data.courtBalance.filter(c => {
    const idealSpread = c.idealMax - c.idealMin;
    return (c.max - c.min) > idealSpread;
  });

  const handleReshuffle = () => {
    startTransition(() => {
      onReshuffle();
    });
  };

  const allGreen = repeatPartnersOk && isBalanced && neverPlayedOk && restOk && courtBalanceOk;
  const busy = isPending || isOptimizing;

  return (
    <div className={styles.section}>
      {/* Priority 1: Partner Repeats (weight 3) */}
      <div className={styles.row}>
        <span className={styles.indicator}>{repeatPartnersOk ? '\u2705' : '\u26A0\uFE0F'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t('distribution.partnerRepeats')}</span>
            <InfoButton hint={t('distribution.hintPartners')} />
          </div>
          <div className={styles.detail}>
            {t('distribution.pairs', { count: data.repeatPartners.length, s: data.repeatPartners.length !== 1 ? 's' : '' })}
            {' '}
            <span className={styles.ideal}>
              {data.idealRepeatPartners === 0 ? t('distribution.idealZero') : t('distribution.idealMax', { max: data.idealRepeatPartners })}
            </span>
          </div>
          {data.repeatPartners.length > 0 && (
            <div className={styles.pairList}>
              {data.repeatPartners.map((p, i) => (
                <span key={i} className={styles.pair}>
                  {p.names[0]} & {p.names[1]} \u00d7{p.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Priority 2: Opponent Balance (weight 2) */}
      <div className={styles.row}>
        <span className={styles.indicator}>{isBalanced ? '\u2705' : '\u26A0\uFE0F'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t('distribution.opponentBalance')}</span>
            <InfoButton hint={t('distribution.hintOpponents')} />
          </div>
          <div className={styles.detail}>
            {data.opponentSpread
              ? <>
                  {t('distribution.minMax', { min: data.opponentSpread.min, max: data.opponentSpread.max })}
                  {' '}
                  <span className={styles.ideal}>
                    {t('distribution.idealRange', {
                      range: data.idealOpponentSpread.min === data.idealOpponentSpread.max
                        ? String(data.idealOpponentSpread.min)
                        : `${data.idealOpponentSpread.min}\u2013${data.idealOpponentSpread.max}`
                    })}
                  </span>
                </>
              : t('distribution.noData')}
          </div>
        </div>
      </div>

      {/* Priority 3: Never Shared Court (weight 1) */}
      <div className={styles.row}>
        <span className={styles.indicator}>{neverPlayedOk ? '\u2705' : '\u26A0\uFE0F'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t('distribution.neverSharedCourt')}</span>
            <InfoButton hint={t('distribution.hintCourt')} />
          </div>
          {hasNeverPlayed ? (
            <>
              <div className={styles.detail}>
                {t('distribution.pairs', { count: data.neverPlayed.length, s: data.neverPlayed.length !== 1 ? 's' : '' })}
                {' '}
                <span className={styles.ideal}>
                  {data.idealNeverPlayed === 0 ? t('distribution.idealZero') : t('distribution.idealMax', { max: data.idealNeverPlayed })}
                </span>
              </div>
              <div className={styles.pairList}>
                {data.neverPlayed.map((pair, i) => (
                  <span key={i} className={styles.pair}>
                    {pair[0]} & {pair[1]}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.detail}>{t('distribution.allPlayersMet')}</div>
          )}
        </div>
      </div>

      {/* Informational: Rest Balance */}
      <div className={styles.row}>
        <span className={styles.indicator}>{restOk ? '\u2705' : '\u26A0\uFE0F'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t('distribution.restBalance')}</span>
            <InfoButton hint={t('distribution.hintRest')} />
          </div>
          <div className={styles.detail}>
            {t('distribution.games', { range: formatRange(data.restBalance.games.min, data.restBalance.games.max) })}
            {' '}
            <span className={styles.ideal}>
              {t('distribution.idealRange', { range: formatRange(data.restBalance.games.idealMin, data.restBalance.games.idealMax) })}
            </span>
            {' \u2022 '}
            {t('distribution.sitOuts', { range: formatRange(data.restBalance.sitOuts.min, data.restBalance.sitOuts.max) })}
            {' '}
            <span className={styles.ideal}>
              {t('distribution.idealRange', { range: formatRange(data.restBalance.sitOuts.idealMin, data.restBalance.sitOuts.idealMax) })}
            </span>
          </div>
        </div>
      </div>

      {/* Informational: Court Balance */}
      {data.courtBalance.length > 1 && (
        <div className={styles.row}>
          <span className={styles.indicator}>{courtBalanceOk ? '\u2705' : '\u26A0\uFE0F'}</span>
          <div className={styles.content}>
            <div className={styles.labelRow}>
              <span className={styles.label}>{t('distribution.courtBalance')}</span>
              <InfoButton hint={t('distribution.hintCourtBalance')} />
            </div>
            {courtBalanceOk ? (
              <div className={styles.detail}>{t('distribution.allCourtsBalanced')}</div>
            ) : (
              <div className={styles.pairList}>
                {skewedCourts.map((c, i) => (
                  <span key={i} className={styles.pair}>
                    {c.courtName}: {formatRange(c.min, c.max)} (ideal: {formatRange(c.idealMin, c.idealMax)})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {onPlay && (
        <div className={styles.reshuffleBtn}>
          <Button fullWidth onClick={onPlay}>
            {t('distribution.play')}
          </Button>
        </div>
      )}

      {canReshuffle && (
        <div className={styles.reshuffleBtn}>
          <Button variant="secondary" fullWidth onClick={handleReshuffle} disabled={busy}>
            {isPending ? t('distribution.reshuffling') : t('distribution.reshuffleUnscored')}
          </Button>
          {isOptimizing ? (
            <Button variant="secondary" fullWidth onClick={onCancelOptimize}>
              {t('distribution.stopOptimization', { seconds: optimizeElapsed })}
            </Button>
          ) : !allGreen ? (
            <Button variant="secondary" fullWidth onClick={onOptimize} disabled={isPending}>
              {t('distribution.findOptimal')}
            </Button>
          ) : null}
          {hasOptimalBackup && !isOptimizing && (
            <Button variant="secondary" fullWidth onClick={onRevertOptimal} disabled={isPending}>
              {t('distribution.revertOptimal')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
