import type { Evidence, Repository } from './schema';

export const repositoryUrl = (repository: Repository): string =>
  `https://github.com/${repository.owner}/${repository.name}`;

export const commitUrl = (repository: Repository): string =>
  `${repositoryUrl(repository)}/commit/${repository.pinnedCommit}`;

export const shortCommit = (repository: Repository): string => repository.pinnedCommit.slice(0, 7);

export const evidenceUrl = (repository: Repository, evidence: Evidence): string => {
  const base = `${repositoryUrl(repository)}/blob/${repository.pinnedCommit}/${evidence.path}`;
  if (evidence.lines === undefined) {
    return base;
  }
  const [start, end] = evidence.lines;
  return start === end ? `${base}#L${String(start)}` : `${base}#L${String(start)}-L${String(end)}`;
};

export const evidenceLabel = (evidence: Evidence): string => {
  if (evidence.lines === undefined) {
    return evidence.path;
  }
  const [start, end] = evidence.lines;
  return start === end
    ? `${evidence.path}:${String(start)}`
    : `${evidence.path}:${String(start)}-${String(end)}`;
};
