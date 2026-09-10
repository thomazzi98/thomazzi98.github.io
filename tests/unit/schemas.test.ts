import { describe, expect, it } from 'vitest';
import { periodSchema, practiceSchema } from '../../src/content/schemas';

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

describe('practiceSchema', () => {
  const practice = {
    id: 'reproduce-first',
    order: 8,
    claim: 'Reproduce a failure before fixing it.',
    backing: [
      { kind: 'role', id: 'sky-one' },
      { kind: 'system', id: 'whatsapp-notification-platform' },
    ],
  };

  it('accepts a claim backed by a role and a system', () => {
    expect(practiceSchema.safeParse(practice).success).toBe(true);
  });

  it('requires a positive whole-number order', () => {
    const { order, ...withoutOrder } = practice;
    expect(order).toBe(8);
    expect(practiceSchema.safeParse(withoutOrder).success).toBe(false);
    expect(practiceSchema.safeParse({ ...practice, order: 0 }).success).toBe(false);
    expect(practiceSchema.safeParse({ ...practice, order: 1.5 }).success).toBe(false);
  });

  it('rejects a claim with nothing behind it', () => {
    expect(practiceSchema.safeParse({ ...practice, backing: [] }).success).toBe(false);
  });

  it('rejects a backing of an unknown kind', () => {
    expect(
      practiceSchema.safeParse({ ...practice, backing: [{ kind: 'project', id: 'onboarding' }] })
        .success,
    ).toBe(false);
  });

  it('rejects identifiers that are not kebab-case', () => {
    expect(practiceSchema.safeParse({ ...practice, id: 'Reproduce First' }).success).toBe(false);
    expect(
      practiceSchema.safeParse({ ...practice, backing: [{ kind: 'system', id: 'CryptoPay' }] })
        .success,
    ).toBe(false);
  });
});
