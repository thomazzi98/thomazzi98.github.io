import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const distDirectory = resolve('dist');

const listHtmlFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return listHtmlFiles(path);
    }
    return name.endsWith('.html') ? [path] : [];
  });

const attributePattern = /\b(?:href|src)="([^"]+)"/g;

const isExternal = (target: string) =>
  /^(?:[a-z]+:)?\/\//i.test(target) || target.startsWith('mailto:') || target.startsWith('data:');

const resolveTarget = (fromFile: string, target: string): string => {
  const [pathPart] = target.split('#');
  const withoutQuery = (pathPart ?? '').split('?')[0] ?? '';
  const base = withoutQuery.startsWith('/')
    ? join(distDirectory, withoutQuery)
    : resolve(fromFile, '..', withoutQuery);
  if (withoutQuery.endsWith('/')) {
    return join(base, 'index.html');
  }
  return base;
};

const targetExists = (path: string): boolean =>
  existsSync(path) || existsSync(join(path, 'index.html')) || existsSync(`${path}.html`);

const fragmentExists = (path: string, fragment: string): boolean => {
  const documentPath =
    existsSync(path) && statSync(path).isFile() ? path : join(path, 'index.html');
  if (!existsSync(documentPath)) {
    return false;
  }
  return readFileSync(documentPath, 'utf-8').includes(`id="${fragment}"`);
};

const problems: string[] = [];

for (const file of listHtmlFiles(distDirectory)) {
  const html = readFileSync(file, 'utf-8');
  for (const match of html.matchAll(attributePattern)) {
    const target = match[1] ?? '';
    if (isExternal(target)) {
      continue;
    }
    const [, fragment] = target.split('#');
    const path = resolveTarget(file, target);
    const location = relative(distDirectory, file);
    if (target.startsWith('#')) {
      if (!html.includes(`id="${target.slice(1)}"`)) {
        problems.push(`${location}: fragment ${target} does not exist on the page`);
      }
      continue;
    }
    if (!targetExists(path)) {
      problems.push(`${location}: ${target} does not resolve inside dist/`);
      continue;
    }
    if (fragment !== undefined && !fragmentExists(path, fragment)) {
      problems.push(`${location}: ${target} points at a missing fragment`);
    }
  }
}

if (problems.length > 0) {
  console.error(
    ['Broken internal links:', ...problems.map((problem) => `  - ${problem}`)].join('\n'),
  );
  process.exit(1);
}

console.log('All internal links resolve.');
