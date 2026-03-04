import { useState } from 'react';
import { useTranslation, shortLabel } from '@padel/common';
import type { TournamentBreakdown, ClubBreakdown, ClubRankedBreakdown, GroupBreakdown, UrgencyLevel } from '../utils/tournamentBreakdown';
import styles from './TournamentBreakdown.module.css';

interface Props {
  breakdown: TournamentBreakdown;
  /** Optional action element (e.g. Join button) rendered in the footer row */
  action?: React.ReactNode;
  /** For captain mode: number of captain-approved players (independent of pairing) */
  approvedCount?: number;
}

export function TournamentBreakdownView({ breakdown, action, approvedCount }: Props) {
  const isSimple = breakdown.kind === 'simple';
  // Non-simple formats start expanded to show the detail
  const [expanded, setExpanded] = useState(!isSimple);
  const { t } = useTranslation();
  const expandable = !isSimple;

  // Captain mode: progress bar shows playing slots filled, not registrations
  const isCaptain = (breakdown.kind === 'club' || breakdown.kind === 'club-ranked') && breakdown.captainMode;
  const barFilled = isCaptain && approvedCount != null ? approvedCount : breakdown.filled;
  const pct = breakdown.total > 0
    ? Math.min(100, Math.round((barFilled / breakdown.total) * 100))
    : 0;

  const urgencyText = t(breakdown.urgency.key, breakdown.urgency.params);

  return (
    <div className={styles.wrapper}>
      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${fillClass(breakdown.urgencyLevel)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Expanded detail */}
      {expanded && expandable && (
        <div className={styles.expandedContent}>
          {breakdown.kind === 'club' && <ClubBars data={breakdown} />}
          {breakdown.kind === 'club-ranked' && <ClubRankedMatrix data={breakdown} t={t} />}
          {breakdown.kind === 'group' && <GroupBars data={breakdown} />}
        </div>
      )}

      {/* Urgency CTA + collapse control + action */}
      <div className={styles.footer}>
        <div
          className={`${styles.footerLeft} ${expandable ? styles.footerClickable : ''}`}
          onClick={expandable ? () => setExpanded(v => !v) : undefined}
        >
          <span className={`${styles.urgencyText} ${urgencyClass(breakdown.urgencyLevel)}`}>
            {urgencyText}
          </span>
          {expandable && (
            <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>
              ▾
            </span>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

// ── Club bars ──

function ClubBars({ data }: { data: ClubBreakdown }) {
  if (data.captainMode) {
    // Captain mode: simple list — dot + name + count, no bars
    return (
      <>
        {data.clubs.map(bar => (
          <div key={bar.clubId} className={styles.barRow}>
            <span className={styles.barDot} style={{ backgroundColor: bar.color }} />
            <span className={styles.barLabel}>{bar.name}</span>
            <span className={styles.barCount}>{bar.filled}</span>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {data.clubs.map(bar => {
        const pct = bar.capacity > 0 ? Math.min(100, Math.round((bar.filled / bar.capacity) * 100)) : 0;
        return (
          <div key={bar.clubId} className={styles.barRow}>
            <span className={styles.barDot} style={{ backgroundColor: bar.color }} />
            <span className={styles.barLabel}>{bar.name}</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: bar.color }} />
            </div>
            <span className={styles.barCount}>{bar.filled}/{bar.capacity}</span>
          </div>
        );
      })}
    </>
  );
}

// ── Club-ranked matrix ──

function ClubRankedMatrix({ data, t }: { data: ClubRankedBreakdown; t: (key: string, params?: Record<string, string | number>) => string }) {
  const colTotals = data.rankLabels.map((_, ri) => {
    const filled = data.rows.reduce((s, r) => s + r.cells[ri].filled, 0);
    const cap = data.rows.reduce((s, r) => s + r.cells[ri].capacity, 0);
    return { filled, capacity: cap };
  });

  return (
    <table className={styles.matrix}>
      <thead>
        <tr>
          <th />
          {data.rankLabels.map((label, i) => (
            <th key={i}>{shortLabel(label)}</th>
          ))}
          {data.hasPairs && <th>{t('breakdown.paired')}</th>}
        </tr>
      </thead>
      <tbody>
        {data.rows.map(row => (
          <tr key={row.clubId}>
            <td>
              <div className={styles.matrixClubCell}>
                <span className={styles.barDot} style={{ backgroundColor: row.color }} />
                {shortLabel(row.name)}
              </div>
            </td>
            {row.cells.map((cell, ci) => {
              const cls = cell.filled === 0
                ? styles.cellEmpty
                : cell.filled < cell.capacity
                  ? styles.cellPartial
                  : styles.cellFull;
              return (
                <td key={ci} className={cls}>
                  {data.captainMode ? cell.filled : `${cell.filled}/${cell.capacity}`}
                </td>
              );
            })}
            {data.hasPairs && (
              <td className={styles.pairedCol}>
                {row.pairedPercent}%
              </td>
            )}
          </tr>
        ))}
      </tbody>
      {!data.captainMode && (
        <tfoot>
          <tr className={styles.totalsRow}>
            <td />
            {colTotals.map((col, i) => (
              <td key={i}>{col.filled}/{col.capacity}</td>
            ))}
            {data.hasPairs && <td />}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// ── Group bars ──

function GroupBars({ data }: { data: GroupBreakdown }) {
  return (
    <>
      {data.groups.map(bar => {
        const pct = bar.capacity > 0 ? Math.min(100, Math.round((bar.filled / bar.capacity) * 100)) : 0;
        const color = bar.group === 'A' ? 'var(--color-primary)' : 'var(--color-accent)';
        return (
          <div key={bar.group} className={styles.barRow}>
            <span className={styles.barDot} style={{ backgroundColor: color }} />
            <span className={styles.barLabel}>{bar.label}</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className={styles.barCount}>{bar.filled}/{bar.capacity}</span>
          </div>
        );
      })}
    </>
  );
}

// ── Style helpers ──

function urgencyClass(level: UrgencyLevel): string {
  switch (level) {
    case 'warning': return styles.urgencyWarning;
    case 'danger': return styles.urgencyDanger;
    case 'success': return styles.urgencySuccess;
    default: return styles.urgencyNeutral;
  }
}

function fillClass(level: UrgencyLevel): string {
  switch (level) {
    case 'warning': return styles.fillWarning;
    case 'danger': return styles.fillDanger;
    case 'success': return styles.fillSuccess;
    default: return styles.fillNeutral;
  }
}
