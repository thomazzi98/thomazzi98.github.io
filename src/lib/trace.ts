import { type Period } from './period';

interface RoleLike {
  id: string;
  data: { period: Period; concurrentWith?: { id: string } | undefined };
}

export interface TraceSpan {
  id: string;
  startColumn: number;
  spanColumns: number;
  nested: boolean;
}

export interface Trace {
  origin: string;
  totalMonths: number;
  years: { label: number; startColumn: number }[];
  spans: TraceSpan[];
}

const parseYearMonth = (value: string): { year: number; month: number } => {
  const [yearPart, monthPart] = value.split('-');
  return { year: Number(yearPart), month: Number(monthPart) };
};

export const monthsBetween = (earlier: string, later: string): number => {
  const start = parseYearMonth(earlier);
  const end = parseYearMonth(later);
  return (end.year - start.year) * 12 + (end.month - start.month);
};

export const buildTrace = (roles: RoleLike[], now: string): Trace => {
  const starts = roles.map((role) => role.data.period.start).sort();
  const origin = starts[0];
  if (origin === undefined) {
    return { origin: now, totalMonths: 0, years: [], spans: [] };
  }

  const ends = roles.map((role) => role.data.period.end ?? now).sort();
  const latestEnd = ends[ends.length - 1] ?? now;
  const totalMonths = monthsBetween(origin, latestEnd) + 1;

  const spans = [...roles]
    .sort((first, second) => first.data.period.start.localeCompare(second.data.period.start))
    .map((role) => ({
      id: role.id,
      startColumn: monthsBetween(origin, role.data.period.start) + 1,
      spanColumns: monthsBetween(role.data.period.start, role.data.period.end ?? now) + 1,
      nested: role.data.concurrentWith !== undefined,
    }));

  const firstYear = parseYearMonth(origin).year;
  const lastYear = parseYearMonth(latestEnd).year;
  const years = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    const startColumn = monthsBetween(origin, `${String(year)}-01`) + 1;
    if (startColumn < 1) {
      continue;
    }
    years.push({ label: year, startColumn });
  }

  return { origin, totalMonths, years, spans };
};
