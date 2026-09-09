import { describe, expect, it } from 'vitest';
import {
  assertContentIntegrity,
  ContentIntegrityError,
  findIntegrityProblems,
} from '../../src/lib/integrity';

const technology = (id: string) => ({ id });
const reference = (id: string) => ({ id });

const validGraph = {
  technologies: [technology('typescript'), technology('mongodb')],
  roles: [{ id: 'sky-one', data: { stack: [reference('typescript'), reference('mongodb')] } }],
  projects: [
    { id: 'indicators', data: { stack: [reference('mongodb')], role: reference('sky-one') } },
  ],
};

describe('findIntegrityProblems', () => {
  it('accepts a graph where every reference resolves and every technology is used', () => {
    expect(findIntegrityProblems(validGraph)).toEqual([]);
  });

  it('reports a role that references a technology missing from the registry', () => {
    const graph = {
      ...validGraph,
      roles: [{ id: 'sky-one', data: { stack: [reference('typescript'), reference('kafka')] } }],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'role "sky-one" references unknown technology "kafka"',
    ]);
  });

  it('reports a project that belongs to an unknown role', () => {
    const graph = {
      ...validGraph,
      projects: [
        { id: 'indicators', data: { stack: [reference('mongodb')], role: reference('acme') } },
      ],
    };
    expect(findIntegrityProblems(graph)).toContain(
      'project "indicators" belongs to unknown role "acme"',
    );
  });

  it('reports a role that is concurrent with an unknown role', () => {
    const graph = {
      ...validGraph,
      roles: [
        {
          id: 'sky-one',
          data: {
            stack: [reference('typescript'), reference('mongodb')],
            concurrentWith: reference('ghost'),
          },
        },
      ],
    };
    expect(findIntegrityProblems(graph)).toContain(
      'role "sky-one" is concurrent with unknown role "ghost"',
    );
  });

  it('reports a registry entry that nothing references', () => {
    const graph = {
      ...validGraph,
      technologies: [...validGraph.technologies, technology('kafka')],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'technology "kafka" is not referenced by any role, project or system',
    ]);
  });
});

describe('assertContentIntegrity', () => {
  it('throws an error that lists every problem', () => {
    const graph = { ...validGraph, technologies: [technology('typescript')] };
    expect(() => {
      assertContentIntegrity(graph);
    }).toThrow(ContentIntegrityError);
    expect(() => {
      assertContentIntegrity(graph);
    }).toThrow(/unknown technology "mongodb"/);
  });

  it('returns silently for a valid graph', () => {
    expect(() => {
      assertContentIntegrity(validGraph);
    }).not.toThrow();
  });
});

describe('findIntegrityProblems with systems', () => {
  it('counts a technology cited by a system as referenced', () => {
    const graph = {
      ...validGraph,
      technologies: [...validGraph.technologies, technology('fastify')],
      systems: [{ id: 'gateway', stack: [{ technology: 'fastify' }] }],
    };
    expect(findIntegrityProblems(graph)).toEqual([]);
  });

  it('reports a system that cites a technology missing from the registry', () => {
    const graph = {
      ...validGraph,
      systems: [{ id: 'gateway', stack: [{ technology: 'redis' }] }],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'system "gateway" references unknown technology "redis"',
    ]);
  });
});
