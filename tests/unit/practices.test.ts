import { readdirSync, readFileSync } from 'node:fs';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { practiceSchema } from '../../src/content/schemas';
import { findIntegrityProblems } from '../../src/lib/integrity';
import { systems } from '../../src/systems';

const practicesFile = new URL('../../src/content/practices.json', import.meta.url);
const rolesDirectory = new URL('../../src/content/roles/', import.meta.url);

const practices = z
  .array(practiceSchema)
  .parse(JSON.parse(readFileSync(practicesFile, 'utf-8')) as unknown);

const roleIds = readdirSync(rolesDirectory)
  .filter((name) => name.endsWith('.md'))
  .map((name) => name.replace(/\.md$/, ''));

describe('the practices on the About page', () => {
  it('number between eight and ten, each with a distinct id', () => {
    expect(practices.length).toBeGreaterThanOrEqual(8);
    expect(practices.length).toBeLessThanOrEqual(10);
    expect(new Set(practices.map((practice) => practice.id)).size).toBe(practices.length);
  });

  it('carry the positions one to n, each once, so About needs no second source for the order', () => {
    const positions = practices
      .map((practice) => practice.order)
      .sort((first, second) => first - second);
    expect(positions).toEqual(practices.map((_practice, index) => index + 1));
  });

  it('cite only systems in the registry and roles in the collection', () => {
    const problems = findIntegrityProblems({
      roles: roleIds.map((id) => ({ id, data: { stack: [] } })),
      technologies: [],
      systems: [...systems],
      practices: practices.map((practice) => ({ id: practice.id, data: practice })),
    });
    expect(problems.filter((problem) => problem.startsWith('practice'))).toEqual([]);
  });

  it('write each claim as one or two full sentences without an em dash', () => {
    for (const practice of practices) {
      expect(practice.claim, practice.id).toMatch(/[.:]$/);
      expect(practice.claim, practice.id).not.toContain('—');
    }
  });

  it('claim no job, queue or worker for the gateway, which has none at its pinned commit', () => {
    const backedByGateway = practices.filter((practice) =>
      practice.backing.some((backing) => backing.id === 'mini-payment-gateway'),
    );
    expect(backedByGateway.length).toBeGreaterThan(0);
    for (const practice of backedByGateway) {
      expect(practice.claim, practice.id).not.toMatch(/\b(job|queue|worker)s?\b/i);
    }
  });

  it('are each backed by at least one of the three systems or one role', () => {
    const systemIds = new Set(systems.map((system) => system.id));
    for (const practice of practices) {
      const backedBySystem = practice.backing.some(
        (backing) => backing.kind === 'system' && systemIds.has(backing.id),
      );
      const backedByRole = practice.backing.some((backing) => backing.kind === 'role');
      expect(backedBySystem || backedByRole, practice.id).toBe(true);
    }
  });
});
