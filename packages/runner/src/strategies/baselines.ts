import type { Round } from '@padel/common';
import { generateId } from '@padel/common';
import { shuffle } from './shared';

/** [team1, team2, courtIndex] where each team is [playerIndex, playerIndex] */
export type MatchTemplate = [[number, number], [number, number], number];

export type RoundTemplate = {
  matches: MatchTemplate[];
  sitOuts: number[];
};

export type BaselineTemplate = {
  players: number;
  courts: number;
  rounds: RoundTemplate[];
  score: [number, number, number, number];
};

const BASELINES: Record<string, BaselineTemplate> = {
  '10:2': {
    players: 10,
    courts: 2,
    score: [0, 1, 0, 2],
    rounds: [
      { matches: [[[0,3], [7,8], 0], [[2,4], [5,6], 1]], sitOuts: [1, 9] },
      { matches: [[[0,8], [1,4], 1], [[2,6], [3,9], 0]], sitOuts: [5, 7] },
      { matches: [[[0,7], [6,9], 1], [[1,8], [2,5], 0]], sitOuts: [3, 4] },
      { matches: [[[1,2], [4,7], 0], [[3,8], [5,9], 1]], sitOuts: [0, 6] },
      { matches: [[[0,1], [3,6], 1], [[4,5], [7,9], 0]], sitOuts: [2, 8] },
      { matches: [[[0,4], [2,3], 0], [[5,8], [6,7], 1]], sitOuts: [9, 1] },
      { matches: [[[0,6], [4,8], 0], [[1,3], [2,9], 1]], sitOuts: [5, 7] },
      { matches: [[[0,2], [5,7], 1], [[1,9], [6,8], 0]], sitOuts: [4, 3] },
      { matches: [[[1,5], [3,4], 0], [[2,7], [8,9], 1]], sitOuts: [6, 0] },
    ],
  },
  '14:3': {
    players: 14,
    courts: 3,
    score: [0, 2, 0, 2],
    rounds: [
      { matches: [[[0,3], [7,12], 0], [[1,6], [8,9], 1], [[4,5], [10,11], 2]], sitOuts: [13, 2] },
      { matches: [[[0,8], [2,9], 2], [[1,4], [6,13], 0], [[3,7], [5,10], 1]], sitOuts: [12, 11] },
      { matches: [[[0,4], [5,8], 1], [[1,13], [3,12], 2], [[2,10], [9,11], 0]], sitOuts: [6, 7] },
      { matches: [[[0,9], [3,13], 0], [[1,12], [2,11], 1], [[6,8], [7,10], 2]], sitOuts: [4, 5] },
      { matches: [[[1,2], [4,7], 2], [[3,5], [8,11], 0], [[6,10], [12,13], 1]], sitOuts: [0, 9] },
      { matches: [[[0,1], [4,10], 0], [[2,5], [6,12], 2], [[7,11], [9,13], 1]], sitOuts: [3, 8] },
      { matches: [[[0,6], [3,11], 2], [[2,8], [5,13], 0], [[4,12], [7,9], 1]], sitOuts: [10, 1] },
      { matches: [[[0,5], [1,9], 2], [[3,10], [4,6], 1], [[7,8], [11,12], 0]], sitOuts: [13, 2] },
      { matches: [[[0,13], [5,6], 1], [[1,10], [2,7], 0], [[3,8], [4,9], 2]], sitOuts: [11, 12] },
      { matches: [[[0,11], [1,8], 1], [[2,12], [3,4], 0], [[5,9], [10,13], 2]], sitOuts: [7, 6] },
      { matches: [[[0,12], [11,13], 2], [[1,7], [6,9], 0], [[2,3], [8,10], 1]], sitOuts: [5, 4] },
      { matches: [[[1,3], [2,13], 1], [[4,8], [10,12], 2], [[5,11], [6,7], 0]], sitOuts: [0, 9] },
      { matches: [[[0,10], [6,11], 0], [[1,5], [9,12], 1], [[2,4], [7,13], 2]], sitOuts: [3, 8] },
      { matches: [[[0,7], [8,13], 2], [[2,6], [5,12], 0], [[3,9], [4,11], 1]], sitOuts: [1, 10] },
    ],
  },
  '16:4': {
    players: 16,
    courts: 4,
    score: [0, 3, 0, 3],
    rounds: [
      { matches: [[[9,1], [7,8], 0], [[13,5], [0,11], 1], [[6,10], [15,3], 2], [[2,4], [14,12], 3]], sitOuts: [] },
      { matches: [[[12,11], [10,1], 0], [[0,9], [15,14], 1], [[6,7], [4,5], 2], [[2,8], [13,3], 3]], sitOuts: [] },
      { matches: [[[9,12], [5,3], 0], [[6,1], [13,14], 1], [[10,4], [8,0], 3], [[11,2], [7,15], 2]], sitOuts: [] },
      { matches: [[[4,15], [5,1], 3], [[10,11], [9,14], 2], [[8,6], [2,0], 0], [[7,13], [12,3], 1]], sitOuts: [] },
      { matches: [[[14,8], [5,15], 0], [[12,0], [11,9], 2], [[7,10], [13,6], 3], [[4,1], [2,3], 1]], sitOuts: [] },
      { matches: [[[10,13], [14,4], 0], [[11,3], [6,0], 3], [[9,5], [2,1], 2], [[8,15], [7,12], 1]], sitOuts: [] },
      { matches: [[[0,13], [1,15], 2], [[11,14], [7,3], 0], [[2,5], [12,10], 3], [[4,6], [8,9], 1]], sitOuts: [] },
      { matches: [[[11,6], [8,4], 2], [[7,1], [10,15], 1], [[13,9], [5,14], 3], [[0,3], [2,12], 0]], sitOuts: [] },
      { matches: [[[11,15], [3,4], 3], [[5,6], [10,0], 1], [[12,8], [7,14], 2], [[1,13], [2,9], 0]], sitOuts: [] },
      { matches: [[[6,14], [12,1], 3], [[8,13], [5,11], 1], [[0,15], [2,10], 0], [[9,3], [4,7], 2]], sitOuts: [] },
      { matches: [[[2,6], [5,7], 3], [[13,11], [15,12], 0], [[3,10], [9,4], 1], [[8,1], [0,14], 2]], sitOuts: [] },
      { matches: [[[3,1], [0,5], 2], [[11,8], [13,2], 1], [[15,6], [4,12], 0], [[7,9], [14,10], 3]], sitOuts: [] },
      { matches: [[[14,3], [8,5], 0], [[7,2], [13,15], 2], [[11,4], [12,6], 1], [[10,9], [1,0], 3]], sitOuts: [] },
      { matches: [[[0,4], [7,11], 0], [[14,1], [3,8], 3], [[15,2], [9,6], 1], [[5,10], [13,12], 2]], sitOuts: [] },
      { matches: [[[2,14], [9,15], 1], [[8,10], [5,12], 2], [[13,4], [7,0], 3], [[1,11], [3,6], 0]], sitOuts: [] },
    ],
  },
  '20:4': {
    players: 20,
    courts: 4,
    score: [0, 2, 0, 4],
    rounds: [
      { matches: [[[9,17], [16,14], 0], [[7,2], [0,13], 1], [[10,12], [5,18], 2], [[1,8], [11,3], 3]], sitOuts: [15, 19, 4, 6] },
      { matches: [[[2,19], [11,14], 0], [[3,7], [9,4], 2], [[15,16], [1,13], 3], [[17,6], [8,12], 1]], sitOuts: [0, 5, 18, 10] },
      { matches: [[[10,7], [19,17], 3], [[15,6], [0,9], 0], [[4,13], [5,11], 1], [[8,18], [2,16], 2]], sitOuts: [3, 1, 12, 14] },
      { matches: [[[5,9], [8,19], 1], [[4,15], [10,2], 0], [[18,12], [0,3], 3], [[6,1], [7,14], 2]], sitOuts: [11, 16, 17, 13] },
      { matches: [[[13,6], [3,10], 0], [[11,16], [0,12], 2], [[17,14], [5,15], 3], [[1,19], [18,4], 1]], sitOuts: [7, 9, 8, 2] },
      { matches: [[[17,13], [1,0], 2], [[10,18], [8,14], 1], [[3,16], [5,2], 0], [[12,11], [7,9], 3]], sitOuts: [19, 6, 15, 4] },
      { matches: [[[13,19], [17,12], 2], [[3,14], [11,15], 1], [[2,1], [9,6], 3], [[4,7], [16,8], 0]], sitOuts: [0, 5, 18, 10] },
      { matches: [[[19,5], [6,2], 2], [[10,11], [17,16], 1], [[8,4], [0,15], 3], [[13,7], [9,18], 0]], sitOuts: [14, 12, 1, 3] },
      { matches: [[[7,1], [10,8], 0], [[2,4], [12,14], 3], [[9,3], [0,19], 1], [[5,6], [18,15], 2]], sitOuts: [16, 13, 17, 11] },
      { matches: [[[14,19], [12,16], 0], [[5,0], [1,10], 1], [[6,4], [11,13], 3], [[3,18], [17,15], 2]], sitOuts: [8, 2, 9, 7] },
      { matches: [[[5,17], [11,7], 0], [[12,3], [1,16], 1], [[2,18], [10,9], 3], [[14,13], [0,8], 2]], sitOuts: [6, 4, 15, 19] },
      { matches: [[[17,7], [3,2], 1], [[19,12], [15,8], 0], [[9,1], [11,4], 2], [[13,16], [6,14], 3]], sitOuts: [18, 0, 10, 5] },
      { matches: [[[13,18], [9,19], 1], [[5,10], [0,11], 3], [[7,16], [15,2], 2], [[17,4], [6,8], 0]], sitOuts: [3, 14, 1, 12] },
      { matches: [[[12,1], [15,10], 0], [[2,0], [19,6], 3], [[14,4], [7,18], 1], [[5,3], [9,8], 2]], sitOuts: [16, 13, 17, 11] },
      { matches: [[[6,16], [4,1], 1], [[15,3], [19,10], 2], [[18,0], [17,11], 0], [[13,12], [14,5], 3]], sitOuts: [9, 2, 7, 8] },
      { matches: [[[5,7], [0,16], 1], [[14,10], [3,8], 2], [[12,9], [17,18], 3], [[2,13], [1,11], 0]], sitOuts: [19, 4, 6, 15] },
      { matches: [[[2,14], [1,3], 0], [[17,8], [7,19], 3], [[6,11], [15,12], 1], [[16,4], [9,13], 2]], sitOuts: [5, 18, 10, 0] },
      { matches: [[[15,13], [5,8], 1], [[4,0], [17,2], 2], [[19,18], [6,7], 0], [[16,10], [11,9], 3]], sitOuts: [1, 12, 14, 3] },
      { matches: [[[5,12], [8,2], 0], [[4,19], [1,18], 2], [[14,9], [10,0], 1], [[6,3], [7,15], 3]], sitOuts: [11, 17, 13, 16] },
    ],
  },
};

