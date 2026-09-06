import { describe, expect, it } from 'vitest';
import { periodSchema } from '../../src/content/schemas';

describe('periodSchema', () => {
  it('accepts an open-ended period', () => {
    expect(periodSchema.safeParse({ start: '2022-11', end: null }).success).toBe(true);
  });

  it('accepts a closed period in order', () => {
    expect(periodSchema.safeParse({ start: '2021-12', end: '2022-05' }).success).toBe(true);
  });

  it('rejects a period that ends before it starts', () => {
    expect(periodSchema.safeParse({ start: '2022-05', end: '2021-12' }).success).toBe(false);
  });

  it('rejects values that are not YYYY-MM', () => {
    for (const start of ['2022', '2022-13', '2022-1', 'Nov 2022']) {
      expect(periodSchema.safeParse({ start, end: null }).success).toBe(false);
    }
  });
});
