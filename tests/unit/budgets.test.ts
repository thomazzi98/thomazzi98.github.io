import { describe, expect, it } from 'vitest';
import lighthouseConfig from '../../lighthouserc.json';
import { readBudgets } from '../../src/lib/budgets';

describe('readBudgets', () => {
  it('describes score and byte thresholds in words', () => {
    const budgets = readBudgets({
      ci: {
        assert: {
          assertions: {
            'categories:performance': ['error', { minScore: 0.95 }],
            'resource-summary:script:size': ['error', { maxNumericValue: 0 }],
          },
        },
      },
    });
    expect(budgets).toEqual([
      { audit: 'categories:performance', threshold: 'score ≥ 0.95' },
      { audit: 'resource-summary:script:size', threshold: '≤ 0 bytes' },
    ]);
  });

  it('accepts the real lighthouserc.json and finds the zero-script budget', () => {
    const budgets = readBudgets(lighthouseConfig);
    expect(budgets.find((budget) => budget.audit === 'resource-summary:script:size')).toEqual({
      audit: 'resource-summary:script:size',
      threshold: '≤ 0 bytes',
    });
  });

  it('rejects a config without assertions', () => {
    expect(() => readBudgets({ ci: {} })).toThrow();
  });
});
