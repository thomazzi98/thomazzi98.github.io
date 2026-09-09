import type { Fragment } from './schema';

const files = import.meta.glob<string>('./fragments/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const fragmentFileName = (fragment: Fragment): string =>
  `${fragment.id}.${fragment.language}`;

export const fragmentSource = (systemId: string, fragment: Fragment): string | undefined =>
  files[`./fragments/${systemId}/${fragmentFileName(fragment)}`];
