import { describe, expect, it } from 'vitest';
import { selectAlsoBuilt, selectCaseStudies } from '../../src/lib/projects';

type Kind = 'case-study' | 'also-built';

const project = (id: string, kind: Kind, start: string, featured?: number) => ({
  id,
  data: { kind, featured, period: { start, end: null } },
});

const projects = [
  project('old-study', 'case-study', '2021-05'),
  project('tool', 'also-built', '2023-02'),
  project('second', 'case-study', '2022-07', 2),
  project('first', 'case-study', '2023-09', 1),
  project('newer-study', 'case-study', '2022-01'),
  project('script', 'also-built', '2022-08'),
];

const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe('selectCaseStudies', () => {
  it('puts featured studies first in rank order, then the rest by most recent start', () => {
    expect(ids(selectCaseStudies(projects))).toEqual([
      'first',
      'second',
      'newer-study',
      'old-study',
    ]);
  });
});

describe('selectAlsoBuilt', () => {
  it('returns the smaller work by most recent start', () => {
    expect(ids(selectAlsoBuilt(projects))).toEqual(['tool', 'script']);
  });
});
