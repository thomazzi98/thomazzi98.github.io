import { describe, expect, it } from 'vitest';
import { systems } from '../../../src/systems';
import { boardLimit, boardOf, footprintOf } from '../../../src/systems/board';

const firstFlow = (system: (typeof systems)[number]) => {
  const flow = system.flows[0];
  if (flow === undefined) {
    throw new Error(`${system.id} has no flows`);
  }
  return flow;
};

describe('the home page board', () => {
  it.each(systems)('$id names a flow whose footprint fits the board', (system) => {
    const board = boardOf(system);
    expect(board, `${system.id} has no board flow`).toBeDefined();
    expect(board?.nodes.length ?? 0).toBeGreaterThan(2);
    expect(board?.nodes.length ?? 0).toBeLessThanOrEqual(boardLimit);
    const footprint = footprintOf(system, board?.flow ?? firstFlow(system));
    expect(new Set(board?.nodes.map((node) => node.id))).toEqual(footprint);
    for (const edge of board?.edges ?? []) {
      expect(footprint.has(edge.from) && footprint.has(edge.to)).toBe(true);
    }
  });
});
