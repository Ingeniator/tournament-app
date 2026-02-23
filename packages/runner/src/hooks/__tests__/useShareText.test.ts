// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShareText } from '../useShareText';
import {
  makeCompletedTournament,
  makeInProgressTournament,
  scoreAllMatches,
  makeStandings,
} from './helpers';
import type { Nomination } from '@padel/common';

describe('useShareText', () => {
  describe('roundResults', () => {
    it('returns empty string for null tournament', () => {
      const { result } = renderHook(() => useShareText(null, []));
      expect(result.current.roundResults).toBe('');
    });

    it('returns formatted round results for scored tournament', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.roundResults).toContain('Round 1');
    });

    it('includes court names in round results', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.roundResults).toContain('Court 1');
    });

    it('includes sit-out info when players sit out', () => {
      const tournament = scoreAllMatches(makeInProgressTournament(5, 1));
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.roundResults).toContain('Sat out');
    });

    it('skips unscored rounds', () => {
      const tournament = makeInProgressTournament(8, 2);
      // Score only round 1
      const partial = {
        ...tournament,
        rounds: tournament.rounds.map((r, i) =>
          i === 0
            ? { ...r, matches: r.matches.map(m => ({ ...m, score: { team1Points: 15, team2Points: 9 } })) }
            : r,
        ),
      };
      const standings = makeStandings(partial);
      const { result } = renderHook(() => useShareText(partial, standings));
      expect(result.current.roundResults).toContain('Round 1');
      // Should not contain unscored rounds
      if (partial.rounds.length > 1) {
        expect(result.current.roundResults).not.toContain(`Round ${partial.rounds.length}`);
      }
    });
  });

  describe('standingsText', () => {
    it('returns empty string for null tournament', () => {
      const { result } = renderHook(() => useShareText(null, []));
      expect(result.current.standingsText).toBe('');
    });

    it('returns empty string when standings are empty', () => {
      const tournament = makeCompletedTournament(8, 2);
      const { result } = renderHook(() => useShareText(tournament, []));
      expect(result.current.standingsText).toBe('');
    });

    it('includes tournament name in standings text', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.standingsText).toContain('Test Tournament');
    });

    it('includes header row with # Name Pts', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.standingsText).toContain('#');
      expect(result.current.standingsText).toContain('Name');
      expect(result.current.standingsText).toContain('Pts');
    });

    it('includes all players in standings text', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      for (const s of standings) {
        expect(result.current.standingsText).toContain(s.playerName);
      }
    });
  });

  describe('buildMessengerText', () => {
    it('returns empty string for null tournament', () => {
      const { result } = renderHook(() => useShareText(null, []));
      expect(result.current.buildMessengerText(false)).toBe('');
    });

    it('returns empty string when standings are empty', () => {
      const tournament = makeCompletedTournament(8, 2);
      const { result } = renderHook(() => useShareText(tournament, []));
      expect(result.current.buildMessengerText(false)).toBe('');
    });

    it('includes tournament name with trophy emoji', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      const text = result.current.buildMessengerText(false);
      expect(text).toContain('Test Tournament');
    });

    it('includes standings section', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      const text = result.current.buildMessengerText(false);
      expect(text).toContain('Standings');
    });

    it('includes round results when includeRounds is true', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      const withRounds = result.current.buildMessengerText(true);
      const withoutRounds = result.current.buildMessengerText(false);
      expect(withRounds.length).toBeGreaterThan(withoutRounds.length);
      expect(withRounds).toContain('Round 1');
    });

    it('includes nominations when provided', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const nominations: Nomination[] = [
        { id: 'award-1', title: 'Sharpshooter', emoji: '\uD83C\uDFAF', description: 'Most accurate', playerNames: ['Player 1'], stat: '95%' },
      ];
      const { result } = renderHook(() => useShareText(tournament, standings, nominations));
      const text = result.current.buildMessengerText(false);
      expect(text).toContain('Sharpshooter');
      expect(text).toContain('Player 1');
    });

    it('includes metadata footer (rounds, pts/match, player count)', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      const text = result.current.buildMessengerText(false);
      expect(text).toContain('rounds');
      expect(text).toContain('24 pts/match');
      expect(text).toContain('players');
    });
  });

  describe('summaryText', () => {
    it('returns empty string for null tournament', () => {
      const { result } = renderHook(() => useShareText(null, []));
      expect(result.current.summaryText).toBe('');
    });

    it('includes tournament name', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.summaryText).toContain('Test Tournament');
    });

    it('lists all players', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      for (const p of tournament.players) {
        expect(result.current.summaryText).toContain(p.name);
      }
    });

    it('marks unavailable players', () => {
      const tournament = makeCompletedTournament(8, 2);
      const withUnavailable = {
        ...tournament,
        players: tournament.players.map((p, i) => i === 0 ? { ...p, unavailable: true } : p),
      };
      const standings = makeStandings(withUnavailable);
      const { result } = renderHook(() => useShareText(withUnavailable, standings));
      expect(result.current.summaryText).toContain('(out)');
    });

    it('lists courts', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.summaryText).toContain('Court 1');
      expect(result.current.summaryText).toContain('Court 2');
    });

    it('includes format and round count', () => {
      const tournament = makeCompletedTournament(8, 2);
      const standings = makeStandings(tournament);
      const { result } = renderHook(() => useShareText(tournament, standings));
      expect(result.current.summaryText).toContain('Americano');
      expect(result.current.summaryText).toContain('rounds');
    });
  });
});
