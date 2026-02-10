import { useState, useTransition } from 'react';
import type { DistributionData } from '../../hooks/useDistributionStats';
import { Button } from '@padel/common';
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
}

const hints: Record<string, string> = {
  rest: 'Shows how evenly games and sit-outs are distributed. Ideal is ±1.',
  partners: 'Shows pairs who are scheduled as teammates more than once. The ideal depends on the number of players, courts, and rounds — some repeats may be unavoidable.',
  opponents: 'How many times each pair faces each other as opponents. The "ideal" shows the best mathematically possible range for your player count, courts, and rounds. A green check means your schedule matches the ideal.',
  courtBalance: 'Shows how evenly players are distributed across courts.',
  court: 'Lists pairs of players who never appear in the same match — neither as partners nor as opponents. Fewer gaps means better coverage.',
};

function InfoButton({ hintKey }: { hintKey: string }) {
  const [open, setOpen] = useState(false);

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
            <p>{hints[hintKey]}</p>
            <button className={styles.tooltipClose} onClick={() => setOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

export function DistributionStats({ data, canReshuffle, onReshuffle, onOptimize, onCancelOptimize, optimizeElapsed, hasOptimalBackup, onRevertOptimal }: Props) {
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
        <span className={styles.indicator}>{repeatPartnersOk ? '✅' : '⚠️'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Partner Repeats</span>
            <InfoButton hintKey="partners" />
          </div>
          <div className={styles.detail}>
            {data.repeatPartners.length} pair{data.repeatPartners.length !== 1 ? 's' : ''}
            {' '}
            <span className={styles.ideal}>
              (ideal: {data.idealRepeatPartners === 0 ? '0' : `≤${data.idealRepeatPartners}`})
            </span>
          </div>
          {data.repeatPartners.length > 0 && (
            <div className={styles.pairList}>
              {data.repeatPartners.map((p, i) => (
                <span key={i} className={styles.pair}>
                  {p.names[0]} & {p.names[1]} ×{p.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Priority 2: Opponent Balance (weight 2) */}
      <div className={styles.row}>
        <span className={styles.indicator}>{isBalanced ? '✅' : '⚠️'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Opponent Balance</span>
            <InfoButton hintKey="opponents" />
          </div>
          <div className={styles.detail}>
            {data.opponentSpread
              ? <>
                  Min {data.opponentSpread.min}, Max {data.opponentSpread.max}
                  {' '}
                  <span className={styles.ideal}>
                    (ideal: {data.idealOpponentSpread.min === data.idealOpponentSpread.max
                      ? data.idealOpponentSpread.min
                      : `${data.idealOpponentSpread.min}–${data.idealOpponentSpread.max}`})
                  </span>
                </>
              : 'No data yet'}
          </div>
        </div>
      </div>

      {/* Priority 3: Never Shared Court (weight 1) */}
      <div className={styles.row}>
        <span className={styles.indicator}>{neverPlayedOk ? '✅' : '⚠️'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Never Shared Court</span>
            <InfoButton hintKey="court" />
          </div>
          {hasNeverPlayed ? (
            <>
              <div className={styles.detail}>
                {data.neverPlayed.length} pair{data.neverPlayed.length !== 1 ? 's' : ''}
                {' '}
                <span className={styles.ideal}>
                  (ideal: {data.idealNeverPlayed === 0 ? '0' : `≤${data.idealNeverPlayed}`})
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
            <div className={styles.detail}>All players met</div>
          )}
        </div>
      </div>

      {/* Informational: Rest Balance */}
      <div className={styles.row}>
        <span className={styles.indicator}>{restOk ? '✅' : '⚠️'}</span>
        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Rest Balance</span>
            <InfoButton hintKey="rest" />
          </div>
          <div className={styles.detail}>
            Games: {formatRange(data.restBalance.games.min, data.restBalance.games.max)}
            {' '}
            <span className={styles.ideal}>
              (ideal: {formatRange(data.restBalance.games.idealMin, data.restBalance.games.idealMax)})
            </span>
            {' • '}
            Sit-outs: {formatRange(data.restBalance.sitOuts.min, data.restBalance.sitOuts.max)}
            {' '}
            <span className={styles.ideal}>
              (ideal: {formatRange(data.restBalance.sitOuts.idealMin, data.restBalance.sitOuts.idealMax)})
            </span>
          </div>
        </div>
      </div>

      {/* Informational: Court Balance */}
      {data.courtBalance.length > 1 && (
        <div className={styles.row}>
          <span className={styles.indicator}>{courtBalanceOk ? '✅' : '⚠️'}</span>
          <div className={styles.content}>
            <div className={styles.labelRow}>
              <span className={styles.label}>Court Balance</span>
              <InfoButton hintKey="courtBalance" />
            </div>
            {courtBalanceOk ? (
              <div className={styles.detail}>All courts balanced</div>
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

      {canReshuffle && (
        <div className={styles.reshuffleBtn}>
          <Button variant="secondary" fullWidth onClick={handleReshuffle} disabled={busy}>
            {isPending ? 'Reshuffling...' : 'Reshuffle Unscored Rounds'}
          </Button>
          {isOptimizing ? (
            <Button variant="secondary" fullWidth onClick={onCancelOptimize}>
              Stop Optimization ({optimizeElapsed}s)
            </Button>
          ) : !allGreen ? (
            <Button variant="secondary" fullWidth onClick={onOptimize} disabled={isPending}>
              Find Optimal Distribution
            </Button>
          ) : null}
          {hasOptimalBackup && !isOptimizing && (
            <Button variant="secondary" fullWidth onClick={onRevertOptimal} disabled={isPending}>
              Revert to Saved Optimal
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
