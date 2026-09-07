import type { LogEntry } from '../core/simulation';

export const logCapacity = 10;

export const unrenderedEntries = (
  entries: readonly LogEntry[],
  lastRenderedSequence: number,
  capacity = logCapacity,
): LogEntry[] => entries.filter((entry) => entry.sequence > lastRenderedSequence).slice(-capacity);
