import { describe, expect, it } from 'vitest';
import { layoutBench, pointAlong } from '../../../src/bench/render/layout';
import { definition } from '../../../src/bench/scenarios/queued-bank-onboarding';

const rankOf = (id: string, orientation: 'horizontal' | 'vertical' = 'horizontal') =>
  layoutBench(definition, orientation).stations.find((placed) => placed.station.id === id)?.rank;

describe('layoutBench', () => {
  it('ranks stations by the longest solid path from the actors', () => {
    expect(rankOf('user')).toBe(0);
    expect(rankOf('api')).toBe(1);
    expect(rankOf('queue')).toBe(2);
    expect(rankOf('worker')).toBe(3);
    expect(rankOf('provider')).toBe(4);
  });

  it('places a station with only dashed wires one rank before its target', () => {
    expect(rankOf('support')).toBe(1);
  });

  it('flows left to right horizontally and top to bottom vertically', () => {
    const horizontal = layoutBench(definition, 'horizontal');
    const vertical = layoutBench(definition, 'vertical');
    const find = (layout: typeof horizontal, id: string) =>
      layout.stations.find((placed) => placed.station.id === id);
    expect(find(horizontal, 'provider')?.x).toBeGreaterThan(find(horizontal, 'user')?.x ?? 0);
    expect(find(vertical, 'provider')?.y).toBeGreaterThan(find(vertical, 'user')?.y ?? 0);
    expect(horizontal.width).toBeGreaterThan(horizontal.height);
    expect(vertical.height).toBeGreaterThan(vertical.width);
  });

  it('keeps every station inside the canvas and every wire on a station edge', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const layout = layoutBench(definition, orientation);
      for (const placed of layout.stations) {
        expect(placed.x).toBeGreaterThanOrEqual(0);
        expect(placed.y).toBeGreaterThanOrEqual(0);
        expect(placed.x + placed.width).toBeLessThanOrEqual(layout.width);
        expect(placed.y + placed.height).toBeLessThanOrEqual(layout.height);
      }
      expect(layout.wires).toHaveLength(definition.wires.length);
    }
  });

  it('interpolates a point along a wire and clamps the progress', () => {
    const wire = { wire: { from: 'a', to: 'b' }, x1: 0, y1: 0, x2: 100, y2: 50 };
    expect(pointAlong(wire, 0.5)).toEqual({ x: 50, y: 25 });
    expect(pointAlong(wire, 2)).toEqual({ x: 100, y: 50 });
    expect(pointAlong(wire, -1)).toEqual({ x: 0, y: 0 });
  });
});
