import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Repository } from './schema';

export const sourcesRoot = (): string => resolve(process.env.SYSTEM_SOURCES_ROOT ?? 'vendor');

export const sourcePath = (repository: Repository): string =>
  resolve(sourcesRoot(), repository.name);

export const hasSource = (repository: Repository): boolean =>
  existsSync(resolve(sourcePath(repository), '.git'));

const git = (repository: Repository, argumentList: string[]): string =>
  execFileSync('git', ['-C', sourcePath(repository), ...argumentList], {
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

export const readFileAtCommit = (repository: Repository, path: string): string =>
  git(repository, ['show', `${repository.pinnedCommit}:${path}`]);

export const fileExistsAtCommit = (repository: Repository, path: string): boolean => {
  try {
    git(repository, ['cat-file', '-e', `${repository.pinnedCommit}:${path}`]);
    return true;
  } catch {
    return false;
  }
};

export interface RepositoryFacts {
  commitCount: number;
  pinnedOn: string;
  firstCommitOn: string;
}

export const readRepositoryFacts = (repository: Repository): RepositoryFacts => ({
  commitCount: Number(git(repository, ['rev-list', '--count', repository.pinnedCommit]).trim()),
  pinnedOn: git(repository, ['show', '-s', '--format=%as', repository.pinnedCommit]).trim(),
  firstCommitOn:
    git(repository, ['log', '--reverse', '--format=%as', repository.pinnedCommit])
      .split('\n')
      .find((line) => line.trim() !== '') ?? '',
});
