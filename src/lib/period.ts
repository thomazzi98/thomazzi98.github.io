export interface Period {
  start: string;
  end: string | null;
}

interface HasPeriod {
  data: { period: Period };
}

export const compareByStartDescending = (first: HasPeriod, second: HasPeriod): number =>
  second.data.period.start.localeCompare(first.data.period.start);

export const formatPeriod = ({ start, end }: Period): string => `${start} → ${end ?? 'present'}`;
