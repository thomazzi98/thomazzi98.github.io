import { describe, expect, it } from 'vitest';
import { buildTrace, monthsBetween } from '../../src/lib/trace';

const role = (id: string, start: string, end: string | null, concurrentWith?: string) => ({
  id,
  data: {
    period: { start, end },
    concurrentWith: concurrentWith === undefined ? undefined : { id: concurrentWith },
  },
});

describe('monthsBetween', () => {
  it('counts whole months across a year boundary', () => {
    expect(monthsBetween('2019-03', '2020-06')).toBe(15);
  });

  it('returns zero for the same month', () => {
    expect(monthsBetween('2022-05', '2022-05')).toBe(0);
  });
});

describe('buildTrace', () => {
  const roles = [
    role('eight-assets', '2020-06', '2022-05'),
    role('grupo-well', '2019-03', '2020-06'),
    role('gold-rush', '2021-12', '2022-05', 'eight-assets'),
    role('sky-one', '2022-11', null),
  ];
  const trace = buildTrace(roles, '2026-09');

  it('starts the axis at the earliest role and spans to the present', () => {
    expect(trace.origin).toBe('2019-03');
    expect(trace.totalMonths).toBe(91);
  });

  it('orders spans by start and places them on one-based month columns', () => {
    expect(trace.spans.map((span) => span.id)).toEqual([
      'grupo-well',
      'eight-assets',
      'gold-rush',
      'sky-one',
    ]);
    expect(trace.spans[0]).toEqual({
      id: 'grupo-well',
      startColumn: 1,
      spanColumns: 16,
      nested: false,
    });
  });

  it('marks a concurrent role as nested and extends an open role to now', () => {
    expect(trace.spans.find((span) => span.id === 'gold-rush')?.nested).toBe(true);
    expect(trace.spans.find((span) => span.id === 'sky-one')).toMatchObject({
      startColumn: 45,
      spanColumns: 47,
    });
  });

  it('emits a tick for every January inside the axis', () => {
    expect(trace.years.map((year) => year.label)).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ]);
    expect(trace.years[0]).toEqual({ label: 2020, startColumn: 11 });
  });

  it('returns an empty trace when there are no roles', () => {
    expect(buildTrace([], '2026-09')).toEqual({
      origin: '2026-09',
      totalMonths: 0,
      years: [],
      spans: [],
    });
  });
});
