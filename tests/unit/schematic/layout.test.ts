import { describe, expect, it } from 'vitest';
import {
  edgePath,
  layoutSystem,
  nodeHeightOf,
  nodeWidth,
  pointAlong,
  tagBox,
  wrapLabel,
  type PlacedEdge,
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

const placedNodeIn = (layout: ReturnType<typeof layoutSystem>, id: string) => {
  const placed = layout.nodes.find((entry) => entry.node.id === id);
  if (placed === undefined) {
    throw new Error(`node ${id} was not placed`);
  }
  return placed;
};

const placedEdge = (edges: readonly PlacedEdge[], id: string): PlacedEdge => {
  const placed = edges.find((entry) => entry.edge.id === id);
  if (placed === undefined) {
    throw new Error(`edge ${id} was not placed`);
  }
  return placed;
};

const secondEdge = firstOf(system.edges.slice(1));

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
      expect(placed.height).toBe(nodeHeightOf(1));
      expect(placed.x + placed.width).toBeLessThanOrEqual(layout.width);
      expect(placed.y + placed.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('grows every box to two lines when one label wraps', () => {
    const nodes = system.nodes.map((node) =>
      node.id === 'database' ? { ...node, label: 'PostgreSQL with the ledger tables' } : node,
    );
    const layout = layoutSystem(nodes, system.edges, 'horizontal');
    const database = layout.nodes.find((entry) => entry.node.id === 'database');
    expect(database?.lines).toEqual(['PostgreSQL with the', 'ledger tables']);
    for (const placed of layout.nodes) {
      expect(placed.height).toBe(nodeHeightOf(2));
    }
  });

  it('reserves a band under the label for a stamp and grows every box by it', () => {
    const nodes = system.nodes.map((node) =>
      node.id === 'database' ? { ...node, stamp: 'unused' } : node,
    );
    const layout = layoutSystem(nodes, system.edges, 'horizontal');
    expect(nodeHeightOf(1, true)).toBeGreaterThan(nodeHeightOf(1));
    for (const placed of layout.nodes) {
      expect(placed.height).toBe(nodeHeightOf(1, true));
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
    const edges = [
      ...system.edges,
      { ...secondEdge, id: 'database-api', from: 'database', to: 'api', label: 'row' },
    ];
    const layout = layoutSystem(system.nodes, edges, 'horizontal');
    const bowed = layout.edges.filter((placed) => placed.control !== undefined);
    expect(bowed.map((placed) => placed.edge.id).sort()).toEqual(['api-database', 'database-api']);
  });

  it('separates two edges that run the same way between the same pair', () => {
    const edges = [
      ...system.edges,
      { ...secondEdge, id: 'api-database-audit', label: 'INSERT audit row' },
    ];
    const layout = layoutSystem(system.nodes, edges, 'horizontal');
    const first = placedEdge(layout.edges, 'api-database');
    const second = placedEdge(layout.edges, 'api-database-audit');
    expect(first.control).toBeDefined();
    expect(second.control).toBeDefined();
    expect(first.control).not.toEqual(second.control);
    expect(edgePath(first)).not.toBe(edgePath(second));
    expect(first.tag).not.toEqual(second.tag);
    // The two bows sit on opposite sides of the straight line between the boxes.
    const straightY = (first.start.y + first.end.y) / 2;
    const sides = [first, second].map((placed) => Math.sign((placed.control?.y ?? 0) - straightY));
    expect(sides.sort()).toEqual([-1, 1]);
  });

  it('places protocol tags off the midpoint and clear of every node and other tag', () => {
    const layout = layoutSystem(system.nodes, system.edges, 'horizontal');
    const [first, second] = layout.edges;
    if (first === undefined || second === undefined) {
      throw new Error('two edges expected');
    }
    expect(first.tag).toEqual(
      expect.objectContaining({ x: Math.round(pointAlong(first, 0.4).x * 10) / 10 }),
    );
    expect(second.tag).toEqual(
      expect.objectContaining({ x: Math.round(pointAlong(second, 0.6).x * 10) / 10 }),
    );
    const boxes = layout.edges.map((placed) => tagBox(placed.tag, 'HTTPS'));
    for (const box of boxes) {
      for (const node of layout.nodes) {
        const overlaps =
          box.x < node.x + node.width &&
          node.x < box.x + box.width &&
          box.y < node.y + node.height &&
          node.y < box.y + box.height;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('bows a vertical wire around a part it would otherwise run through', () => {
    const edges = [
      ...system.edges,
      { ...secondEdge, id: 'client-database', from: 'client', to: 'database', label: 'audit' },
    ];
    const layout = layoutSystem(system.nodes, edges, 'vertical');
    const skip = placedEdge(layout.edges, 'client-database');
    const api = layout.nodes.find((entry) => entry.node.id === 'api');
    if (api === undefined || skip.control === undefined) {
      throw new Error('the skipping edge should bow');
    }
    expect(skip.control.x).toBeLessThan(api.x);
    for (let step = 0; step <= 20; step += 1) {
      const point = pointAlong(skip, step / 20);
      const inside =
        point.x > api.x &&
        point.x < api.x + api.width &&
        point.y > api.y &&
        point.y < api.y + api.height;
      expect(inside).toBe(false);
    }
    // The canvas grows to hold the bow and its tag instead of clipping them.
    expect(skip.control.x).toBeGreaterThanOrEqual(0);
    expect(layout.width).toBeGreaterThan(nodeWidth + 32);
  });

  it('runs a wire between the lanes down the gap when it would cross a part', () => {
    const part = (id: string) => ({ id, label: id, kind: 'process' as const });
    const link = (origin: string, destination: string) => ({
      ...secondEdge,
      id: `${origin}-${destination}`,
      from: origin,
      to: destination,
      label: `${origin} to ${destination}`,
    });
    const nodes = ['left0', 'right0', 'left1', 'right1', 'left2', 'right2'].map(part);
    const edges = [
      link('left0', 'left1'),
      link('right0', 'right1'),
      link('left1', 'left2'),
      link('right1', 'right2'),
      link('left0', 'right2'),
    ];
    const layout = layoutSystem(nodes, edges, 'vertical');
    const crossing = placedEdge(layout.edges, 'left0-right2');
    const others = layout.nodes.filter(
      (placed) => placed.node.id !== 'left0' && placed.node.id !== 'right2',
    );
    for (let step = 0; step <= 40; step += 1) {
      const point = pointAlong(crossing, step / 40);
      for (const box of others) {
        const inside =
          point.x > box.x &&
          point.x < box.x + box.width &&
          point.y > box.y &&
          point.y < box.y + box.height;
        expect(inside).toBe(false);
      }
    }
    // The gap route needs no room beside the column.
    expect(layout.width).toBe(2 * nodeWidth + 30 + 2 * 16);
  });

  it('lets detours on one side share a bow unless they run alongside each other', () => {
    const chain = ['first', 'second', 'third', 'fourth', 'fifth'].map((id) => ({
      id,
      label: id,
      kind: 'process' as const,
    }));
    const link = (origin: string, destination: string) => ({
      ...secondEdge,
      id: `${origin}-${destination}`,
      from: origin,
      to: destination,
      label: `${origin} to ${destination}`,
    });
    const steps = [
      link('first', 'second'),
      link('second', 'third'),
      link('third', 'fourth'),
      link('fourth', 'fifth'),
    ];
    const apart = layoutSystem(
      chain,
      [...steps, link('first', 'third'), link('third', 'fifth')],
      'vertical',
    );
    const firstDetour = placedEdge(apart.edges, 'first-third');
    const secondDetour = placedEdge(apart.edges, 'third-fifth');
    expect(firstDetour.control?.x).toBe(secondDetour.control?.x);
    const alongside = layoutSystem(
      chain,
      [...steps, link('first', 'third'), link('first', 'fourth')],
      'vertical',
    );
    const shallow = placedEdge(alongside.edges, 'first-third');
    const deep = placedEdge(alongside.edges, 'first-fourth');
    expect(deep.control?.x).toBeLessThan(shallow.control?.x ?? 0);
    // The column only pays for the room the deepest detour and the widest tag need.
    expect(alongside.width).toBeGreaterThan(apart.width);
    expect(apart.width).toBeLessThan(nodeWidth + 2 * 16 + 80);
  });

  it('is deterministic', () => {
    const first = layoutSystem(system.nodes, system.edges, 'vertical');
    const second = layoutSystem(system.nodes, system.edges, 'vertical');
    expect(first).toEqual(second);
  });
});

describe('layoutSystem as a rail', () => {
  const part = (id: string) => ({ id, label: id, kind: 'process' as const });
  const link = (origin: string, destination: string, protocol: 'sql' | 'webhook' = 'sql') => ({
    ...secondEdge,
    id: `${origin}-${destination}`,
    from: origin,
    to: destination,
    label: `${origin} to ${destination}`,
    protocol,
  });
  const chain = ['first', 'second', 'third', 'fourth'].map(part);
  const steps = [link('first', 'second'), link('second', 'third'), link('third', 'fourth')];
  const insideNode = (point: { x: number; y: number }, box: PlacedEdge['start'] & object) =>
    point.x > box.x && point.x < box.x + nodeWidth && point.y > box.y;

  it('places every part in its own row of one column, in rank order, inside 300 units', () => {
    // Two hubs fanning out to shared targets, the shape of the widest board footprint.
    const nodes = ['hub', 'worker', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'].map(
      part,
    );
    const edges = [
      link('hub', 'one'),
      link('hub', 'two'),
      link('hub', 'three'),
      link('hub', 'four', 'webhook'),
      link('worker', 'three'),
      link('worker', 'four'),
      link('worker', 'five', 'webhook'),
      link('two', 'six'),
      link('two', 'seven', 'webhook'),
    ];
    const layout = layoutSystem(nodes, edges, 'rail');
    expect(layout.orientation).toBe('rail');
    expect(new Set(layout.nodes.map((placed) => placed.x)).size).toBe(1);
    expect(new Set(layout.nodes.map((placed) => placed.y)).size).toBe(nodes.length);
    const byRow = [...layout.nodes].sort((first, second) => first.y - second.y);
    byRow.forEach((placed, row) => {
      expect(placed.y).toBe(16 + row * (placed.height + 28));
      expect(placed.rank).toBeGreaterThanOrEqual(byRow[row - 1]?.rank ?? 0);
    });
    expect(layout.width).toBeGreaterThan(nodeWidth + 32);
    expect(layout.width).toBeLessThanOrEqual(300);
    for (const placed of layout.edges) {
      const box = tagBox(placed.tag, 'WEBHOOK');
      expect(box.x + box.width).toBeLessThanOrEqual(layout.width);
      expect(box.x).toBeGreaterThanOrEqual(0);
    }
  });

  it('wires neighbouring rows straight down the column and bows a skipping wire to the right', () => {
    const layout = layoutSystem(chain, [...steps, link('first', 'third', 'webhook')], 'rail');
    const straight = placedEdge(layout.edges, 'first-second');
    const first = placedNodeIn(layout, 'first');
    const second = placedNodeIn(layout, 'second');
    expect(straight.control).toBeUndefined();
    expect(straight.start).toEqual({ x: first.x + nodeWidth / 2, y: first.y + first.height });
    expect(straight.end).toEqual({ x: first.x + nodeWidth / 2, y: second.y });
    // The straight wire is too short for its tag, which stands beside it in the gap.
    expect(straight.tag.y).toBe((straight.start.y + straight.end.y) / 2);
    expect(straight.tag.x).toBeGreaterThan(straight.start.x);
    const skip = placedEdge(layout.edges, 'first-third');
    if (skip.control === undefined) {
      throw new Error('the skipping wire should bow');
    }
    const columnRight = first.x + nodeWidth;
    expect(skip.control.x).toBeGreaterThan(columnRight);
    expect(skip.start.x).toBe(columnRight);
    expect(skip.end.x).toBe(columnRight);
    for (let step = 0; step <= 20; step += 1) {
      expect(insideNode(pointAlong(skip, step / 20), second)).toBe(false);
    }
    // The tag sits on the bow, clear of the part the wire passes.
    const tag = tagBox(skip.tag, 'WEBHOOK');
    expect(tag.x).toBeGreaterThan(columnRight);
    expect(tag.x + tag.width).toBeLessThanOrEqual(layout.width);
  });

  it('bows a wire that runs upward to the left of the column', () => {
    const layout = layoutSystem(chain, [...steps, link('fourth', 'first')], 'rail');
    const reply = placedEdge(layout.edges, 'fourth-first');
    const first = placedNodeIn(layout, 'first');
    if (reply.control === undefined) {
      throw new Error('the upward wire should bow');
    }
    expect(reply.control.x).toBeLessThan(first.x);
    expect(reply.start.x).toBe(first.x);
    expect(reply.end.x).toBe(first.x);
    expect(reply.start.y).toBeGreaterThan(reply.end.y);
    // The column moves right to make room for the bow and its tag.
    expect(first.x).toBeGreaterThan(16);
    expect(tagBox(reply.tag, 'SQL').x).toBeGreaterThanOrEqual(0);
    const forward = layoutSystem(chain, steps, 'rail');
    expect(layout.width).toBeGreaterThan(forward.width);
    expect(placedEdge(forward.edges, 'first-second').control).toBeUndefined();
  });

  it('gives parallel wires distinct control points', () => {
    const edges = [
      ...steps,
      link('first', 'third'),
      { ...link('first', 'second'), id: 'first-second-again' },
      { ...link('first', 'third'), id: 'first-third-again' },
    ];
    const layout = layoutSystem(chain, edges, 'rail');
    const near = placedEdge(layout.edges, 'first-second');
    const nearAgain = placedEdge(layout.edges, 'first-second-again');
    expect(near.control).toBeUndefined();
    expect(nearAgain.control).toBeDefined();
    const far = placedEdge(layout.edges, 'first-third');
    const farAgain = placedEdge(layout.edges, 'first-third-again');
    expect(far.control).toBeDefined();
    expect(farAgain.control).toBeDefined();
    expect(far.control).not.toEqual(farAgain.control);
    expect(edgePath(far)).not.toBe(edgePath(farAgain));
    expect(far.tag).not.toEqual(farAgain.tag);
  });

  it('spreads a short rail over the rows of a longer one, up to a capped gap', () => {
    const three = chain.slice(0, 3);
    const natural = layoutSystem(three, steps.slice(0, 2), 'rail');
    const pitchOf = (layout: ReturnType<typeof layoutSystem>) => {
      const [first, second] = [...layout.nodes].sort((one, other) => one.y - other.y);
      return (second?.y ?? 0) - (first?.y ?? 0);
    };
    expect(pitchOf(natural)).toBe(nodeHeightOf(1) + 28);
    expect(layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 3 })).toEqual(natural);
    const five = layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 5 });
    // Five rows at the natural pitch span 296 units; three parts share that span.
    expect(pitchOf(five)).toBe(148);
    expect(five.height).toBe(32 + 2 * 148 + nodeHeightOf(1));
    expect(five.width).toBe(natural.width);
    const nine = layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 9 });
    expect(pitchOf(nine)).toBe(nodeHeightOf(1) + 128);
    expect(layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 40 })).toEqual(nine);
    // The wire between spread rows stays straight and its tag stays in the gap beside it.
    const wire = placedEdge(nine.edges, 'first-second');
    expect(wire.control).toBeUndefined();
    expect(wire.tag.y).toBe((wire.start.y + wire.end.y) / 2);
  });

  it('leaves the horizontal and vertical layouts untouched by the rows option', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      expect(layoutSystem(system.nodes, system.edges, orientation, { rows: 9 })).toEqual(
        layoutSystem(system.nodes, system.edges, orientation),
      );
    }
  });
});

describe('wrapLabel', () => {
  it('keeps a short label on one line', () => {
    expect(wrapLabel('Callback worker')).toEqual(['Callback worker']);
  });

  it('wraps by words onto a second line', () => {
    expect(wrapLabel('Customer browser and wallet')).toEqual(['Customer browser and', 'wallet']);
  });

  it('breaks a long identifier after a slash, an underscore or a hyphen', () => {
    expect(wrapLabel('@platform/provider-whatsapp')).toEqual(['@platform/provider-', 'whatsapp']);
    expect(wrapLabel('payment_evaluation_queue')).toEqual(['payment_evaluation_', 'queue']);
  });

  it('elides only what does not fit on two lines', () => {
    const lines = wrapLabel('Provider outcome and capabilities of the sandbox validation script');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Provider outcome and');
    expect(lines[1]).toMatch(/^capabilities of the.*…$/);
  });
});
