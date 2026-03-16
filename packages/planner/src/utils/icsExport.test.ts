import { describe, it, expect } from 'vitest';
import { generateICS } from './icsExport';
import type { PlannerTournament } from '@padel/common';

function makeTournament(overrides: Partial<PlannerTournament> = {}): PlannerTournament {
  return {
    id: 't1',
    name: 'Test Tournament',
    organizerId: 'org1',
    createdAt: 1000,
    players: [],
    clubs: [],
    rankLabels: [],
    rankColors: [],
    captainMode: false,
    maldiciones: false,
    ...overrides,
  } as PlannerTournament;
}

describe('generateICS', () => {
  it('returns empty string when date is missing', () => {
    expect(generateICS(makeTournament())).toBe('');
  });

  it('generates valid ICS with required fields', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z' }));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('SUMMARY:Test Tournament');
    expect(ics).toContain('UID:t1@padel-tournament');
    expect(ics).toContain('DTSTART:20260615T100000Z');
  });

  it('uses default 120 min duration when not specified', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z' }));
    expect(ics).toContain('DTEND:20260615T120000Z');
  });

  it('uses custom duration', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z', duration: 90 }));
    expect(ics).toContain('DTEND:20260615T113000Z');
  });

  it('includes LOCATION when place is set', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z', place: 'Club Padel' }));
    expect(ics).toContain('LOCATION:Club Padel');
  });

  it('omits LOCATION when place is undefined', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z' }));
    expect(ics).not.toContain('LOCATION');
  });

  it('includes DESCRIPTION with escaped newlines', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z', description: 'Line 1\nLine 2' }));
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2');
  });

  it('omits event DESCRIPTION when description is undefined', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z' }));
    // The VALARM has its own DESCRIPTION, but the event-level one should be absent
    const lines = ics.split('\r\n');
    const eventDescriptions = lines.filter(
      (l, i) => l.startsWith('DESCRIPTION:') && !lines[i - 1]?.startsWith('ACTION:'),
    );
    expect(eventDescriptions).toHaveLength(0);
  });

  it('includes alarm with 4-hour trigger', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z' }));
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT4H');
    expect(ics).toContain('END:VALARM');
  });

  it('uses \\r\\n line endings', () => {
    const ics = generateICS(makeTournament({ date: '2026-06-15T10:00:00Z' }));
    expect(ics).toContain('\r\n');
    // Every line should end with \r\n
    const lines = ics.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
  });
});
