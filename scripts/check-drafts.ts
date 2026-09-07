import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const sourceDirectory = resolve('src');
const textExtensions = new Set(['.ts', '.astro', '.md', '.json', '.css', '.txt', '.mjs', '.yml']);
const draftMarker = /\[CONFIRM|#\s*CONFIRM/;
const isControlCharacter = (character: string): boolean => {
  const code = character.codePointAt(0) ?? 0;
  return code < 32 && code !== 9 && code !== 10 && code !== 13;
};
const hasControlCharacter = (line: string): boolean => Array.from(line).some(isControlCharacter);

const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

const problems = listFiles(sourceDirectory)
  .filter((file) => textExtensions.has(extname(file)))
  .flatMap((file) =>
    readFileSync(file, 'utf-8')
      .split('\n')
      .flatMap((line, index) =>
        draftMarker.test(line) || hasControlCharacter(line)
          ? [`${relative(sourceDirectory, file)}:${String(index + 1)}`]
          : [],
      ),
  );

if (problems.length > 0) {
  console.error(
    [
      'Draft markers or control characters left in src/:',
      ...problems.map((problem) => `  - ${problem}`),
    ].join('\n'),
  );
  process.exit(1);
}

console.log('No draft markers in src/.');
