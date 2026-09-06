import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const sourceDirectory = resolve('src');
const draftMarker = /\[CONFIRM|#\s*CONFIRM/;

const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

const problems = listFiles(sourceDirectory).flatMap((file) =>
  readFileSync(file, 'utf-8')
    .split('\n')
    .flatMap((line, index) =>
      draftMarker.test(line) ? [`${relative(sourceDirectory, file)}:${String(index + 1)}`] : [],
    ),
);

if (problems.length > 0) {
  console.error(
    ['Draft markers left in src/:', ...problems.map((problem) => `  - ${problem}`)].join('\n'),
  );
  process.exit(1);
}

console.log('No draft markers in src/.');
