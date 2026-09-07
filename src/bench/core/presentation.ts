import type { Tone } from './simulation';

export interface StationView {
  badge?: string;
  tone?: Tone;
}

export interface Meter {
  id: string;
  label: string;
  value: number;
  maximum: number;
  unit: string;
  tone: Tone;
  caption?: string;
}

export interface Ledger {
  caption: string;
  columns: readonly string[];
  rows: readonly { cells: readonly string[]; tone: Tone; actionId?: string }[];
}

export interface BenchView {
  stations: Record<string, StationView>;
  meters: readonly Meter[];
  ledger: Ledger;
  headline: string;
}

export type Presenter<State, Levers> = (state: State, levers: Levers) => BenchView;

export const median = (samples: readonly number[]): number => {
  if (samples.length === 0) {
    return 0;
  }
  const sorted = [...samples].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  const lower = sorted[middle - 1] ?? upper;
  return sorted.length % 2 === 0 ? (lower + upper) / 2 : upper;
};
