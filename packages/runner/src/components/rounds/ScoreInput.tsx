import { useState } from 'react';
import type { MatchScore } from '@padel/common';
import styles from './ScoreInput.module.css';

type Side = 'team1' | 'team2';

interface ScoreInputProps {
  score: MatchScore | null;
  pointsPerMatch: number;
  onSave: (score: MatchScore) => void;
  onClear: () => void;
  team1Label?: string;
  team2Label?: string;
}

export function ScoreInput({ score, pointsPerMatch, onSave, onClear, team1Label, team2Label }: ScoreInputProps) {
  const [pickingSide, setPickingSide] = useState<Side | null>(null);

  const handlePick = (value: number) => {
    if (pickingSide === 'team1') {
      onSave({ team1Points: value, team2Points: pointsPerMatch - value });
    } else {
      onSave({ team1Points: pointsPerMatch - value, team2Points: value });
    }
    setPickingSide(null);
  };

  const handleClear = () => {
    onClear();
    setPickingSide(null);
  };

  const currentValue = pickingSide === 'team1'
    ? score?.team1Points
    : score?.team2Points;

  const label = pickingSide === 'team1'
    ? (team1Label ?? 'Team 1')
    : (team2Label ?? 'Team 2');

  return (
    <div>
      {/* Score display — always shown, each side tappable */}
      <div className={styles.display}>
        <button
          className={`${styles.scoreBtn} ${pickingSide === 'team1' ? styles.scoreBtnActive : ''}`}
          onClick={() => setPickingSide(pickingSide === 'team1' ? null : 'team1')}
        >
          {score ? score.team1Points : '–'}
        </button>
        <span className={styles.separator}>:</span>
        <button
          className={`${styles.scoreBtn} ${pickingSide === 'team2' ? styles.scoreBtnActive : ''}`}
          onClick={() => setPickingSide(pickingSide === 'team2' ? null : 'team2')}
        >
          {score ? score.team2Points : '–'}
        </button>
      </div>

      {/* Picker grid — shown when a side is selected */}
      {pickingSide && (
        <div className={styles.picker}>
          <div className={styles.pickerLabel}>{label}</div>
          <div className={styles.grid}>
            {Array.from({ length: pointsPerMatch + 1 }, (_, i) => (
              <button
                key={i}
                className={`${styles.cell} ${currentValue === i ? styles.cellSelected : ''}`}
                onClick={() => handlePick(i)}
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
    </div>
  );
}
