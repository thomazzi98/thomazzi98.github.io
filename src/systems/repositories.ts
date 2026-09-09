import registry from './repositories.json';

export interface RepositoryIdentity {
  readonly owner: string;
  readonly name: string;
  readonly defaultBranch: string;
  readonly pinnedCommit: string;
}

export interface RegisteredSystem {
  readonly id: string;
  readonly name: string;
  readonly repository: RepositoryIdentity;
}

// The registry is JSON so that the build scripts, which cannot load the models, read the same pins.
export const registeredSystems: readonly RegisteredSystem[] = registry;

export const presentationOrder: readonly string[] = registeredSystems.map((entry) => entry.id);

export const repositoryIdentity = (id: string): RepositoryIdentity => {
  const entry = registeredSystems.find((candidate) => candidate.id === id);
  if (entry === undefined) {
    throw new Error(`System "${id}" is not in src/systems/repositories.json.`);
  }
  return entry.repository;
};
