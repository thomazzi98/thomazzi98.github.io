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

// A model cites the same file many times; one git process per file keeps the check fast.
const fileCache = new Map<string, string | undefined>();

const cacheKey = (repository: Repository, path: string): string =>
  `${repository.name}@${repository.pinnedCommit}:${path}`;

const readOrUndefined = (repository: Repository, path: string): string | undefined => {
  const key = cacheKey(repository, path);
  if (fileCache.has(key)) {
    return fileCache.get(key);
  }
  let content: string | undefined;
  try {
    content = git(repository, ['show', `${repository.pinnedCommit}:${path}`]);
  } catch {
    content = undefined;
  }
  fileCache.set(key, content);
  return content;
};

export const readFileAtCommit = (repository: Repository, path: string): string => {
  const content = readOrUndefined(repository, path);
  if (content === undefined) {
    throw new Error(`${path} does not exist in ${repository.name} at ${repository.pinnedCommit}`);
  }
  return content;
};

export const fileExistsAtCommit = (repository: Repository, path: string): boolean =>
  readOrUndefined(repository, path) !== undefined;

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
