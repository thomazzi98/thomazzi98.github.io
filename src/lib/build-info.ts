import { execSync } from 'node:child_process';

const environment = process.env;
const buildDate = new Date();

const readGitCommit = (): string => {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
};

const runUrl = (): string | undefined => {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = environment;
  if (GITHUB_REPOSITORY === undefined || GITHUB_RUN_ID === undefined) {
    return undefined;
  }
  return `${GITHUB_SERVER_URL ?? 'https://github.com'}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
};

export const buildInfo = {
  commit: (environment.GITHUB_SHA ?? readGitCommit()).slice(0, 7),
  date: buildDate.toISOString().slice(0, 10),
  yearMonth: buildDate.toISOString().slice(0, 7),
  runUrl: runUrl(),
  repositoryUrl: 'https://github.com/thomazzi98/thomazzi98.github.io',
};
