import { describe, expect, it } from 'vitest';
import { unwoven, weaveCloth, wovenByCaseStudy, wovenByRole } from '../../src/lib/cloth';

const technologies = [
  { id: 'php', data: { name: 'PHP', group: 'familiar' as const, firstUsed: 2019 } },
  {
    id: 'nodejs',
    data: { name: 'Node.js', group: 'owned-in-production' as const, firstUsed: 2020 },
  },
  { id: 'solidity', data: { name: 'Solidity', group: 'shipped-with' as const, firstUsed: 2021 } },
];

const roles = [
  {
    id: 'school',
    data: {
      company: 'School',
      period: { start: '2019-03', end: '2019-06' },
      stack: [{ id: 'php' }],
    },
  },
  {
    id: 'fintech',
    data: {
      company: 'Fintech',
      period: { start: '2019-06', end: null },
      stack: [{ id: 'nodejs' }],
    },
  },
  {
    id: 'game',
    data: {
      company: 'Game',
      period: { start: '2019-08', end: '2019-09' },
      stack: [{ id: 'solidity' }],
    },
  },
];

const projects = [
  {
    id: 'queue',
    data: {
      kind: 'case-study' as const,
      period: { start: '2019-07', end: '2019-07' },
      stack: [{ id: 'nodejs' }],
    },
  },
  {
    id: 'tool',
    data: {
      kind: 'also-built' as const,
      period: { start: '2019-09', end: '2019-09' },
      stack: [{ id: 'php' }],
    },
  },
];

const cloth = weaveCloth({ roles, projects, technologies, now: '2019-10' });
const row = (id: string) => cloth.cells[cloth.threads.findIndex((thread) => thread.id === id)];

describe('weaveCloth', () => {
  it('lays one pick per month from the first role to now', () => {
    expect(cloth.picks).toEqual([
      '2019-03',
      '2019-04',
      '2019-05',
      '2019-06',
      '2019-07',
      '2019-08',
      '2019-09',
      '2019-10',
    ]);
  });

  it('orders the warp by first use, then by name', () => {
    expect(cloth.threads.map((thread) => thread.id)).toEqual(['php', 'nodejs', 'solidity']);
  });

  it('weaves a thread for every month of a role that uses it', () => {
    expect(row('php')).toEqual([1, 1, 1, 1, 0, 0, 0, 0].map((cell) => cell as 0 | 1));
    expect(row('nodejs')?.slice(0, 4)).toEqual([unwoven, unwoven, unwoven, wovenByRole]);
  });

  it('marks case-study months as floats and ignores also-built projects', () => {
    expect(row('nodejs')?.[4]).toBe(wovenByCaseStudy);
    expect(row('php')?.[6]).toBe(unwoven);
  });

  it('counts concurrent roles as a doubled treadle', () => {
    expect(cloth.treadles).toEqual([1, 1, 1, 2, 1, 2, 2, 1]);
  });

  it('returns an empty cloth without roles', () => {
    expect(weaveCloth({ roles: [], projects, technologies, now: '2019-10' }).picks).toEqual([]);
  });

  it('rejects a malformed month', () => {
    expect(() =>
      weaveCloth({
        roles: [
          { id: 'x', data: { company: 'X', period: { start: 'soon', end: null }, stack: [] } },
        ],
        projects: [],
        technologies,
        now: '2019-10',
      }),
    ).toThrow(RangeError);
  });
});
