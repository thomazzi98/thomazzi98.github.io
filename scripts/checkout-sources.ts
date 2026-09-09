import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface PinnedSource {
  owner: string;
  name: string;
  commit: string;
}

const systemsDirectory = resolve('src/systems');
const vendorDirectory = resolve('vendor');
const linkRoot = process.argv.includes('--link')
  ? process.argv[process.argv.indexOf('--link') + 1]
  : undefined;

const readPinnedSources = (): PinnedSource[] =>
  readdirSync(systemsDirectory)
    .filter((name) => name.endsWith('.system.ts'))
    .map((name) => readFileSync(join(systemsDirectory, name), 'utf-8'))
    .map((text) => {
      const block = /repository:\s*\{([\s\S]*?)\n\s*\}/.exec(text)?.[1] ?? '';
      const owner = /owner:\s*'([^']+)'/.exec(block)?.[1];
      const repositoryName = /name:\s*'([^']+)'/.exec(block)?.[1];
      const commit = /pinnedCommit:\s*'([0-9a-f]{40})'/.exec(block)?.[1];
      if (owner === undefined || repositoryName === undefined || commit === undefined) {
        throw new Error('A system file does not declare owner, name and pinnedCommit.');
      }
      return { owner, name: repositoryName, commit };
    });

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
    execFileSync('git', ['clone', '--quiet', '--no-checkout', url, destination], {
      stdio: 'inherit',
    });
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
