import { describe, expect, it } from 'vitest';
import type { LogEntry } from '../../../src/bench/core/simulation';
import { unrenderedEntries } from '../../../src/bench/render/log-window';

const entry = (sequence: number): LogEntry => ({
  sequence,
  at: sequence * 10,
  station: 'api',
  tone: 'neutral',
  message: `entry ${String(sequence)}`,
});

describe('unrenderedEntries', () => {
  it('returns only entries newer than the last rendered one', () => {
    const entries = [entry(1), entry(2), entry(3)];
    expect(unrenderedEntries(entries, 1).map((item) => item.sequence)).toEqual([2, 3]);
    expect(unrenderedEntries(entries, 3)).toEqual([]);
  });

  it('keeps working after the engine has trimmed the front of its log', () => {
    const trimmed = Array.from({ length: 400 }, (unusedItem, index) => entry(index + 51));
    expect(unrenderedEntries(trimmed, 440, 10).map((item) => item.sequence)).toEqual([
      441, 442, 443, 444, 445, 446, 447, 448, 449, 450,
    ]);
  });

  it('caps a burst to the capacity, keeping the newest', () => {
    const burst = Array.from({ length: 30 }, (unusedItem, index) => entry(index + 1));
    expect(unrenderedEntries(burst, 0, 10).map((item) => item.sequence)).toEqual([
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    ]);
  });
});
