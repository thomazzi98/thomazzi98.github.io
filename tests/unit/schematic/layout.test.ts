import { describe, expect, it } from 'vitest';
import {
  columnLimit,
  edgePath,
  layoutSystem,
  legendRow,
  nodeHeightOf,
  nodeWidth,
  pointAlong,
  tagBox,
  wrapLabel,
  type LayoutEdge,
  type LayoutNode,
  type PlacedEdge,
} from '../../../src/islands/schematic/layout';
import type { EdgeProtocol, NodeKind } from '../../../src/systems/schema';
import { defineSystem } from '../../../src/systems/validate';
import { firstOf, fixtureSystem } from '../systems/fixture';

const system = defineSystem(fixtureSystem);

const placedNode = (id: string, orientation: 'horizontal' | 'rail') => {
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

const tagOf = (placed: PlacedEdge) => {
  if (placed.tag === undefined) {
    throw new Error(`edge ${placed.edge.id} has no tag`);
  }
  return placed.tag;
};

const secondEdge = firstOf(system.edges.slice(1));

const part = (id: string, kind: NodeKind = 'process'): LayoutNode => ({ id, label: id, kind });
const link = (
  origin: string,
  destination: string,
  protocol: EdgeProtocol = 'sql',
  id = `${origin}-${destination}`,
): LayoutEdge => ({ id, from: origin, to: destination, protocol });

const rankOf = (layout: ReturnType<typeof layoutSystem>, id: string) =>
  placedNodeIn(layout, id).rank;

const rounded = (point: { x: number; y: number }) => ({
  x: Math.round(point.x * 10) / 10,
  y: Math.round(point.y * 10) / 10,
});

const insideBox = (point: { x: number; y: number }, box: PlacedEdge['start'] & object) =>
  point.x > box.x && point.x < box.x + nodeWidth && point.y > box.y;

describe('layoutSystem', () => {
  it('ranks nodes by their longest path from a source', () => {
    expect(placedNode('client', 'horizontal').rank).toBe(0);
    expect(placedNode('api', 'horizontal').rank).toBe(1);
    expect(placedNode('database', 'horizontal').rank).toBe(2);
  });

  it('lays ranks left to right on wide screens and top to bottom on a rail', () => {
    expect(placedNode('api', 'horizontal').x).toBeGreaterThan(placedNode('client', 'horizontal').x);
    expect(placedNode('api', 'horizontal').y).toBe(placedNode('client', 'horizontal').y);
    expect(placedNode('api', 'rail').y).toBeGreaterThan(placedNode('client', 'rail').y);
    expect(placedNode('api', 'rail').x).toBe(placedNode('client', 'rail').x);
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

  it('gives an orchestration edge no length, so compose ordering never stretches the drawing', () => {
    const nodes = [part('api'), part('postgres', 'store'), part('migrate', 'job')];
    const edges = [
      link('api', 'postgres'),
      link('postgres', 'migrate', 'orchestration'),
      link('migrate', 'postgres'),
    ];
    const layout = layoutSystem(nodes, edges, 'horizontal');
    // Counted, the ordering edge would close a cycle and push the job one column past the store.
    expect(rankOf(layout, 'api')).toBe(0);
    expect(rankOf(layout, 'migrate')).toBe(0);
    expect(rankOf(layout, 'postgres')).toBe(1);
    expect(layout.width).toBe(16 + nodeWidth + 84 + nodeWidth + 16);
  });

  it('places a part nothing calls in the column before what it talks to, unless it is an entry', () => {
    const nodes = [...system.nodes, part('worker'), part('auditor', 'actor')];
    const edges = [
      ...system.edges,
      link('worker', 'database', 'sql', 'worker-database'),
      link('auditor', 'database', 'sql', 'auditor-database'),
    ];
    const layout = layoutSystem(nodes, edges, 'horizontal');
    expect(rankOf(layout, 'worker')).toBe(1);
    expect(rankOf(layout, 'auditor')).toBe(0);
    expect(rankOf(layout, 'database')).toBe(2);
  });

  it('leaves a wire that closes a cycle out of the layering and bows it backwards', () => {
    const nodes = [...system.nodes, part('provider', 'external')];
    const edges = [
      ...system.edges,
      link('api', 'provider', 'https', 'api-provider'),
      link('provider', 'api', 'webhook', 'provider-callback'),
    ];
    const layout = layoutSystem(nodes, edges, 'horizontal');
    expect(rankOf(layout, 'provider')).toBe(2);
    expect(rankOf(layout, 'database')).toBe(2);
    expect(placedEdge(layout.edges, 'provider-callback').control).toBeDefined();
    expect(placedEdge(layout.edges, 'api-provider').control).toBeDefined();
  });

  it('keeps to four columns by folding calls between packages into one column', () => {
    const chain = (length: number) => {
      const packages = [...Array(length).keys()].map((index) =>
        part(`package-${String(index)}`, 'package'),
      );
      const nodes = [part('client', 'actor'), part('api'), ...packages];
      const edges = [
        link('client', 'api', 'https'),
        link('api', 'package-0', 'in-process'),
        ...packages
          .slice(1)
          .map((node, index) => link(`package-${String(index)}`, node.id, 'in-process')),
      ];
      return layoutSystem(nodes, edges, 'horizontal');
    };
    const honest = chain(2);
    expect(rankOf(honest, 'package-1')).toBe(3);
    const folded = chain(3);
    expect(columnLimit).toBe(4);
    expect(rankOf(folded, 'package-0')).toBe(2);
    expect(rankOf(folded, 'package-2')).toBe(2);
    expect(folded.width).toBe(honest.width - (nodeWidth + 84));
  });

  it('routes a wire between two parts of one column that are not neighbours beside the column', () => {
    const nodes = [
      part('api'),
      part('one', 'job'),
      part('two', 'job'),
      part('three', 'job'),
      part('postgres', 'store'),
    ];
    const edges = [
      link('api', 'postgres'),
      link('one', 'postgres'),
      link('two', 'postgres'),
      link('three', 'postgres'),
      link('one', 'two', 'orchestration'),
      link('one', 'three', 'orchestration'),
    ];
    const layout = layoutSystem(nodes, edges, 'horizontal');
    const one = placedNodeIn(layout, 'one');
    const two = placedNodeIn(layout, 'two');
    const three = placedNodeIn(layout, 'three');
    expect([one.rank, two.rank, three.rank]).toEqual([0, 0, 0]);
    // The lane keeps the wires' sources above their targets.
    expect(one.y).toBeLessThan(two.y);
    expect(two.y).toBeLessThan(three.y);
    expect(placedEdge(layout.edges, 'one-two').control).toBeUndefined();
    const skip = placedEdge(layout.edges, 'one-three');
    if (skip.control === undefined) {
      throw new Error('the skipping wire should bow');
    }
    expect(skip.control.x).toBeGreaterThan(one.x + nodeWidth);
    for (let step = 0; step <= 20; step += 1) {
      expect(insideBox(pointAlong(skip, step / 20), two)).toBe(false);
    }
    expect(layout.width).toBe(16 + nodeWidth + 84 + nodeWidth + 16);
  });

  it('turns a bow in the last column into the gap on its left so the drawing keeps its width', () => {
    const nodes = [
      part('client', 'actor'),
      part('api'),
      part('alpha', 'job'),
      part('beta', 'job'),
      part('gamma', 'job'),
    ];
    const edges = [
      link('client', 'api', 'https'),
      link('api', 'alpha', 'in-process'),
      link('api', 'beta', 'in-process'),
      link('api', 'gamma', 'in-process'),
      link('alpha', 'gamma', 'orchestration'),
    ];
    const layout = layoutSystem(nodes, edges, 'horizontal');
    const alpha = placedNodeIn(layout, 'alpha');
    const skip = placedEdge(layout.edges, 'alpha-gamma');
    expect(alpha.rank).toBe(2);
    expect(skip.control?.x).toBeLessThan(alpha.x);
    expect(layout.width).toBe(16 + 2 * (nodeWidth + 84) + nodeWidth + 16);
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
    const boxes = layout.edges.map((placed) => tagBox(tagOf(placed), 'HTTPS'));
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

  it('starts the tags of a pair that runs both ways a third of the way along each wire', () => {
    const edges = [
      ...system.edges,
      {
        ...secondEdge,
        id: 'database-api',
        from: 'database',
        to: 'api',
        label: 'row',
        protocol: 'webhook' as const,
      },
    ];
    const layout = layoutSystem(system.nodes, edges, 'horizontal');
    const forward = placedEdge(layout.edges, 'api-database');
    const reply = placedEdge(layout.edges, 'database-api');
    expect(tagOf(forward)).toEqual(rounded(pointAlong(forward, 0.35)));
    expect(tagOf(reply)).toEqual(rounded(pointAlong(reply, 0.65)));
  });

  it('prints one tag on the chord for a pair that runs both ways on one protocol', () => {
    const edges = [
      ...system.edges,
      {
        ...secondEdge,
        id: 'database-api',
        from: 'database',
        to: 'api',
        label: 'row',
        protocol: 'sql' as const,
      },
    ];
    const layout = layoutSystem(system.nodes, edges, 'horizontal');
    const forward = placedEdge(layout.edges, 'api-database');
    const reply = placedEdge(layout.edges, 'database-api');
    expect(reply.tag).toBeUndefined();
    expect(tagOf(forward)).toEqual(
      rounded({
        x: (forward.start.x + forward.end.x) / 2,
        y: (forward.start.y + forward.end.y) / 2,
      }),
    );
  });

  it('is deterministic', () => {
    for (const orientation of ['horizontal', 'rail'] as const) {
      const first = layoutSystem(system.nodes, system.edges, orientation);
      const second = layoutSystem(system.nodes, system.edges, orientation);
      expect(first).toEqual(second);
    }
  });
});

describe('layoutSystem as a rail', () => {
  const chain = ['first', 'second', 'third', 'fourth'].map((id) => part(id));
  const steps = [link('first', 'second'), link('second', 'third'), link('third', 'fourth')];
  // Two hubs fanning out to shared targets, the shape of the widest board footprint.
  const fan = {
    nodes: ['hub', 'worker', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'].map((id) =>
      part(id),
    ),
    edges: [
      link('hub', 'one'),
      link('hub', 'two'),
      link('hub', 'three'),
      link('hub', 'four', 'webhook'),
      link('worker', 'three'),
      link('worker', 'four'),
      link('worker', 'five', 'webhook'),
      link('two', 'six'),
      link('two', 'seven', 'webhook'),
    ],
  };

  it('places every part in its own row of one column, in rank order, inside 300 units', () => {
    const layout = layoutSystem(fan.nodes, fan.edges, 'rail');
    expect(layout.orientation).toBe('rail');
    expect(new Set(layout.nodes.map((placed) => placed.x)).size).toBe(1);
    expect(new Set(layout.nodes.map((placed) => placed.y)).size).toBe(fan.nodes.length);
    layout.nodes.forEach((placed, row) => {
      expect(placed.y).toBe(16 + row * (placed.height + 28));
      expect(placed.rank).toBeGreaterThanOrEqual(layout.nodes[row - 1]?.rank ?? 0);
    });
    expect(layout.width).toBeGreaterThan(nodeWidth + 32);
    expect(layout.width).toBeLessThanOrEqual(300);
    for (const placed of layout.edges) {
      if (placed.tag === undefined) {
        continue;
      }
      const box = tagBox(placed.tag, 'WEBHOOK');
      expect(box.x + box.width).toBeLessThanOrEqual(layout.width);
      expect(box.x).toBeGreaterThanOrEqual(0);
    }
  });

  it('numbers callouts top to bottom, in the drawn order rather than the declared one', () => {
    // A target declared before its hub is drawn below it.
    const declared = [...fan.nodes.slice(2, 4), ...fan.nodes.slice(0, 2), ...fan.nodes.slice(4)];
    const layout = layoutSystem(declared, fan.edges, 'rail');
    expect(layout.nodes.map((placed) => placed.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const ids = layout.nodes.map((placed) => placed.node.id);
    expect(ids.slice(0, 2)).toEqual(['hub', 'worker']);
    expect(ids.indexOf('two')).toBeLessThan(ids.indexOf('six'));
    layout.nodes.forEach((placed, row) => {
      expect(placed.y).toBe(16 + row * (placed.height + 28));
    });
    // The wide drawing keeps the declared order, which is the parts list's order.
    const wide = layoutSystem(declared, fan.edges, 'horizontal');
    expect(wide.nodes.map((placed) => placed.node.id)).toEqual(declared.map((node) => node.id));
    expect(wide.nodes.map((placed) => placed.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('tags only the wires off the majority protocol and names that protocol in a legend', () => {
    const layout = layoutSystem(fan.nodes, fan.edges, 'rail');
    expect(layout.legend).toBe('unlabelled wires: SQL');
    const tagged = layout.edges.filter((placed) => placed.tag !== undefined);
    expect(tagged.map((placed) => placed.edge.protocol)).toEqual(['webhook', 'webhook', 'webhook']);
    const plain = layoutSystem(fan.nodes, fan.edges.slice(0, 3), 'rail');
    expect(plain.legend).toBe('unlabelled wires: SQL');
    expect(plain.edges.every((placed) => placed.tag === undefined)).toBe(true);
    // The legend needs its own row under the last part.
    expect(layout.height).toBe(32 + 8 * (nodeHeightOf(1) + 28) + nodeHeightOf(1) + legendRow);
    // Without a clear majority every wire keeps its tag and there is nothing to explain.
    const mixed = layoutSystem(
      chain,
      [link('first', 'second', 'http'), link('second', 'third')],
      'rail',
    );
    expect(mixed.legend).toBeUndefined();
    expect(mixed.edges.every((placed) => placed.tag !== undefined)).toBe(true);
    expect(layoutSystem(system.nodes, system.edges, 'horizontal').legend).toBeUndefined();
  });

  it('keeps two tags that share the side of the column at least sixteen units apart', () => {
    const edges = [
      ...steps,
      link('first', 'third', 'webhook'),
      link('first', 'third', 'http', 'first-third-again'),
    ];
    const layout = layoutSystem(chain, edges, 'rail');
    const first = tagBox(tagOf(placedEdge(layout.edges, 'first-third')), 'WEBHOOK');
    const second = tagBox(tagOf(placedEdge(layout.edges, 'first-third-again')), 'HTTP');
    const shareColumn = first.x < second.x + second.width && second.x < first.x + first.width;
    expect(shareColumn).toBe(true);
    expect(Math.abs(first.y - second.y)).toBeGreaterThanOrEqual(16);
  });

  it('wires neighbouring rows straight down the column and bows a skipping wire to the right', () => {
    const layout = layoutSystem(chain, [...steps, link('first', 'third', 'webhook')], 'rail');
    const straight = placedEdge(layout.edges, 'first-second');
    const first = placedNodeIn(layout, 'first');
    const second = placedNodeIn(layout, 'second');
    expect(straight.control).toBeUndefined();
    expect(straight.start).toEqual({ x: first.x + nodeWidth / 2, y: first.y + first.height });
    expect(straight.end).toEqual({ x: first.x + nodeWidth / 2, y: second.y });
    // On the majority protocol the straight wire carries no tag; the legend names it.
    expect(straight.tag).toBeUndefined();
    const skip = placedEdge(layout.edges, 'first-third');
    if (skip.control === undefined) {
      throw new Error('the skipping wire should bow');
    }
    const columnRight = first.x + nodeWidth;
    expect(skip.control.x).toBeGreaterThan(columnRight);
    expect(skip.start.x).toBe(columnRight);
    expect(skip.end.x).toBe(columnRight);
    for (let step = 0; step <= 20; step += 1) {
      expect(insideBox(pointAlong(skip, step / 20), second)).toBe(false);
    }
    // The tag sits on the bow, clear of the part the wire passes.
    const tag = tagBox(tagOf(skip), 'WEBHOOK');
    expect(tag.x).toBeGreaterThan(columnRight);
    expect(tag.x + tag.width).toBeLessThanOrEqual(layout.width);
  });

  it('stands the tag of a straight wire beside it when the wire is tagged', () => {
    const layout = layoutSystem(
      chain.slice(0, 3),
      [link('first', 'second', 'http'), link('second', 'third')],
      'rail',
    );
    const straight = placedEdge(layout.edges, 'first-second');
    expect(straight.control).toBeUndefined();
    expect(tagOf(straight).y).toBe((straight.start.y + straight.end.y) / 2);
    expect(tagOf(straight).x).toBeGreaterThan(straight.start.x);
  });

  it('bows a wire that runs upward to the left of the column', () => {
    const layout = layoutSystem(chain, [...steps, link('fourth', 'first', 'webhook')], 'rail');
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
    expect(tagBox(tagOf(reply), 'WEBHOOK').x).toBeGreaterThanOrEqual(0);
    const forward = layoutSystem(chain, steps, 'rail');
    expect(layout.width).toBeGreaterThan(forward.width);
    expect(placedEdge(forward.edges, 'first-second').control).toBeUndefined();
  });

  it('gives parallel wires distinct control points', () => {
    const edges = [
      ...steps,
      link('first', 'third', 'webhook'),
      { ...link('first', 'second', 'webhook'), id: 'first-second-again' },
      { ...link('first', 'third', 'webhook'), id: 'first-third-again' },
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
      const [first, second] = layout.nodes;
      return (second?.y ?? 0) - (first?.y ?? 0);
    };
    expect(pitchOf(natural)).toBe(nodeHeightOf(1) + 28);
    expect(layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 3 })).toEqual(natural);
    const five = layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 5 });
    // Five rows at the natural pitch span 296 units; three parts share that span.
    expect(pitchOf(five)).toBe(148);
    expect(five.height).toBe(32 + 2 * 148 + nodeHeightOf(1) + legendRow);
    expect(five.width).toBe(natural.width);
    const nine = layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 9 });
    expect(pitchOf(nine)).toBe(nodeHeightOf(1) + 128);
    expect(layoutSystem(three, steps.slice(0, 2), 'rail', { rows: 40 })).toEqual(nine);
    // The wire between spread rows stays straight.
    expect(placedEdge(nine.edges, 'first-second').control).toBeUndefined();
  });

  it('leaves the horizontal layout untouched by the rows option', () => {
    expect(layoutSystem(system.nodes, system.edges, 'horizontal', { rows: 9 })).toEqual(
      layoutSystem(system.nodes, system.edges, 'horizontal'),
    );
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
