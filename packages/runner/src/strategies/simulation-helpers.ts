import type { Player, TournamentConfig, Round, Tournament, Team } from '@padel/common';
import type { TournamentStrategy } from './types';
import { partnerKey } from './shared';

export function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

export function makeMixicanoPlayers(nA: number, nB: number): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < nA; i++) {
    players.push({ id: `p${i + 1}`, name: `Player ${i + 1}`, group: 'A' });
  }
  for (let i = 0; i < nB; i++) {
    players.push({ id: `p${nA + i + 1}`, name: `Player ${nA + i + 1}`, group: 'B' });
  }
  return players;
}

export function makeTeams(players: Player[]): Team[] {
  const teams: Team[] = [];
  for (let i = 0; i < players.length; i += 2) {
    const teamNum = Math.floor(i / 2) + 1;
    teams.push({
      id: `t${teamNum}`,
      player1Id: players[i].id,
      player2Id: players[i + 1].id,
      name: `Team ${teamNum}`,
    });
  }
  return teams;
}

export function makeConfig(
  format: TournamentConfig['format'],
  numCourts: number,
  pointsPerMatch = 21,
): TournamentConfig {
  return {
    format,
    pointsPerMatch,
    courts: Array.from({ length: numCourts }, (_, i) => ({ id: `c${i + 1}`, name: `Court ${i + 1}` })),
    maxRounds: null,
  };
}

/** Score matches deterministically: lower player ID number = stronger player */
export function scoreDeterministic(rounds: Round[], pointsPerMatch: number): Round[] {
  return rounds.map(round => ({
    ...round,
    matches: round.matches.map(match => {
      if (match.score) return match;
      const t1Ranks = match.team1.map(id => parseInt(id.replace(/\D/g, '')));
      const t2Ranks = match.team2.map(id => parseInt(id.replace(/\D/g, '')));
      const t1Avg = t1Ranks.reduce((a, b) => a + b, 0) / t1Ranks.length;
      const t2Avg = t2Ranks.reduce((a, b) => a + b, 0) / t2Ranks.length;

      const winnerPoints = Math.ceil(pointsPerMatch * 0.6);
      const loserPoints = pointsPerMatch - winnerPoints;

      return {
        ...match,
        score: t1Avg < t2Avg
          ? { team1Points: winnerPoints, team2Points: loserPoints }
          : t1Avg > t2Avg
            ? { team1Points: loserPoints, team2Points: winnerPoints }
            : { team1Points: Math.ceil(pointsPerMatch / 2), team2Points: Math.floor(pointsPerMatch / 2) },
      };
    }),
  }));
}

export interface ScheduleAnalysis {
  gamesMin: number;
  gamesMax: number;
  sitMin: number;
  sitMax: number;
  partnerRepeats: number;
  oppMin: number;
  oppMax: number;
}

export function analyzeSchedule(
  players: Player[],
  rounds: Round[],
): ScheduleAnalysis {
  const gamesPlayed = new Map<string, number>();
  const sitOuts = new Map<string, number>();
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();

  for (const p of players) {
    gamesPlayed.set(p.id, 0);
    sitOuts.set(p.id, 0);
  }

  for (const round of rounds) {
    for (const id of round.sitOuts) {
      sitOuts.set(id, (sitOuts.get(id) ?? 0) + 1);
    }
    for (const match of round.matches) {
      for (const pid of [...match.team1, ...match.team2]) {
        gamesPlayed.set(pid, (gamesPlayed.get(pid) ?? 0) + 1);
      }
      const pk1 = partnerKey(match.team1[0], match.team1[1]);
      const pk2 = partnerKey(match.team2[0], match.team2[1]);
      partnerCounts.set(pk1, (partnerCounts.get(pk1) ?? 0) + 1);
      partnerCounts.set(pk2, (partnerCounts.get(pk2) ?? 0) + 1);
      for (const a of match.team1) {
        for (const b of match.team2) {
          const ok = partnerKey(a, b);
          opponentCounts.set(ok, (opponentCounts.get(ok) ?? 0) + 1);
        }
      }
    }
  }

  const gamesArr = [...gamesPlayed.values()];
  const sitArr = [...sitOuts.values()];
  const oppArr = [...opponentCounts.values()];

  let partnerRepeats = 0;
  for (const c of partnerCounts.values()) if (c > 1) partnerRepeats += c - 1;

  const totalPairs = players.length * (players.length - 1) / 2;
  const oppMin = opponentCounts.size < totalPairs ? 0 : Math.min(...oppArr);

  return {
    gamesMin: Math.min(...gamesArr),
    gamesMax: Math.max(...gamesArr),
    sitMin: Math.min(...sitArr),
    sitMax: Math.max(...sitArr),
    partnerRepeats,
    oppMin,
    oppMax: oppArr.length > 0 ? Math.max(...oppArr) : 0,
  };
}

