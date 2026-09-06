import { describe, expect, it } from 'vitest';
import {
  compareByFirstUsedThenName,
  groupTechnologyNames,
  selectGroup,
  type TechnologyGroup,
} from '../../src/lib/technology-groups';

const technology = (name: string, firstUsed: number, group: TechnologyGroup) => ({
  data: { name, firstUsed, group },
});

const registry = [
  technology('Redis', 2021, 'shipped-with'),
  technology('TypeScript', 2020, 'owned-in-production'),
  technology('Astro', 2026, 'familiar'),
  technology('MySQL', 2019, 'owned-in-production'),
  technology('Express', 2020, 'owned-in-production'),
];

describe('compareByFirstUsedThenName', () => {
  it('orders by first use, then by name', () => {
    const names = [...registry].sort(compareByFirstUsedThenName).map((entry) => entry.data.name);
    expect(names).toEqual(['MySQL', 'Express', 'TypeScript', 'Redis', 'Astro']);
  });
});

describe('selectGroup', () => {
  it('returns one group in order', () => {
    expect(selectGroup(registry, 'owned-in-production').map((entry) => entry.data.name)).toEqual([
      'MySQL',
      'Express',
      'TypeScript',
    ]);
  });
});

describe('groupTechnologyNames', () => {
  it('labels every group, including empty ones, in registry order', () => {
    expect(
      groupTechnologyNames(registry.filter((entry) => entry.data.group !== 'familiar')),
    ).toEqual([
      { label: 'Owned in production', names: ['MySQL', 'Express', 'TypeScript'] },
      { label: 'Shipped with', names: ['Redis'] },
      { label: 'Familiar', names: [] },
    ]);
  });
});
