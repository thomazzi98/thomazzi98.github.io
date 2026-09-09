import { describe, expect, it } from 'vitest';
import { collectEvidence } from '../../../src/systems/collect-evidence';
import { fragmentFileName, fragmentSource } from '../../../src/systems/fragments';
import { systems } from '../../../src/systems';
import {
  fileExistsAtCommit,
  hasSource,
  readFileAtCommit,
  readRepositoryFacts,
  sourcePath,
} from '../../../src/systems/sources';

const normalise = (text: string): string => text.replaceAll('\r\n', '\n').replace(/\n$/, '');

const lineCount = (text: string): number => normalise(text).split('\n').length;

it('registers each system once', () => {
  const ids = systems.map((system) => system.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(systems)('$id', (system) => {
  const { repository } = system;

  it('has its source checked out under the sources root', () => {
    expect(
      hasSource(repository),
      `Expected a clone of ${repository.name} at ${sourcePath(repository)}. Run "node scripts/checkout-sources.ts" or set SYSTEM_SOURCES_ROOT.`,
    ).toBe(true);
  });

  it('states repository facts that match git at the pinned commit', () => {
    expect(readRepositoryFacts(repository)).toEqual({
      commitCount: repository.commitCount,
      pinnedOn: repository.pinnedOn,
      firstCommitOn: repository.firstCommitOn,
    });
  });

  it('cites only files and line ranges that exist at the pinned commit', () => {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const evidence of collectEvidence(system)) {
      const key = `${evidence.path}:${evidence.lines?.join('-') ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (!fileExistsAtCommit(repository, evidence.path)) {
        problems.push(`${evidence.citedBy} cites ${evidence.path}, which does not exist`);
        continue;
      }
      if (evidence.lines === undefined) {
        continue;
      }
      const total = lineCount(readFileAtCommit(repository, evidence.path));
      if (evidence.lines[1] > total) {
        problems.push(
          `${evidence.citedBy} cites ${evidence.path}:${String(evidence.lines[0])}-${String(evidence.lines[1])}, but the file has ${String(total)} lines`,
        );
      }
    }
    expect(problems).toEqual([]);
  });

  it('copies every fragment verbatim from the pinned commit', () => {
    for (const fragment of system.fragments) {
      const copied = fragmentSource(system.id, fragment);
      expect(copied, `fragment file ${fragmentFileName(fragment)} is missing`).toBeDefined();
      const [start, end] = fragment.lines;
      const original = normalise(readFileAtCommit(repository, fragment.path))
        .split('\n')
        .slice(start - 1, end)
        .join('\n');
      expect(normalise(copied ?? ''), `fragment ${fragment.id} differs from ${fragment.path}`).toBe(
        original,
      );
    }
  });
});
