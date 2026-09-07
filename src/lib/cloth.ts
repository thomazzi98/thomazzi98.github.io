import type { TechnologyGroup } from './technology-groups';
import { compareByFirstUsedThenName } from './technology-groups';

interface Period {
  start: string;
  end: string | null;
}

interface Reference {
  id: string;
}

interface RoleLike {
  id: string;
  data: { company: string; period: Period; stack: readonly Reference[] };
}

interface ProjectLike {
  id: string;
  data: { kind: 'case-study' | 'also-built'; period: Period; stack: readonly Reference[] };
}

interface TechnologyLike {
  id: string;
  data: { name: string; group: TechnologyGroup; firstUsed: number };
}

export interface Thread {
  id: string;
  name: string;
  group: TechnologyGroup;
}

export type Weave = 0 | 1 | 2;

export interface Cloth {
  threads: Thread[];
  picks: string[];
  cells: Weave[][];
  treadles: number[];
  rolesByPick: string[][];
}

export interface ClothInput {
  roles: readonly RoleLike[];
  projects: readonly ProjectLike[];
  technologies: readonly TechnologyLike[];
  now: string;
}

export const unwoven: Weave = 0;
export const wovenByRole: Weave = 1;
export const wovenByCaseStudy: Weave = 2;

const monthIndex = (yearMonth: string): number => {
  const [year, month] = yearMonth.split('-').map(Number);
  if (year === undefined || month === undefined || Number.isNaN(year) || Number.isNaN(month)) {
    throw new RangeError(`Expected YYYY-MM, received ${yearMonth}`);
  }
  return year * 12 + (month - 1);
};

const yearMonthOf = (index: number): string =>
  `${String(Math.floor(index / 12))}-${String((index % 12) + 1).padStart(2, '0')}`;

const spanOf = (period: Period, now: string): [number, number] => [
  monthIndex(period.start),
  monthIndex(period.end ?? now),
];

export const weaveCloth = ({ roles, projects, technologies, now }: ClothInput): Cloth => {
  if (roles.length === 0) {
    return { threads: [], picks: [], cells: [], treadles: [], rolesByPick: [] };
  }
  const first = Math.min(...roles.map((role) => monthIndex(role.data.period.start)));
  const last = monthIndex(now);
  const picks = [...Array(last - first + 1).keys()].map((offset) => yearMonthOf(first + offset));
  const threads: Thread[] = [...technologies]
    .sort(compareByFirstUsedThenName)
    .map((technology) => ({
      id: technology.id,
      name: technology.data.name,
      group: technology.data.group,
    }));
  const threadIndex = new Map(threads.map((thread, index) => [thread.id, index]));
  const cells: Weave[][] = threads.map(() => picks.map(() => unwoven));
  const treadles = picks.map(() => 0);
  const rolesByPick: string[][] = picks.map(() => []);

  const weave = (stack: readonly Reference[], period: Period, value: Weave): void => {
    const [start, end] = spanOf(period, now);
    for (const technology of stack) {
      const row = threadIndex.get(technology.id);
      if (row === undefined) {
        continue;
      }
      for (let month = Math.max(start, first); month <= Math.min(end, last); month += 1) {
        const column = month - first;
        const current = cells[row]?.[column] ?? unwoven;
        if (cells[row] !== undefined && value > current) {
          cells[row][column] = value;
        }
      }
    }
  };

  for (const role of roles) {
    weave(role.data.stack, role.data.period, wovenByRole);
    const [start, end] = spanOf(role.data.period, now);
    for (let month = Math.max(start, first); month <= Math.min(end, last); month += 1) {
      const column = month - first;
      treadles[column] = (treadles[column] ?? 0) + 1;
      rolesByPick[column]?.push(role.data.company);
    }
  }
  for (const project of projects) {
    if (project.data.kind === 'case-study') {
      weave(project.data.stack, project.data.period, wovenByCaseStudy);
    }
  }
  return { threads, picks, cells, treadles, rolesByPick };
};
