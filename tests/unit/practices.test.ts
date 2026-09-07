import { describe, expect, it } from 'vitest';
import { isTiedToCaseStudy, sortPracticesByTie } from '../../src/lib/practices';

const caseStudies = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];
const practice = (id: string, claim: string, backedBy: string[]) => ({
  id,
  data: { claim, backedBy: backedBy.map((reference) => ({ id: reference })) },
});

const practices = [
  practice('c', 'Zebra claim tied to the third case.', ['third']),
  practice('a', 'Alpha claim tied to the second case.', ['second', 'harness']),
  practice('d', 'Untied claim.', ['harness']),
  practice('b', 'Beta claim tied to the first case.', ['first']),
  practice('e', 'Another claim tied to the second case.', ['second']),
];

describe('sortPracticesByTie', () => {
  it('orders rows by their first tied column so the grid reads as a diagonal', () => {
    expect(sortPracticesByTie(practices, caseStudies).map((entry) => entry.id)).toEqual([
      'b',
      'a',
      'e',
      'c',
      'd',
    ]);
  });

  it('does not mutate the input', () => {
    const copy = [...practices];
    sortPracticesByTie(practices, caseStudies);
    expect(practices).toEqual(copy);
  });
});

describe('isTiedToCaseStudy', () => {
  it('tells rows backed by a case study from rows backed only by smaller work', () => {
    expect(isTiedToCaseStudy(practices[1] ?? practice('x', 'x', []), caseStudies)).toBe(true);
    expect(isTiedToCaseStudy(practices[2] ?? practice('x', 'x', []), caseStudies)).toBe(false);
  });
});
