import { describe, expect, it } from 'vitest';
import { assertContentIntegrity, findBenchProblems } from '../../src/lib/integrity';

const reference = (id: string) => ({ id });

const graph = {
  technologies: [reference('nodejs')],
  roles: [{ id: 'fintech', data: { stack: [reference('nodejs')] } }],
  projects: [
    { id: 'queue', data: { kind: 'case-study' as const, stack: [reference('nodejs')] } },
    { id: 'harness', data: { kind: 'also-built' as const, stack: [reference('nodejs')] } },
  ],
};

describe('findBenchProblems', () => {
  it('accepts a graph where every case study has a bench and every bench a case study', () => {
    expect(findBenchProblems({ ...graph, scenarioIds: ['queue'] })).toEqual([]);
  });

  it('reports a case study without a bench', () => {
    expect(findBenchProblems({ ...graph, scenarioIds: [] })).toEqual([
      'case study "queue" has no bench scenario',
    ]);
  });

  it('reports a bench that names no case study', () => {
    expect(findBenchProblems({ ...graph, scenarioIds: ['queue', 'ghost'] })).toEqual([
      'bench scenario "ghost" has no case study',
    ]);
  });

  it('does not require benches for also-built projects', () => {
    expect(findBenchProblems({ ...graph, scenarioIds: ['queue'] })).not.toContain(
      'case study "harness" has no bench scenario',
    );
  });

  it('skips the rule when no scenario list is given', () => {
    expect(findBenchProblems(graph)).toEqual([]);
  });

  it('is part of the build assertion', () => {
    expect(() => {
      assertContentIntegrity({ ...graph, scenarioIds: [] });
    }).toThrow(/has no bench scenario/);
  });
});