export interface TeamScheduleAnalysis {
  gamesMin: number;
  gamesMax: number;
  sitMin: number;
  sitMax: number;
}

export function analyzeTeamSchedule(
  teams: Team[],
  rounds: Round[],
): TeamScheduleAnalysis {
  const gamesPlayed = new Map<string, number>();
  const sitOuts = new Map<string, number>();

  const teamByPlayer = new Map<string, string>();
  for (const t of teams) {
    gamesPlayed.set(t.id, 0);
    sitOuts.set(t.id, 0);
    teamByPlayer.set(t.player1Id, t.id);
    teamByPlayer.set(t.player2Id, t.id);
  }

  for (const round of rounds) {
    const sittingTeams = new Set<string>();
    for (const id of round.sitOuts) {
      const tid = teamByPlayer.get(id);
      if (tid) sittingTeams.add(tid);
    }
    for (const tid of sittingTeams) {
      sitOuts.set(tid, (sitOuts.get(tid) ?? 0) + 1);
    }
    for (const match of round.matches) {
      const tid1 = teamByPlayer.get(match.team1[0]);
      const tid2 = teamByPlayer.get(match.team2[0]);
      if (tid1) gamesPlayed.set(tid1, (gamesPlayed.get(tid1) ?? 0) + 1);
      if (tid2) gamesPlayed.set(tid2, (gamesPlayed.get(tid2) ?? 0) + 1);
    }
  }

  const gamesArr = [...gamesPlayed.values()];
  const sitArr = [...sitOuts.values()];

  return {
    gamesMin: Math.min(...gamesArr),
    gamesMax: Math.max(...gamesArr),
    sitMin: Math.min(...sitArr),
    sitMax: Math.max(...sitArr),
  };
}

/** Simulate a full dynamic tournament: generate round, score it, generate next, repeat. */
export function simulateDynamic(
  strategy: TournamentStrategy,
  players: Player[],
  config: TournamentConfig,
  numRounds: number,
  tournamentOverrides?: Partial<Tournament>,
): Round[] {
  const baseTournament: Tournament = {
    id: 'sim',
    name: 'Simulation',
    config,
    phase: 'in-progress',
    players,
    rounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...tournamentOverrides,
  };

  const initial = strategy.generateSchedule(players, config, baseTournament);
  if (initial.rounds.length === 0) return [];

  const allRounds: Round[] = scoreDeterministic(initial.rounds, config.pointsPerMatch);

  for (let i = 1; i < numRounds; i++) {
    const currentTournament: Tournament = { ...baseTournament, rounds: allRounds };
    const { rounds: newRounds } = strategy.generateAdditionalRounds(
      players, config, allRounds, 1, undefined, undefined, currentTournament,
    );
    if (newRounds.length === 0) break;
    allRounds.push(...scoreDeterministic(newRounds, config.pointsPerMatch));
  }

  return allRounds;
}
