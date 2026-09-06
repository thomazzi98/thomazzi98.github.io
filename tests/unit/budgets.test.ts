import { describe, expect, it } from 'vitest';
import lighthouseConfig from '../../lighthouserc.json';
import { readBudgets } from '../../src/lib/budgets';

describe('readBudgets', () => {
  it('describes score, byte and file thresholds in words', () => {
    const budgets = readBudgets({
      ci: {
        assert: {
          assertions: {
            'categories:performance': ['error', { minScore: 0.95 }],
            'resource-summary:script:size': ['error', { maxNumericValue: 0 }],
            'resource-summary:font:count': ['error', { maxNumericValue: 3 }],
          },
        },
      },
    });
    expect(budgets).toEqual([
      { audit: 'categories:performance', threshold: 'score ≥ 0.95' },
      { audit: 'resource-summary:script:size', threshold: '≤ 0 bytes' },
      { audit: 'resource-summary:font:count', threshold: '≤ 3 files' },
    ]);
  });

  it('renders every row of the real lighthouserc.json', () => {
    expect(readBudgets(lighthouseConfig)).toEqual([
      { audit: 'categories:performance', threshold: 'score ≥ 0.95' },
      { audit: 'categories:accessibility', threshold: 'score ≥ 0.98' },
      { audit: 'categories:best-practices', threshold: 'score ≥ 0.98' },
      { audit: 'categories:seo', threshold: 'score ≥ 0.98' },
      { audit: 'resource-summary:script:size', threshold: '≤ 0 bytes' },
      { audit: 'resource-summary:document:size', threshold: '≤ 60000 bytes' },
      { audit: 'resource-summary:font:count', threshold: '≤ 3 files' },
    ]);
  });

  it('rejects a config without assertions', () => {
    expect(() => readBudgets({ ci: {} })).toThrow();
  });
});
