import { z } from 'astro/zod';

const assertionSchema = z.tuple([
  z.string(),
  z.object({ minScore: z.number().optional(), maxNumericValue: z.number().optional() }),
]);

const lighthouseConfigSchema = z.object({
  ci: z.object({ assert: z.object({ assertions: z.record(z.string(), assertionSchema) }) }),
});

export interface Budget {
  audit: string;
  threshold: string;
}

const describeThreshold = (options: z.infer<typeof assertionSchema>[1]): string => {
  if (options.minScore !== undefined) {
    return `score ≥ ${String(options.minScore)}`;
  }
  if (options.maxNumericValue !== undefined) {
    return `≤ ${String(options.maxNumericValue)} bytes`;
  }
  return 'passes';
};

export const readBudgets = (lighthouseConfig: unknown): Budget[] =>
  Object.entries(lighthouseConfigSchema.parse(lighthouseConfig).ci.assert.assertions).map(
    ([audit, [, options]]) => ({ audit, threshold: describeThreshold(options) }),
  );
