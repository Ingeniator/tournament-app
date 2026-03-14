import type { Tournament, Match, Club, Player } from '@padel/common';
import { shortLabel } from '@padel/common';
import styles from './RankResultsCard.module.css';

export interface RankMatch {
  club1Name: string;
  team1Names: string;
  score1: number;
  score2: number;
  team2Names: string;
  club2Name: string;
}

export interface RankGroup {
  rankLabel: string;
  matches: RankMatch[];
}

function inferRankSlot(
  match: Match,
  playerById: Map<string, Player>,
): number | null {
  for (const pid of [...match.team1, ...match.team2]) {
    const p = playerById.get(pid);
    if (p?.rankSlot != null) return p.rankSlot;
  }
  return null;
}

export function buildRankGroups(tournament: Tournament): RankGroup[] {
  const rankLabels = tournament.config.rankLabels;
  if (!rankLabels || rankLabels.length === 0) return [];
  const clubs = tournament.clubs ?? [];
  if (clubs.length === 0) return [];

  const clubById = new Map<string, Club>();
  for (const c of clubs) clubById.set(c.id, c);

  const playerById = new Map(tournament.players.map(p => [p.id, p]));

  const matchesByRank = new Map<number, RankMatch[]>();

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.score) continue;

      const rankSlot = inferRankSlot(match, playerById);
      if (rankSlot == null) continue;

      const t1p1 = playerById.get(match.team1[0]);
      const t1p2 = playerById.get(match.team1[1]);
      const t2p1 = playerById.get(match.team2[0]);
      const t2p2 = playerById.get(match.team2[1]);

      const club1 = t1p1?.clubId ? clubById.get(t1p1.clubId) : undefined;
      const club2 = t2p1?.clubId ? clubById.get(t2p1.clubId) : undefined;

      const rm: RankMatch = {
        club1Name: club1?.name ?? '',
        team1Names: [t1p1?.name, t1p2?.name].filter(Boolean).join(' & '),
        score1: match.score.team1Points,
        score2: match.score.team2Points,
        team2Names: [t2p1?.name, t2p2?.name].filter(Boolean).join(' & '),
        club2Name: club2?.name ?? '',
      };

      const list = matchesByRank.get(rankSlot) ?? [];
      list.push(rm);
      matchesByRank.set(rankSlot, list);
    }
  }

  const groups: RankGroup[] = [];
  for (let i = 0; i < rankLabels.length; i++) {
    const matches = matchesByRank.get(i);
    if (matches && matches.length > 0) {
      groups.push({ rankLabel: rankLabels[i], matches });
    }
  }

  return groups;
}

interface RankResultsCardProps {
  rankGroup: RankGroup;
  tournamentName: string;
}

export function RankResultsCard({ rankGroup, tournamentName }: RankResultsCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.tournamentName}>{tournamentName}</div>
      <div className={styles.rankLabel}>{shortLabel(rankGroup.rankLabel)}</div>
      <div className={styles.matchList}>
        {rankGroup.matches.map((m, i) => {
          const won1 = m.score1 > m.score2;
          const won2 = m.score2 > m.score1;
          return (
            <div key={i} className={styles.matchRow}>
              <div className={`${styles.team} ${styles.teamLeft} ${won1 ? styles.winner : ''}`}>
                <span className={styles.clubName}>{m.club1Name}</span>
                <span className={styles.playerNames}>
                  {m.team1Names.split(' & ').map((name, j) => (
                    <span key={j}>{name}</span>
                  ))}
                </span>
              </div>
              <div className={styles.score}>
                <span className={won1 ? styles.scoreWin : ''}>{m.score1}</span>
                <span className={styles.scoreSep}>:</span>
                <span className={won2 ? styles.scoreWin : ''}>{m.score2}</span>
              </div>
              <div className={`${styles.team} ${styles.teamRight} ${won2 ? styles.winner : ''}`}>
                <span className={styles.clubName}>{m.club2Name}</span>
                <span className={styles.playerNames}>
                  {m.team2Names.split(' & ').map((name, j) => (
                    <span key={j}>{name}</span>
                  ))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
