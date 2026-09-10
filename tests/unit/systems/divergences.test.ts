import { describe, expect, it } from 'vitest';
import { systems } from '../../../src/systems';
import { divergences } from '../../../src/systems/divergences';
import { patternSystemIds, type PatternSystemId } from '../../../src/systems/shared-patterns';
import { fileExistsAtCommit, readFileAtCommit } from '../../../src/systems/sources';

const normalise = (text: string): string => text.replaceAll('\r\n', '\n').replace(/\n$/, '');

const lineCount = (text: string): number => normalise(text).split('\n').length;

const isPatternSystemId = (id: string): id is PatternSystemId =>
  (patternSystemIds as readonly string[]).includes(id);

describe('the divergences', () => {
  it('declare each topic once, with a detail and a note per system', () => {
    const ids = divergences.map((divergence) => divergence.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const divergence of divergences) {
      expect(divergence.topic.length).toBeGreaterThan(0);
      expect(divergence.detail.length).toBeGreaterThan(40);
      for (const id of patternSystemIds) {
        const reading = divergence.systems[id];
        expect(reading.note.length, `${divergence.id} has no note for ${id}`).toBeGreaterThan(20);
        expect(reading.evidence.length, `${divergence.id} cites nothing for ${id}`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it('read the package managers from the models instead of repeating a version', () => {
    const tooling = divergences.find((divergence) => divergence.id === 'workspace-tooling');
    expect(tooling?.detail).toContain('both on npm@11.6.2');
    expect(tooling?.detail).not.toContain('npm@11.6.2 and npm@11.6.2');
  });

  it('do not cite the gateway environment example, which describes a simulator the code lacks', () => {
    const gatewayPaths = divergences.flatMap((divergence) =>
      divergence.systems['mini-payment-gateway'].evidence.map((entry) => entry.path),
    );
    expect(gatewayPaths).not.toContain('.env.example');
  });

  it('cite the whole gateway compose file as the proof that nothing serves a page', () => {
    const frontend = divergences.find((divergence) => divergence.id === 'frontend');
    expect(frontend?.systems['mini-payment-gateway'].evidence).toEqual([
      { path: 'docker-compose.yml', lines: [1, 149] },
    ]);
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
      for (const divergence of divergences) {
        for (const evidence of divergence.systems[system.id].evidence) {
          if (!fileExistsAtCommit(repository, evidence.path)) {
            problems.push(`${divergence.id} cites ${evidence.path}, which does not exist`);
            continue;
          }
          if (evidence.lines === undefined) {
            continue;
          }
          const total = lineCount(readFileAtCommit(repository, evidence.path));
          if (evidence.lines[1] > total) {
            problems.push(
              `${divergence.id} cites ${evidence.path}:${String(evidence.lines[0])}-${String(evidence.lines[1])}, but the file has ${String(total)} lines`,
            );
          }
        }
      }
      expect(problems).toEqual([]);
    },
  );
});
