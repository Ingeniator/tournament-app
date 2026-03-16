import { describe, it, expect } from 'vitest';
import { computeEventStatus, EventTournamentInfo } from './useEventTournaments';

function makeInfo(overrides: Partial<Pick<EventTournamentInfo, 'hasStarted' | 'isCompleted'>> = {}): EventTournamentInfo {
  return {
    id: 'test',
    name: 'Test',
    hasRunnerData: false,
    hasStarted: false,
    isCompleted: false,
    playerCount: 0,
    approvedCount: 0,
    registeredCount: 0,
    capacity: 16,
    weight: 1,
    raw: { players: [], clubs: [], rankLabels: [], rankColors: [], groupLabels: undefined, captainMode: false, maldiciones: false, format: undefined },
    ...overrides,
  };
}

describe('computeEventStatus', () => {
  it('returns draft for empty list', () => {
    expect(computeEventStatus([])).toBe('draft');
  });

  it('returns draft when all tournaments are draft', () => {
    const infos = [makeInfo(), makeInfo()];
    expect(computeEventStatus(infos)).toBe('draft');
  });

  it('returns active when one tournament has started', () => {
    const infos = [
      makeInfo({ hasStarted: true }),
      makeInfo(),
    ];
    expect(computeEventStatus(infos)).toBe('active');
  });

  it('returns completed when all tournaments are completed', () => {
    const infos = [
      makeInfo({ isCompleted: true, hasStarted: true }),
      makeInfo({ isCompleted: true, hasStarted: true }),
    ];
    expect(computeEventStatus(infos)).toBe('completed');
  });

  it('returns active when mix of completed and started', () => {
    const infos = [
      makeInfo({ isCompleted: true, hasStarted: true }),
      makeInfo({ hasStarted: true }),
    ];
    expect(computeEventStatus(infos)).toBe('active');
  });

  it('returns active for single started tournament', () => {
    const infos = [makeInfo({ hasStarted: true })];
    expect(computeEventStatus(infos)).toBe('active');
  });

  it('returns completed for single completed tournament', () => {
    const infos = [makeInfo({ isCompleted: true, hasStarted: true })];
    expect(computeEventStatus(infos)).toBe('completed');
  });

  it('edge case: isCompleted true but hasStarted false returns draft when mixed with draft', () => {
    // This is a potentially inconsistent state — completed without started.
    // The function checks allCompleted first, then anyStarted.
    // With one completed (hasStarted=false) and one draft, allCompleted=false, anyStarted=false → draft.
    const infos = [
      makeInfo({ isCompleted: true, hasStarted: false }),
      makeInfo(),
    ];
    expect(computeEventStatus(infos)).toBe('draft');
  });

  it('edge case: single tournament with isCompleted true but hasStarted false returns completed', () => {
    // allCompleted is true (single item), so it returns completed regardless of hasStarted.
    const infos = [makeInfo({ isCompleted: true, hasStarted: false })];
    expect(computeEventStatus(infos)).toBe('completed');
  });
});
