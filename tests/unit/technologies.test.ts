import { describe, expect, it } from 'vitest';
import { createTechnologyNameLookup } from '../../src/lib/technologies';

const registry = [
  { id: 'nodejs', data: { name: 'Node.js' } },
  { id: 'bnb-chain', data: { name: 'BNB Chain' } },
];

describe('createTechnologyNameLookup', () => {
  it('resolves a reference to the registry name', () => {
    const nameOf = createTechnologyNameLookup(registry);
    expect(nameOf({ id: 'bnb-chain' })).toBe('BNB Chain');
  });

  it('throws for an id that is not in the registry', () => {
    const nameOf = createTechnologyNameLookup(registry);
    expect(() => nameOf({ id: 'kafka' })).toThrow('Unknown technology "kafka"');
  });
});
