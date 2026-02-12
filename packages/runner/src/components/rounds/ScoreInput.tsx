import { useState, useRef } from 'react';
import type { MatchScore } from '@padel/common';
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

interface ScoreInputProps {
  score: MatchScore | null;
  pointsPerMatch: number;
  onSave: (score: MatchScore) => void;
  onClear: () => void;
}

export function ScoreInput({ score, pointsPerMatch, onSave, onClear }: ScoreInputProps) {
  const [pickingSide, setPickingSide] = useState<Side | null>(null);
  const [flyAnim, setFlyAnim] = useState<FlyAnim | null>(null);
  const team1Ref = useRef<HTMLButtonElement>(null);
  const team2Ref = useRef<HTMLButtonElement>(null);

  const handlePick = (value: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const cellRect = e.currentTarget.getBoundingClientRect();
    const targetRef = pickingSide === 'team1' ? team1Ref : team2Ref;
    const targetRect = targetRef.current?.getBoundingClientRect();

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
  };

  const currentValue = pickingSide === 'team1'
    ? score?.team1Points
    : score?.team2Points;

  return (
    <div className={styles.root} data-picking={pickingSide ?? undefined}>
      <div className={styles.display}>
        <button
          ref={team1Ref}
          className={`${styles.scoreBtn} ${pickingSide === 'team1' ? styles.scoreBtnActive : ''}`}
          onClick={() => setPickingSide(pickingSide === 'team1' ? null : 'team1')}
        >
          {score ? score.team1Points : '–'}
        </button>
        <span className={styles.separator}>:</span>
        <button
          ref={team2Ref}
          className={`${styles.scoreBtn} ${pickingSide === 'team2' ? styles.scoreBtnActive : ''}`}
          onClick={() => setPickingSide(pickingSide === 'team2' ? null : 'team2')}
        >
          {score ? score.team2Points : '–'}
        </button>
      </div>

      {pickingSide && (
        <div className={styles.picker}>
          <div className={styles.grid}>
            {Array.from({ length: pointsPerMatch + 1 }, (_, i) => (
              <button
                key={i}
                className={`${styles.cell} ${currentValue === i ? styles.cellSelected : ''} ${flyAnim?.value === i ? styles.cellDeparting : ''}`}
                onClick={(e) => handlePick(i, e)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className={styles.pickerActions}>
            {score && (
              <button className={styles.clearBtn} onClick={handleClear}>
                Clear
              </button>
            )}
            <button className={styles.cancelBtn} onClick={() => setPickingSide(null)}>
              Cancel
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
