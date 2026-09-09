import { describe, expect, it } from 'vitest';
import { collectEvidence } from '../../../src/systems/collect-evidence';
import {
  commitUrl,
  evidenceLabel,
  evidenceUrl,
  repositoryUrl,
  shortCommit,
} from '../../../src/systems/evidence';
import type { Repository } from '../../../src/systems/schema';
import { defineSystem } from '../../../src/systems/validate';
import { fixtureSystem } from './fixture';

const repository: Repository = {
  owner: 'thomazzi98',
  name: 'ledger',
  defaultBranch: 'main',
  pinnedCommit: '0123456789abcdef0123456789abcdef01234567',
  pinnedOn: '2026-09-09',
  firstCommitOn: '2026-09-01',
  commitCount: 12,
  packageManager: 'npm@11',
  runtime: 'Node.js 24',
};

describe('evidence links', () => {
  it('points at the file at the pinned commit, never at a branch', () => {
    expect(evidenceUrl(repository, { path: 'src/api.ts' })).toBe(
      'https://github.com/thomazzi98/ledger/blob/0123456789abcdef0123456789abcdef01234567/src/api.ts',
    );
  });

  it('anchors a line range and collapses a single line', () => {
    expect(evidenceUrl(repository, { path: 'src/api.ts', lines: [10, 20] })).toMatch(/#L10-L20$/);
    expect(evidenceUrl(repository, { path: 'src/api.ts', lines: [7, 7] })).toMatch(/#L7$/);
  });

  it('labels evidence the way an engineer would read it', () => {
    expect(evidenceLabel({ path: 'src/api.ts', lines: [10, 20] })).toBe('src/api.ts:10-20');
    expect(evidenceLabel({ path: 'src/api.ts', lines: [7, 7] })).toBe('src/api.ts:7');
    expect(evidenceLabel({ path: 'README.md' })).toBe('README.md');
  });

  it('derives the repository, commit and short hash', () => {
    expect(repositoryUrl(repository)).toBe('https://github.com/thomazzi98/ledger');
    expect(commitUrl(repository)).toMatch(/\/commit\/0123456789abcdef0123456789abcdef01234567$/);
    expect(shortCommit(repository)).toBe('0123456');
  });
});

describe('collectEvidence', () => {
  it('gathers every citation in the model with the place that cites it', () => {
    const cited = collectEvidence(defineSystem(fixtureSystem));
    expect(cited.map((entry) => [entry.citedBy, evidenceLabel(entry)])).toEqual([
      ['maturity', 'README.md'],
      ['stack postgresql', 'docker-compose.yml'],
      ['node client', 'README.md'],
      ['node api', 'src/api.ts'],
      ['node database', 'migrations/0001.sql'],
      ['edge client-api', 'src/api.ts:10-20'],
      ['edge api-database', 'src/repository.ts:5-9'],
      ['state machine entry', 'src/entry.ts'],
      ['decision postgres-only', 'docs/adr/0001.md'],
      ['fragment insert', 'src/repository.ts:5-9'],
      ['verification', 'vitest.config.ts'],
      ['verification layer Unit', 'src/entry.test.ts'],
    ]);
  });
});
