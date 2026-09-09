import { describe, expect, it } from 'vitest';
import { systems } from '../../../src/systems';
import {
  patternSystemIds,
  presences,
  sharedPatterns,
  type PatternSystemId,
} from '../../../src/systems/shared-patterns';
import { fileExistsAtCommit, readFileAtCommit } from '../../../src/systems/sources';

const normalise = (text: string): string => text.replaceAll('\r\n', '\n').replace(/\n$/, '');

const lineCount = (text: string): number => normalise(text).split('\n').length;

const isPatternSystemId = (id: string): id is PatternSystemId =>
  (patternSystemIds as readonly string[]).includes(id);

const requiredPatterns = [
  'postgres-only-store',
  'table-driven-state-machine',
  'unknown-outcome',
  'idempotency-unique-index',
  'tenant-isolation',
  'verified-webhooks',
  'layering-by-tooling',
  'docs-verified-by-scripts',
  'secret-scanning',
  'least-privilege-roles',
  'decision-records',
];

describe('the shared patterns', () => {
  it('declare each pattern once, with a name and a description', () => {
    const ids = sharedPatterns.map((pattern) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pattern of sharedPatterns) {
      expect(pattern.name.length).toBeGreaterThan(0);
      expect(pattern.description.length).toBeGreaterThan(40);
    }
  });

  it('cover every pattern the architecture page promises', () => {
    const ids = new Set(sharedPatterns.map((pattern) => pattern.id));
    expect(requiredPatterns.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('name exactly the systems in the registry', () => {
    expect([...patternSystemIds].sort()).toEqual(systems.map((system) => system.id).sort());
  });

  it.each(systems)('give $id a presence, a note and known nodes in every pattern', (system) => {
    expect(isPatternSystemId(system.id)).toBe(true);
    if (!isPatternSystemId(system.id)) {
      return;
    }
    const nodeIds = new Set(system.nodes.map((node) => node.id));
    for (const pattern of sharedPatterns) {
      const reading = pattern.systems[system.id];
      expect(presences).toContain(reading.presence);
      expect(reading.note.length, `${pattern.id} has no note for ${system.id}`).toBeGreaterThan(20);
      expect(
        reading.evidence.length,
        `${pattern.id} cites nothing for ${system.id}`,
      ).toBeGreaterThan(0);
      for (const nodeId of reading.nodes) {
        expect(
          nodeIds.has(nodeId),
          `${pattern.id} names unknown node "${nodeId}" in ${system.id}`,
        ).toBe(true);
      }
      expect(new Set(reading.nodes).size).toBe(reading.nodes.length);
    }
  });

  it.each(systems)(
    'cite only files and line ranges that exist in $id at the pinned commit',
    { timeout: 120_000 },
    (system) => {
      if (!isPatternSystemId(system.id)) {
        throw new Error(`${system.id} is not a pattern system`);
      }
      const { repository } = system;
      const problems: string[] = [];
      const seen = new Set<string>();
      for (const pattern of sharedPatterns) {
        for (const evidence of pattern.systems[system.id].evidence) {
          const key = `${evidence.path}:${evidence.lines?.join('-') ?? ''}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          if (!fileExistsAtCommit(repository, evidence.path)) {
            problems.push(`${pattern.id} cites ${evidence.path}, which does not exist`);
            continue;
          }
          if (evidence.lines === undefined) {
            continue;
          }
          const total = lineCount(readFileAtCommit(repository, evidence.path));
          if (evidence.lines[1] > total) {
            problems.push(
              `${pattern.id} cites ${evidence.path}:${String(evidence.lines[0])}-${String(evidence.lines[1])}, but the file has ${String(total)} lines`,
            );
          }
        }
      }
      expect(problems).toEqual([]);
    },
  );
});
