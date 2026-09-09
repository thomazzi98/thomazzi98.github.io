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
      { audit: 'categories:performance', threshold: 'score ≥ 0.95', scope: 'every page' },
      { audit: 'resource-summary:script:size', threshold: '≤ 0 bytes', scope: 'every page' },
      { audit: 'resource-summary:font:count', threshold: '≤ 3 files', scope: 'every page' },
    ]);
  });

  it('names the scope of every row of an assertion matrix', () => {
    const budgets = readBudgets({
      ci: {
        assert: {
          assertMatrix: [
            {
              matchingUrlPattern: '.*',
              assertions: { 'resource-summary:font:count': ['error', { maxNumericValue: 4 }] },
            },
            {
              matchingUrlPattern: '^(?!.*/systems/[^/]+/index\\.html$).*$',
              assertions: {
                'resource-summary:document:size': ['error', { maxNumericValue: 60000 }],
              },
            },
            {
              matchingUrlPattern: '/systems/[^/]+/index\\.html$',
              assertions: {
                'resource-summary:document:size': ['error', { maxNumericValue: 120000 }],
              },
            },
          ],
        },
      },
    });
    expect(budgets).toEqual([
      { audit: 'resource-summary:font:count', threshold: '≤ 4 files', scope: 'every page' },
      { audit: 'resource-summary:document:size', threshold: '≤ 60000 bytes', scope: 'text pages' },
      {
        audit: 'resource-summary:document:size',
        threshold: '≤ 120000 bytes',
        scope: 'system pages',
      },
    ]);
  });

  it('renders every row of the real lighthouserc.json', () => {
    expect(readBudgets(lighthouseConfig)).toEqual([
      { audit: 'categories:performance', threshold: 'score ≥ 0.95', scope: 'every page' },
      { audit: 'categories:accessibility', threshold: 'score ≥ 0.98', scope: 'every page' },
      { audit: 'categories:best-practices', threshold: 'score ≥ 0.98', scope: 'every page' },
      { audit: 'categories:seo', threshold: 'score ≥ 0.98', scope: 'every page' },
      { audit: 'resource-summary:script:size', threshold: '≤ 90000 bytes', scope: 'every page' },
      { audit: 'resource-summary:font:count', threshold: '≤ 4 files', scope: 'every page' },
      { audit: 'resource-summary:document:size', threshold: '≤ 60000 bytes', scope: 'text pages' },
      {
        audit: 'resource-summary:document:size',
        threshold: '≤ 120000 bytes',
        scope: 'system pages',
      },
    ]);
  });

  it('audits the home, systems, architecture, decisions, about and colophon pages', () => {
    expect(lighthouseConfig.ci.collect.url).toEqual([
      'http://localhost/index.html',
      'http://localhost/systems/index.html',
      'http://localhost/systems/cryptopay/index.html',
      'http://localhost/architecture/index.html',
      'http://localhost/decisions/index.html',
      'http://localhost/about/index.html',
      'http://localhost/colophon/index.html',
    ]);
  });

  it('rejects a config without assertions', () => {
    expect(() => readBudgets({ ci: {} })).toThrow();
    expect(() => readBudgets({ ci: { assert: {} } })).toThrow();
  });
});
