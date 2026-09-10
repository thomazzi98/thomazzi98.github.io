import { describe, expect, it } from 'vitest';
import type { PracticeBackingKind } from '../../src/content/schemas';
import {
  assertContentIntegrity,
  ContentIntegrityError,
  findIntegrityProblems,
} from '../../src/lib/integrity';

const technology = (id: string) => ({ id });
const reference = (id: string) => ({ id });
const backing = (kind: PracticeBackingKind, id: string) => ({ kind, id });

const gateway = {
  id: 'gateway',
  stack: [{ technology: 'fastify' }],
  nodes: [{ id: 'web', technologies: ['vite'] }],
};

const validGraph = {
  technologies: [
    technology('typescript'),
    technology('mongodb'),
    technology('fastify'),
    technology('vite'),
  ],
  roles: [{ id: 'sky-one', data: { stack: [reference('typescript'), reference('mongodb')] } }],
  systems: [gateway],
  practices: [
    {
      id: 'reproduce-first',
      data: { backing: [backing('role', 'sky-one'), backing('system', 'gateway')] },
    },
  ],
};

describe('findIntegrityProblems', () => {
  it('accepts a graph where every reference resolves and every technology is cited', () => {
    expect(findIntegrityProblems(validGraph)).toEqual([]);
  });

  it('reports a role that references a technology missing from the registry', () => {
    const graph = {
      ...validGraph,
      roles: [{ id: 'sky-one', data: { stack: [reference('typescript'), reference('kafka')] } }],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'role "sky-one" references unknown technology "kafka"',
      'technology "mongodb" is not referenced by any role or system',
    ]);
  });

  it('reports a system that cites a technology missing from the registry', () => {
    const graph = {
      ...validGraph,
      systems: [{ ...gateway, stack: [{ technology: 'fastify' }, { technology: 'redis' }] }],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'system "gateway" references unknown technology "redis"',
    ]);
  });

  it('reports a node that cites a technology missing from the registry', () => {
    const graph = {
      ...validGraph,
      systems: [{ ...gateway, nodes: [{ id: 'web', technologies: ['vite', 'testcontainers'] }] }],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'system "gateway" node "web" references unknown technology "testcontainers"',
    ]);
  });

  it('counts a technology cited only by a node as referenced', () => {
    const graph = { ...validGraph, systems: [{ ...gateway, nodes: [] }] };
    expect(findIntegrityProblems(graph)).toEqual([
      'technology "vite" is not referenced by any role or system',
    ]);
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

  it('reports a registry entry that neither a role nor a system cites', () => {
    const graph = {
      ...validGraph,
      technologies: [...validGraph.technologies, technology('kafka')],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'technology "kafka" is not referenced by any role or system',
    ]);
  });

  it('reports a practice that cites a system missing from the registry', () => {
    const graph = {
      ...validGraph,
      practices: [{ id: 'unknown-is-a-result', data: { backing: [backing('system', 'ledger')] } }],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'practice "unknown-is-a-result" cites unknown system "ledger"',
    ]);
  });

  it('reports a practice that cites a role missing from the collection', () => {
    const graph = {
      ...validGraph,
      practices: [{ id: 'read-model', data: { backing: [backing('role', 'acme')] } }],
    };
    expect(findIntegrityProblems(graph)).toEqual([
      'practice "read-model" cites unknown role "acme"',
    ]);
  });

  it('treats systems and practices as optional', () => {
    expect(
      findIntegrityProblems({
        technologies: [technology('typescript')],
        roles: [{ id: 'sky-one', data: { stack: [reference('typescript')] } }],
      }),
    ).toEqual([]);
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
    }).toThrow(/unknown technology "mongodb"[\s\S]*unknown technology "fastify"/);
  });

  it('returns silently for a valid graph', () => {
    expect(() => {
      assertContentIntegrity(validGraph);
    }).not.toThrow();
  });
});
