import { z } from 'astro/zod';

const assertionSchema = z.tuple([
  z.string(),
  z.object({ minScore: z.number().optional(), maxNumericValue: z.number().optional() }),
]);

const assertionsSchema = z.record(z.string(), assertionSchema);

const matrixRowSchema = z.object({
  matchingUrlPattern: z.string(),
  assertions: assertionsSchema,
});

const lighthouseConfigSchema = z.object({
  ci: z.object({
    assert: z.union([
      z.object({ assertions: assertionsSchema }),
      z.object({ assertMatrix: z.array(matrixRowSchema).min(1) }),
    ]),
  }),
});

export interface Budget {
  audit: string;
  threshold: string;
  scope: string;
}

const unitFor = (audit: string): string => {
  if (audit.endsWith(':size')) {
    return ' bytes';
  }
  if (audit.endsWith(':count')) {
    return ' files';
  }
  return '';
};

const describeThreshold = (audit: string, options: z.infer<typeof assertionSchema>[1]): string => {
  if (options.minScore !== undefined) {
    return `score ≥ ${String(options.minScore)}`;
  }
  if (options.maxNumericValue !== undefined) {
    return `≤ ${String(options.maxNumericValue)}${unitFor(audit)}`;
  }
  return 'passes';
};

// The matrix patterns are regular expressions over the audited URLs; the colophon names them in words.
const describeScope = (pattern: string): string => {
  if (pattern === '.*') {
    return 'every page';
  }
  if (pattern.startsWith('^(?!')) {
    return 'text pages';
  }
  if (pattern.includes('/systems/')) {
    return 'system pages';
  }
  return pattern;
};

const rowsOf = (assertions: z.infer<typeof assertionsSchema>, scope: string): Budget[] =>
  Object.entries(assertions).map(([audit, [, options]]) => ({
    audit,
    threshold: describeThreshold(audit, options),
    scope,
  }));

export const readBudgets = (lighthouseConfig: unknown): Budget[] => {
  const { assert } = lighthouseConfigSchema.parse(lighthouseConfig).ci;
  if ('assertions' in assert) {
    return rowsOf(assert.assertions, 'every page');
  }
  return assert.assertMatrix.flatMap((row) =>
    rowsOf(row.assertions, describeScope(row.matchingUrlPattern)),
  );
};
