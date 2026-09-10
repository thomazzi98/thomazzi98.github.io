import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface PinnedSource {
  owner: string;
  name: string;
  commit: string;
}

const registryPath = resolve('src/systems/repositories.json');
const vendorDirectory = resolve('vendor');
const linkRoot = process.argv.includes('--link')
  ? process.argv[process.argv.indexOf('--link') + 1]
  : undefined;

interface RegistryEntry {
  repository: { owner: string; name: string; pinnedCommit: string };
}

const readPinnedSources = (): PinnedSource[] => {
  const entries = JSON.parse(readFileSync(registryPath, 'utf-8')) as RegistryEntry[];
  return entries.map(({ repository }) => {
    if (!/^[0-9a-f]{40}$/.test(repository.pinnedCommit)) {
      throw new Error(`${repository.owner}/${repository.name} has no full pinned commit.`);
    }
    return { owner: repository.owner, name: repository.name, commit: repository.pinnedCommit };
  });
};

const git = (directory: string, argumentList: string[]): string =>
  execFileSync('git', ['-C', directory, ...argumentList], { encoding: 'utf-8' });

const hasCommit = (directory: string, commit: string): boolean => {
  try {
    git(directory, ['cat-file', '-e', `${commit}^{commit}`]);
    return true;
  } catch {
    return false;
  }
};

const link = (source: PinnedSource, root: string): void => {
  const target = resolve(root, source.name);
  const destination = join(vendorDirectory, source.name);
  if (existsSync(destination)) {
    return;
  }
  if (!existsSync(join(target, '.git'))) {
    throw new Error(`${target} is not a git checkout.`);
  }
  symlinkSync(target, destination, 'junction');
  console.log(`linked ${destination} -> ${target}`);
};

const clone = (source: PinnedSource): void => {
  const destination = join(vendorDirectory, source.name);
  const url = `https://github.com/${source.owner}/${source.name}.git`;
  if (!existsSync(join(destination, '.git'))) {
    // Blobs are fetched lazily by git show, so the clone carries history without file contents.
    execFileSync(
      'git',
      ['clone', '--quiet', '--no-checkout', '--filter=blob:none', url, destination],
      { stdio: 'inherit' },
    );
  }
  if (!hasCommit(destination, source.commit)) {
    git(destination, ['fetch', '--quiet', 'origin']);
  }
  if (!hasCommit(destination, source.commit)) {
    throw new Error(
      `${source.owner}/${source.name} does not contain ${source.commit}. Push the pinned commit before building.`,
    );
  }
  console.log(`${source.name} at ${source.commit.slice(0, 7)}`);
};

mkdirSync(vendorDirectory, { recursive: true });
for (const source of readPinnedSources()) {
  if (linkRoot === undefined) {
    clone(source);
    continue;
  }
  link(source, linkRoot);
}
