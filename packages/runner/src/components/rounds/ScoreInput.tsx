import { useState, useRef } from 'react';
import type { MatchScore } from '@padel/common';
import { useTranslation } from '@padel/common';
import styles from './ScoreInput.module.css';

type Side = 'team1' | 'team2';

interface FlyAnim {
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
}

const TIMED_PAGE_SIZE = 11;

interface ScoreInputProps {
  score: MatchScore | null;
  pointsPerMatch: number;
  scoringMode?: 'points' | 'games' | 'sets' | 'timed';
  onSave: (score: MatchScore) => void;
  onClear: () => void;
}

export function ScoreInput({ score, pointsPerMatch, scoringMode, onSave, onClear }: ScoreInputProps) {
  const { t } = useTranslation();
  const [pickingSide, setPickingSide] = useState<Side | null>(null);
  const [flyAnim, setFlyAnim] = useState<FlyAnim | null>(null);
  const [pendingFirst, setPendingFirst] = useState<{ side: Side; value: number } | null>(null);
  const [gridPage, setGridPage] = useState(0);
  const team1Ref = useRef<HTMLButtonElement>(null);
  const team2Ref = useRef<HTMLButtonElement>(null);

  const isTimed = scoringMode === 'timed';

  const handlePick = (value: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const cellRect = e.currentTarget.getBoundingClientRect();
    const targetRef = pickingSide === 'team1' ? team1Ref : team2Ref;
    const targetRect = targetRef.current?.getBoundingClientRect();

    if (isTimed) {
      // Timed mode: two-step picking (can start from either side)
      const otherSide: Side = pickingSide === 'team1' ? 'team2' : 'team1';
      const applyPick = () => {
        if (!pendingFirst) {
          // First pick — store and switch to other side
          setPendingFirst({ side: pickingSide!, value });
          setPickingSide(otherSide);
          setGridPage(0);
        } else {
          // Second pick — save both
          const score: MatchScore = pickingSide === 'team1'
            ? { team1Points: value, team2Points: pendingFirst.value }
            : { team1Points: pendingFirst.value, team2Points: value };
          onSave(score);
          setPendingFirst(null);
          setPickingSide(null);
          setGridPage(0);
        }
      };

      if (targetRect) {
        const dx = (targetRect.left + targetRect.width / 2) - (cellRect.left + cellRect.width / 2);
        const dy = (targetRect.top + targetRect.height / 2) - (cellRect.top + cellRect.height / 2);
        setFlyAnim({ value, x: cellRect.left, y: cellRect.top, w: cellRect.width, h: cellRect.height, dx, dy });
        setTimeout(() => {
          setFlyAnim(null);
          applyPick();
        }, 280);
      } else {
        applyPick();
      }
      return;
    }

    // Points/Games mode: single-pick with complement
    if (targetRect) {
      const dx = (targetRect.left + targetRect.width / 2) - (cellRect.left + cellRect.width / 2);
      const dy = (targetRect.top + targetRect.height / 2) - (cellRect.top + cellRect.height / 2);

      setFlyAnim({ value, x: cellRect.left, y: cellRect.top, w: cellRect.width, h: cellRect.height, dx, dy });

      setTimeout(() => {
        const otherValue = pointsPerMatch - value;
        if (pickingSide === 'team1') {
          onSave({ team1Points: value, team2Points: otherValue });
        } else {
          onSave({ team1Points: otherValue, team2Points: value });
        }
        setPickingSide(null);
        setFlyAnim(null);
      }, 280);
    } else {
      const otherValue = pointsPerMatch - value;
      if (pickingSide === 'team1') {
        onSave({ team1Points: value, team2Points: otherValue });
      } else {
        onSave({ team1Points: otherValue, team2Points: value });
      }
      setPickingSide(null);
    }
  };

  const handleClear = () => {
    onClear();
    setPickingSide(null);
    setPendingFirst(null);
    setGridPage(0);
  };

  const handleCancel = () => {
    setPickingSide(null);
    setPendingFirst(null);
    setGridPage(0);
  };

  const handleSideClick = (side: Side) => {
    if (pickingSide === side) {
      handleCancel();
    } else {
      if (isTimed) {
        setPickingSide(side);
        setPendingFirst(null);
        setGridPage(0);
      } else {
        setPickingSide(side);
      }
    }
  };

  const currentValue = pickingSide
    ? (pendingFirst?.side === pickingSide ? pendingFirst.value : (pickingSide === 'team1' ? score?.team1Points : score?.team2Points))
    : undefined;

  // Grid cells for timed mode (paginated) vs normal mode
  const gridStart = isTimed ? gridPage * TIMED_PAGE_SIZE : 0;
  const gridCount = isTimed ? TIMED_PAGE_SIZE : pointsPerMatch + 1;

  return (
    <div className={styles.root} data-picking={pickingSide ?? undefined}>
      <div className={styles.display}>
        <button
          ref={team1Ref}
          className={`${styles.scoreBtn} ${pickingSide === 'team1' ? styles.scoreBtnActive : ''}`}
          onClick={() => handleSideClick('team1')}
        >
          {pendingFirst?.side === 'team1' ? pendingFirst.value : score ? score.team1Points : '\u2013'}
        </button>
        <span className={styles.separator}>:</span>
        <button
          ref={team2Ref}
          className={`${styles.scoreBtn} ${pickingSide === 'team2' ? styles.scoreBtnActive : ''}`}
          onClick={() => handleSideClick('team2')}
        >
          {pendingFirst?.side === 'team2' ? pendingFirst.value : score ? score.team2Points : '\u2013'}
        </button>
      </div>

      {pickingSide && (
        <div className={styles.picker}>
          {isTimed && (
            <div className={styles.pageNav}>
              <button
                className={styles.pageBtn}
                onClick={() => setGridPage(p => Math.max(0, p - 1))}
                disabled={gridPage === 0}
              >
                {'<<'}
              </button>
              <span className={styles.pageLabel}>{gridStart}–{gridStart + TIMED_PAGE_SIZE - 1}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setGridPage(p => p + 1)}
              >
                {'>>'}
              </button>
            </div>
          )}
          <div className={styles.grid}>
            {Array.from({ length: gridCount }, (_, i) => {
              const cellValue = gridStart + i;
              return (
                <button
                  key={cellValue}
                  className={`${styles.cell} ${currentValue === cellValue ? styles.cellSelected : ''} ${flyAnim?.value === cellValue ? styles.cellDeparting : ''}`}
                  onClick={(e) => handlePick(cellValue, e)}
                >
                  {cellValue}
                </button>
              );
            })}
          </div>
          <div className={styles.pickerActions}>
            {score && (
              <button className={styles.clearBtn} onClick={handleClear}>
                {t('score.clear')}
              </button>
            )}
            <button className={styles.cancelBtn} onClick={handleCancel}>
              {t('score.cancel')}
            </button>
          </div>
        </div>
      )}

      {flyAnim && (
        <div
          className={styles.flyingCell}
          style={{
            left: flyAnim.x,
            top: flyAnim.y,
            width: flyAnim.w,
            height: flyAnim.h,
            '--fly-dx': `${flyAnim.dx}px`,
            '--fly-dy': `${flyAnim.dy}px`,
          } as React.CSSProperties}
        >
          {flyAnim.value}
        </div>
      )}
    </div>
  );
}