export function getBaseline(playerCount: number, courtCount: number): BaselineTemplate | null {
  return BASELINES[`${playerCount}:${courtCount}`] ?? null;
}

/**
 * Instantiate a baseline template into concrete Round[] using real player IDs and court IDs.
 * Shuffles the player array before mapping indices so structural positions vary.
 * Returns null if player/court count mismatch or not enough rounds in template.
 */
export function instantiateBaseline(
  template: BaselineTemplate,
  players: { id: string }[],
  courtIds: string[],
  roundCount: number,
  startRoundNumber: number,
): Round[] | null {
  if (players.length !== template.players) return null;
  if (courtIds.length !== template.courts) return null;
  if (roundCount > template.rounds.length) return null;

  const shuffledPlayers = shuffle(players);
  const playerIdByIndex = shuffledPlayers.map(p => p.id);

  const rounds: Round[] = [];
  for (let r = 0; r < roundCount; r++) {
    const rt = template.rounds[r];
    rounds.push({
      id: generateId(),
      roundNumber: startRoundNumber + r,
      matches: rt.matches.map(([team1, team2, courtIdx]) => ({
        id: generateId(),
        courtId: courtIds[courtIdx],
        team1: [playerIdByIndex[team1[0]], playerIdByIndex[team1[1]]] as [string, string],
        team2: [playerIdByIndex[team2[0]], playerIdByIndex[team2[1]]] as [string, string],
        score: null,
      })),
      sitOuts: rt.sitOuts.map(i => playerIdByIndex[i]),
    });
  }

  return rounds;
}
