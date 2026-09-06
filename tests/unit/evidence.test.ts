import { describe, expect, it } from 'vitest';
import { indexEvidence } from '../../src/lib/evidence';

const entry = (id: string, ...stack: string[]) => ({
  id,
  data: { stack: stack.map((technologyId) => ({ id: technologyId })) },
});

const roles = [entry('sky-one', 'nodejs', 'mongodb'), entry('eight-assets', 'nodejs', 'mysql')];
const projects = [entry('indicators', 'mongodb'), entry('onboarding', 'mysql', 'bullmq')];

describe('indexEvidence', () => {
  const evidence = indexEvidence(roles, projects);

  it('lists every role that cites a technology, in input order', () => {
    expect(evidence.rolesFor('nodejs').map((role) => role.id)).toEqual(['sky-one', 'eight-assets']);
  });

  it('lists every project that cites a technology', () => {
    expect(evidence.projectsFor('mysql').map((project) => project.id)).toEqual(['onboarding']);
  });

  it('returns empty lists for a technology nothing cites', () => {
    expect(evidence.rolesFor('kafka')).toEqual([]);
    expect(evidence.projectsFor('kafka')).toEqual([]);
  });
});
