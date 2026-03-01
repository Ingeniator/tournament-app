import { useState } from 'react';
import type { Match, MatchScore, Player, Court, TournamentFormat, MaldicionesHands, Team } from '@padel/common';
import { useTranslation } from '@padel/common';
import { ScoreInput } from './ScoreInput';
import { CurseLabel } from '../maldiciones/CurseLabel';
import { CurseCardPicker } from '../maldiciones/CurseCardPicker';
import { CURSE_CARDS } from '../../data/curseCards';
import { findTeamByPair } from '../../strategies/shared';
import styles from './MatchCard.module.css';

interface MatchCardProps {
  match: Match;
  players: Player[];
  courts: Court[];
  pointsPerMatch: number;
  readOnly?: boolean;
  format?: TournamentFormat;
  maldicionesEnabled?: boolean;
  maldicionesHands?: MaldicionesHands;
  teams?: Team[];
  onScore: (score: MatchScore) => void;
  onClear: () => void;
  onTapScore?: () => void;
  onCast?: (castBy: 'team1' | 'team2', cardId: string, targetPlayerId: string) => void;
  onEscudo?: () => void;
  onVeto?: () => void;
}

export function MatchCard({ match, players, courts, pointsPerMatch, readOnly, format, maldicionesEnabled, maldicionesHands, teams, onScore, onClear, onTapScore, onCast, onEscudo, onVeto }: MatchCardProps) {
  const { t } = useTranslation();
  const [pickingSide, setPickingSide] = useState<'team1' | 'team2' | null>(null);

  const getName = (id: string) => players.find(p => p.id === id)?.name ?? '?';
  const isKOTC = format === 'king-of-the-court';
  const courtIndex = isKOTC ? courts.findIndex(c => c.id === match.courtId) : -1;
  const bonus = isKOTC && courtIndex >= 0 ? courts.length - 1 - courtIndex : 0;
  const rawCourtName = courts.find(c => c.id === match.courtId)?.name ?? match.courtId;
  const courtName = isKOTC && courtIndex === 0 ? `\u{1F451} ${rawCourtName}` : rawCourtName;
  const team1Won = match.score && match.score.team1Points > match.score.team2Points;
  const team2Won = match.score && match.score.team2Points > match.score.team1Points;

  // Maldiciones state
  const curse = match.curse;
  const hasCurse = !!curse;
  const isScored = !!match.score;

  // Resolve team hands
  const team1Obj = maldicionesEnabled && teams ? findTeamByPair(teams, match.team1) : undefined;
  const team2Obj = maldicionesEnabled && teams ? findTeamByPair(teams, match.team2) : undefined;
  const team1Hand = team1Obj && maldicionesHands ? maldicionesHands[team1Obj.id] : undefined;
  const team2Hand = team2Obj && maldicionesHands ? maldicionesHands[team2Obj.id] : undefined;

  // Can cast: maldiciones enabled, match unscored, team has cards, no curse active
  const team1CanCast = maldicionesEnabled && !isScored && !hasCurse && (team1Hand?.cardIds.length ?? 0) > 0;
  const team2CanCast = maldicionesEnabled && !isScored && !hasCurse && (team2Hand?.cardIds.length ?? 0) > 0;

  // Skull on cursed player
  const curseTarget = curse && !curse.shielded ? curse.targetPlayerId : null;

  const playerDisplay = (id: string) => {
    const n = getName(id);
    return curseTarget === id ? `${n} \u2620\uFE0F` : n;
  };

  // Show curse on victim side (team that was cursed = opposite of castBy)
  const showCurseOnTeam1 = hasCurse && curse.castBy === 'team2';
  const showCurseOnTeam2 = hasCurse && curse.castBy === 'team1';

  const showRow3Actions = maldicionesEnabled && !isScored;

  return (
    <div className={`${styles.match} ${match.score ? styles.scored : ''}`}>
      <div className={styles.courtLabel}>
        {courtName}
        {isKOTC && bonus > 0 && (
          <span className={styles.courtBonus}> (+{bonus} bonus pts)</span>
        )}
      </div>
      <div className={styles.court}>
        {/* Row 1: first players with & */}
        <div className={`${styles.playerCell} ${styles.topLeft} ${team1Won ? styles.winner : ''}`} title={getName(match.team1[0])}>
          <span className={styles.playerName}>{playerDisplay(match.team1[0])}</span>
          <span className={styles.ampersand}>&amp;</span>
        </div>
        <span className={styles.vsLabel}>vs</span>
        <div className={`${styles.playerCell} ${styles.topRight} ${team2Won ? styles.winner : ''}`} title={getName(match.team2[0])}>
          <span className={styles.playerName}>{playerDisplay(match.team2[0])}</span>
          <span className={styles.ampersand}>&amp;</span>
        </div>

        {/* Row 2: second players */}
        <div className={`${styles.playerCell} ${styles.bottomLeft} ${team1Won ? styles.winner : ''}`} title={getName(match.team1[1])}>
          <span className={styles.playerName}>{playerDisplay(match.team1[1])}</span>
        </div>
        <div className={`${styles.playerCell} ${styles.bottomRight} ${team2Won ? styles.winner : ''}`} title={getName(match.team2[1])}>
          <span className={styles.playerName}>{playerDisplay(match.team2[1])}</span>
        </div>

        {/* Row 3: Score + optional maldiciones actions */}
        {showRow3Actions ? (
          <div className={styles.scoreRow3}>
            <div className={styles.curseCell}>
              {showCurseOnTeam1 && curse && onEscudo && onVeto ? (
                <CurseLabel
                  curse={curse}
                  canShield={team1Hand?.hasShield ?? false}
                  onShield={onEscudo}
                  onVeto={onVeto}
                />
              ) : team1CanCast ? (
                <button className={styles.castBtn} onClick={() => setPickingSide('team1')}>
                  {'\u2620\uFE0F'} <span className={styles.castCount}>{team1Hand!.cardIds.length}</span>
                </button>
              ) : null}
            </div>
            <div className={styles.scoreCellCenter}>
              <ScoreInput
                score={match.score}
                pointsPerMatch={pointsPerMatch}
                onSave={onScore}
                onClear={onClear}
              />
            </div>
            <div className={styles.curseCell}>
              {showCurseOnTeam2 && curse && onEscudo && onVeto ? (
                <CurseLabel
                  curse={curse}
                  canShield={team2Hand?.hasShield ?? false}
                  onShield={onEscudo}
                  onVeto={onVeto}
                />
              ) : team2CanCast ? (
                <button className={styles.castBtn} onClick={() => setPickingSide('team2')}>
                  {'\u2620\uFE0F'} <span className={styles.castCount}>{team2Hand!.cardIds.length}</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : readOnly && match.score ? (
          <>
            <div
              className={`${styles.scoreCenter} ${onTapScore ? styles.tappable : ''}`}
              onClick={onTapScore}
              {...(onTapScore ? { role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTapScore(); } }, 'aria-label': t('play.editScore') } : {})}
            >
              <span className={styles.scoreValue}>{match.score.team1Points}</span>
              <span className={styles.scoreSeparator}>:</span>
              <span className={styles.scoreValue}>{match.score.team2Points}</span>
            </div>
            {curse && (() => {
              const card = CURSE_CARDS.find(c => c.id === curse.cardId);
              if (!card) return null;
              return (
                <div className={styles.curseHistory}>
                  {curse.shielded
                    ? <>{'🛡️'} <span className={styles.curseShielded}>{card.emoji} {card.name}</span></>
                    : <>{card.emoji} {card.name}</>
                  }
                </div>
              );
            })()}
          </>
        ) : readOnly ? (
          <div
            className={`${styles.scoreCenter} ${onTapScore ? styles.tappable : ''}`}
            onClick={onTapScore}
            {...(onTapScore ? { role: 'button', tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTapScore(); } }, 'aria-label': t('play.enterScore') } : {})}
          >
            <span className={styles.noScore}>&ndash;</span>
            <span className={styles.scoreSeparator}>:</span>
            <span className={styles.noScore}>&ndash;</span>
          </div>
        ) : (
          <ScoreInput
            score={match.score}
            pointsPerMatch={pointsPerMatch}
            onSave={onScore}
            onClear={onClear}
          />
        )}
      </div>

      {/* Card picker modal */}
      {pickingSide && onCast && (
        <CurseCardPicker
          open={!!pickingSide}
          cardIds={pickingSide === 'team1' ? (team1Hand?.cardIds ?? []) : (team2Hand?.cardIds ?? [])}
          opponents={pickingSide === 'team1'
            ? match.team2.map(id => players.find(p => p.id === id)!).filter(Boolean)
            : match.team1.map(id => players.find(p => p.id === id)!).filter(Boolean)
          }
          onCast={(cardId, targetPlayerId) => {
            onCast(pickingSide, cardId, targetPlayerId);
            setPickingSide(null);
          }}
          onClose={() => setPickingSide(null)}
        />
      )}
    </div>
  );
}
