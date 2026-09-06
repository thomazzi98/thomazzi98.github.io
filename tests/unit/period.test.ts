import { describe, expect, it } from 'vitest';
import { compareByStartDescending, formatPeriod } from '../../src/lib/period';

const entry = (start: string, end: string | null = null) => ({ data: { period: { start, end } } });

describe('compareByStartDescending', () => {
  it('orders the most recent start first', () => {
    const sorted = [entry('2020-06'), entry('2026-02'), entry('2022-11')].sort(
      compareByStartDescending,
    );
    expect(sorted.map((item) => item.data.period.start)).toEqual(['2026-02', '2022-11', '2020-06']);
  });
});

describe('formatPeriod', () => {
  it('renders a closed period as start → end', () => {
    expect(formatPeriod({ start: '2021-12', end: '2022-05' })).toBe('2021-12 → 2022-05');
  });

  it('renders an open period as start → present', () => {
    expect(formatPeriod({ start: '2026-09', end: null })).toBe('2026-09 → present');
  });
});
