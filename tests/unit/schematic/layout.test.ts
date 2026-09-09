import { describe, expect, it } from 'vitest';
import {
  edgePath,
  layoutSystem,
  nodeHeight,
  nodeWidth,
  pointAlong,
} from '../../../src/islands/schematic/layout';
import { defineSystem } from '../../../src/systems/validate';
import { firstOf, fixtureSystem } from '../systems/fixture';

const system = defineSystem(fixtureSystem);

const placedNode = (id: string, orientation: 'horizontal' | 'vertical') => {
  const placed = layoutSystem(system.nodes, system.edges, orientation).nodes.find(
    (entry) => entry.node.id === id,
  );
  if (placed === undefined) {
    throw new Error(`node ${id} was not placed`);
  }
  return placed;
};

describe('layoutSystem', () => {
  it('ranks nodes by their longest path from a source', () => {
    expect(placedNode('client', 'horizontal').rank).toBe(0);
    expect(placedNode('api', 'horizontal').rank).toBe(1);
    expect(placedNode('database', 'horizontal').rank).toBe(2);
  });

  it('lays ranks left to right on wide screens and top to bottom on narrow ones', () => {
    expect(placedNode('api', 'horizontal').x).toBeGreaterThan(placedNode('client', 'horizontal').x);
    expect(placedNode('api', 'horizontal').y).toBe(placedNode('client', 'horizontal').y);
    expect(placedNode('api', 'vertical').y).toBeGreaterThan(placedNode('client', 'vertical').y);
    expect(placedNode('api', 'vertical').x).toBe(placedNode('client', 'vertical').x);
  });

  it('numbers nodes in declaration order so callouts match the parts list', () => {
    const numbers = layoutSystem(system.nodes, system.edges, 'horizontal').nodes.map((entry) => [
      entry.node.id,
      entry.number,
    ]);
    expect(numbers).toEqual([
      ['client', 1],
      ['api', 2],
      ['database', 3],
    ]);
  });

  it('gives every node the same box and a canvas that contains all of them', () => {
    const layout = layoutSystem(system.nodes, system.edges, 'horizontal');
    for (const placed of layout.nodes) {
      expect(placed.width).toBe(nodeWidth);
      expect(placed.height).toBe(nodeHeight);
      expect(placed.x + placed.width).toBeLessThanOrEqual(layout.width);
      expect(placed.y + placed.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('routes edges from box boundary to box boundary as straight lines', () => {
    const layout = layoutSystem(system.nodes, system.edges, 'horizontal');
    const first = layout.edges[0];
    if (first === undefined) {
      throw new Error('no edges placed');
    }
    expect(first.control).toBeUndefined();
    expect(edgePath(first)).toMatch(/^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+$/);
    expect(pointAlong(first, 0)).toEqual(first.start);
    expect(pointAlong(first, 1)).toEqual(first.end);
  });

  it('bows the second edge between the same pair, and any edge that runs backwards', () => {
    const second = firstOf(system.edges.slice(1));
    const edges = [
      ...system.edges,
      { ...second, id: 'database-api', from: 'database', to: 'api', label: 'row' },
    ];
    const layout = layoutSystem(system.nodes, edges, 'horizontal');
    const bowed = layout.edges.filter((placed) => placed.control !== undefined);
    expect(bowed.map((placed) => placed.edge.id).sort()).toEqual(['api-database', 'database-api']);
  });

  it('is deterministic', () => {
    const first = layoutSystem(system.nodes, system.edges, 'vertical');
    const second = layoutSystem(system.nodes, system.edges, 'vertical');
    expect(first).toEqual(second);
  });
});
