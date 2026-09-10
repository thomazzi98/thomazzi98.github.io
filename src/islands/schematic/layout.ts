import type { EdgeProtocol, NodeKind } from '../../systems/schema';
import { protocolTag } from './protocol';

export type Orientation = 'horizontal' | 'rail';

export interface LayoutOptions {
  // A rail spreads its parts over at least this many rows' worth of height, so the drawings on
  // one board end close to one height whatever their part counts; the gap between rows is
  // capped so a short rail never becomes a few parts lost on long wires.
  readonly rows?: number;
}

export interface LayoutNode {
  readonly id: string;
  readonly label: string;
  readonly kind: NodeKind;
  readonly stamp?: string;
}

export interface LayoutEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly protocol: EdgeProtocol;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedNode<Node extends LayoutNode = LayoutNode> extends Box {
  node: Node;
  rank: number;
  number: number;
  lines: readonly string[];
}

export interface PlacedEdge<Edge extends LayoutEdge = LayoutEdge> {
  edge: Edge;
  start: Point;
  end: Point;
  control?: Point;
  // Absent when the wire goes unlabelled: a rail wire on the drawing's majority protocol, or the
  // second wire of a pair that runs both ways on one protocol.
  tag?: Point;
}

export interface Layout<
  Node extends LayoutNode = LayoutNode,
  Edge extends LayoutEdge = LayoutEdge,
> {
  orientation: Orientation;
  width: number;
  height: number;
  // The parts in drawn order: declaration order in a horizontal drawing, row order on a rail.
  nodes: PlacedNode<Node>[];
  edges: PlacedEdge<Edge>[];
  legend?: string;
}

export const nodeWidth = 160;
export const labelFontSize = 13;
export const labelLineHeight = 15;
export const tagFontSize = 10;
export const legendRow = 22;
const labelInset = 8;
const labelLineLimit = 2;
const rankGap = 84;
const laneGap = 30;
const margin = 16;
const orderingSweeps = 3;
const tagHeight = 14;
const tagClearance = 6;
const tagPadding = 4;
const railGap = 28;
const railGapLimit = 128;
const bowStep = 10;
const bowMinimum = 32;
const railTagSeparation = 16;

const stampRow = 18;

// A stamp needs its own band between the label and the kind caption; every box in the drawing
// grows by that band so the parts keep one size.
export const nodeHeightOf = (lineCount: number, stamped = false): number =>
  (lineCount > 1 ? 58 : 46) + (stamped ? stampRow : 0);

const entryKinds: ReadonlySet<NodeKind> = new Set(['actor', 'external']);

// The length an edge adds to the path through the drawing; undefined leaves the edge out of the
// layering altogether. Compose ordering says what starts before what, not what talks to what,
// so it has no length and imposes no order.
type EdgeLength = (edge: LayoutEdge) => number | undefined;

const runtimeLength: EdgeLength = (edge) => (edge.protocol === 'orchestration' ? undefined : 1);

// A package calling a package is structure inside one artefact, not a hop a request makes, so
// a drawing that would otherwise run past four columns keeps those calls inside one column.
const compactLength =
  (kindOf: ReadonlyMap<string, NodeKind>): EdgeLength =>
  (edge) => {
    const length = runtimeLength(edge);
    if (length === undefined) {
      return undefined;
    }
    const insidePackages = kindOf.get(edge.from) === 'package' && kindOf.get(edge.to) === 'package';
    return insidePackages ? 0 : length;
  };

export const columnLimit = 4;

// Glyph widths in em, close enough to IBM Plex Sans and Mono to wrap and to place tags
// without measuring the rendered text.
const narrowGlyphs = new Set(Array.from('iljtfIr.,;:!|\'"()[] -_/'));
const wideGlyphs = new Set(Array.from('mwMW@%'));

const glyphWidth = (glyph: string): number => {
  if (narrowGlyphs.has(glyph)) {
    return 0.34;
  }
  if (wideGlyphs.has(glyph)) {
    return 0.86;
  }
  if (glyph >= 'A' && glyph <= 'Z') {
    return 0.68;
  }
  return 0.56;
};

const textWidth = (text: string, fontSize: number): number => {
  let total = 0;
  for (const glyph of text) {
    total += glyphWidth(glyph);
  }
  return total * fontSize;
};

const wordBreaks = /(?<=[/_-])/;

const fitsLabel = (text: string): boolean =>
  textWidth(text, labelFontSize) <= nodeWidth - 2 * labelInset;

const splitLongWord = (word: string): string[] => {
  const pieces = word.split(wordBreaks);
  const parts: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (current !== '' && !fitsLabel(current + piece)) {
      parts.push(current);
      current = '';
    }
    current += piece;
  }
  return current === '' ? parts : [...parts, current];
};

const elide = (text: string): string => {
  let kept = text;
  while (kept.length > 1 && !fitsLabel(`${kept}…`)) {
    kept = kept.slice(0, -1);
  }
  return `${kept.trimEnd()}…`;
};

// Labels wrap by words inside the node; a word too long for one line breaks after a slash,
// an underscore or a hyphen; only text beyond the second line is elided.
export const wrapLabel = (label: string): string[] => {
  const lines: string[] = [];
  let current = '';
  const place = (word: string) => {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (fitsLabel(candidate)) {
      current = candidate;
      return;
    }
    if (current !== '') {
      lines.push(current);
    }
    current = word;
  };
  for (const word of label.split(' ')) {
    if (fitsLabel(word)) {
      place(word);
      continue;
    }
    for (const part of splitLongWord(word)) {
      place(part);
    }
  }
  if (current !== '') {
    lines.push(current);
  }
  if (lines.length <= labelLineLimit) {
    return lines;
  }
  const kept = lines.slice(0, labelLineLimit);
  const last = kept[labelLineLimit - 1] ?? '';
  const rest = lines.slice(labelLineLimit).join(' ');
  kept[labelLineLimit - 1] = elide(`${last} ${rest}`);
  return kept;
};

const incomingCounts = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]) => {
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }
  return incoming;
};

// A reply that closes a cycle (a webhook back to the caller) would stall the layering, so the
// edges that lead back to a part still on the depth-first stack are left out of it. The walk
// starts from the parts nothing calls, so the edge dropped is the one that returns.
const forwardEdges = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): LayoutEdge[] => {
  const incoming = incomingCounts(nodes, edges);
  const state = new Map<string, 'open' | 'done'>();
  const dropped = new Set<string>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const edge of edges.filter((candidate) => candidate.from === id)) {
      const target = state.get(edge.to);
      if (target === 'open') {
        dropped.add(edge.id);
        continue;
      }
      if (target === undefined) {
        visit(edge.to);
      }
    }
    state.set(id, 'done');
  };
  const ordered = [...nodes].sort(
    (first, second) =>
      Number((incoming.get(first.id) ?? 0) > 0) - Number((incoming.get(second.id) ?? 0) > 0),
  );
  for (const node of ordered) {
    if (!state.has(node.id)) {
      visit(node.id);
    }
  }
  return edges.filter((edge) => !dropped.has(edge.id));
};

// Longest-path layering over the edges that have a length.
const rankNodesBy = (
  nodes: readonly LayoutNode[],
  allEdges: readonly LayoutEdge[],
  lengthOf: EdgeLength,
) => {
  const edges = forwardEdges(
    nodes,
    allEdges.filter((edge) => lengthOf(edge) !== undefined),
  );
  const ranks = new Map<string, number>();
  const incoming = incomingCounts(nodes, edges);
  const sources = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  const queue = [...sources];
  for (const id of queue) {
    ranks.set(id, 0);
  }
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const currentRank = ranks.get(current) ?? 0;
    for (const edge of edges.filter((candidate) => candidate.from === current)) {
      const reached = currentRank + (lengthOf(edge) ?? 0);
      if ((ranks.get(edge.to) ?? -1) < reached) {
        ranks.set(edge.to, reached);
      }
      const remaining = (incoming.get(edge.to) ?? 1) - 1;
      incoming.set(edge.to, remaining);
      if (remaining === 0) {
        queue.push(edge.to);
      }
    }
  }
  // A part nothing calls at runtime, such as a worker that polls, a one-shot job or a package
  // only a job exercises, belongs in the column before what it talks to, not in the column of
  // entry points.
  for (const node of nodes) {
    if (!sources.includes(node.id) || entryKinds.has(node.kind)) {
      continue;
    }
    const targets = edges
      .filter((edge) => edge.from === node.id)
      .map((edge) => {
        const rank = ranks.get(edge.to);
        return rank === undefined ? undefined : rank - (lengthOf(edge) ?? 0);
      })
      .filter((rank): rank is number => rank !== undefined);
    if (targets.length === 0) {
      continue;
    }
    ranks.set(node.id, Math.max(0, Math.min(...targets)));
  }
  return ranks;
};

const rankNodes = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]) => {
  const honest = rankNodesBy(nodes, edges, runtimeLength);
  if (Math.max(...honest.values()) < columnLimit) {
    return honest;
  }
  return rankNodesBy(
    nodes,
    edges,
    compactLength(new Map(nodes.map((node) => [node.id, node.kind]))),
  );
};

const groupByRank = (nodes: readonly LayoutNode[], ranks: ReadonlyMap<string, number>) => {
  const lanes = new Map<number, string[]>();
  for (const node of nodes) {
    const rank = ranks.get(node.id) ?? 0;
    lanes.set(rank, [...(lanes.get(rank) ?? []), node.id]);
  }
  return lanes;
};

const normalisedPositions = (lanes: ReadonlyMap<number, string[]>) => {
  const positions = new Map<string, number>();
  for (const lane of lanes.values()) {
    lane.forEach((id, index) => {
      positions.set(id, lane.length === 1 ? 0.5 : index / (lane.length - 1));
    });
  }
  return positions;
};

const otherEndOf = (edge: LayoutEdge, id: string): string | undefined => {
  if (edge.from === id) {
    return edge.to;
  }
  return edge.to === id ? edge.from : undefined;
};

// Barycenter ordering: each lane is sorted by the mean position of its neighbours in the
// lanes already placed, which removes most edge crossings without a full Sugiyama pass.
const orderLanes = (
  lanes: Map<number, string[]>,
  edges: readonly LayoutEdge[],
  ranks: ReadonlyMap<string, number>,
) => {
  const rankCount = Math.max(...lanes.keys()) + 1;
  const neighboursOf = (id: string, direction: 'before' | 'after'): string[] => {
    const rank = ranks.get(id) ?? 0;
    return edges.flatMap((edge) => {
      const other = otherEndOf(edge, id);
      if (other === undefined) {
        return [];
      }
      const otherRank = ranks.get(other) ?? 0;
      const qualifies = direction === 'before' ? otherRank < rank : otherRank > rank;
      return qualifies ? [other] : [];
    });
  };
  const sortLane = (rank: number, direction: 'before' | 'after') => {
    const lane = lanes.get(rank);
    if (lane === undefined || lane.length < 2) {
      return;
    }
    const positions = normalisedPositions(lanes);
    const keyed = lane.map((id, index) => {
      const anchors = neighboursOf(id, direction)
        .map((other) => positions.get(other))
        .filter((value): value is number => value !== undefined);
      const own = lane.length === 1 ? 0.5 : index / (lane.length - 1);
      const key =
        anchors.length === 0
          ? own
          : anchors.reduce((total, value) => total + value, 0) / anchors.length;
      return { id, key, index };
    });
    keyed.sort((first, second) => first.key - second.key || first.index - second.index);
    lanes.set(
      rank,
      keyed.map((entry) => entry.id),
    );
  };
  for (let sweep = 0; sweep < orderingSweeps; sweep += 1) {
    for (let rank = 1; rank < rankCount; rank += 1) {
      sortLane(rank, 'before');
    }
    for (let rank = rankCount - 2; rank >= 0; rank -= 1) {
      sortLane(rank, 'after');
    }
  }
  orderWithinLanes(lanes, edges);
};

// A wire between two parts of one lane runs down the column, so its source comes first: a
// topological pass over each lane keeps the barycenter order wherever those wires allow it.
const orderWithinLanes = (lanes: Map<number, string[]>, edges: readonly LayoutEdge[]) => {
  for (const [rank, lane] of lanes) {
    const inLane = new Set(lane);
    const internal = edges.filter(
      (edge) => inLane.has(edge.from) && inLane.has(edge.to) && edge.from !== edge.to,
    );
    if (internal.length === 0) {
      continue;
    }
    const remaining = [...lane];
    const ordered: string[] = [];
    while (remaining.length > 0) {
      const next =
        remaining.find(
          (id) => !internal.some((edge) => edge.to === id && remaining.includes(edge.from)),
        ) ?? remaining[0];
      if (next === undefined) {
        break;
      }
      ordered.push(next);
      remaining.splice(remaining.indexOf(next), 1);
    }
    lanes.set(rank, ordered);
  }
};

const tenth = (value: number): number => Math.round(value * 10) / 10;

const bowShare = 0.22;
const bowLimit = 64;

// A positive multiplier bows to the left of the direction of travel, a negative one to the
// right; parallel edges of one pair get opposite signs so they never share a wire.
const bowOf = (start: Point, end: Point, multiplier: number): Point => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const bow = Math.min(bowLimit, length * bowShare) * multiplier;
  return {
    x: tenth((start.x + end.x) / 2 - (deltaY / length) * bow),
    y: tenth((start.y + end.y) / 2 + (deltaX / length) * bow),
  };
};

const center = (box: Box): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const boundaryPoint = (box: Box, towards: Point): Point => {
  const middle = center(box);
  const deltaX = towards.x - middle.x;
  const deltaY = towards.y - middle.y;
  if (deltaX === 0 && deltaY === 0) {
    return middle;
  }
  const scaleX = deltaX === 0 ? Number.POSITIVE_INFINITY : box.width / 2 / Math.abs(deltaX);
  const scaleY = deltaY === 0 ? Number.POSITIVE_INFINITY : box.height / 2 / Math.abs(deltaY);
  const scale = Math.min(scaleX, scaleY);
  return { x: tenth(middle.x + deltaX * scale), y: tenth(middle.y + deltaY * scale) };
};

const pairKey = (edge: LayoutEdge): string => [edge.from, edge.to].sort().join('|');

const countPairs = (edges: readonly LayoutEdge[]): Map<string, number> => {
  const pairs = new Map<string, number>();
  for (const edge of edges) {
    const key = pairKey(edge);
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  return pairs;
};

const boxesOverlap = (first: Box, second: Box): boolean =>
  first.x < second.x + second.width &&
  second.x < first.x + first.width &&
  first.y < second.y + second.height &&
  second.y < first.y + first.height;

const quadraticPoint = (start: Point, control: Point, end: Point, progress: number): Point => {
  const remaining = 1 - progress;
  return {
    x:
      remaining * remaining * start.x +
      2 * remaining * progress * control.x +
      progress * progress * end.x,
    y:
      remaining * remaining * start.y +
      2 * remaining * progress * control.y +
      progress * progress * end.y,
  };
};

export const pointAlong = (
  edge: Pick<PlacedEdge, 'start' | 'end' | 'control'>,
  progress: number,
): Point => {
  const clamped = Math.min(1, Math.max(0, progress));
  if (edge.control === undefined) {
    return {
      x: edge.start.x + (edge.end.x - edge.start.x) * clamped,
      y: edge.start.y + (edge.end.y - edge.start.y) * clamped,
    };
  }
  return quadraticPoint(edge.start, edge.control, edge.end, clamped);
};

export const edgePath = (edge: Pick<PlacedEdge, 'start' | 'end' | 'control'>): string => {
  const { start, end, control } = edge;
  if (control === undefined) {
    return `M${String(start.x)},${String(start.y)} L${String(end.x)},${String(end.y)}`;
  }
  return `M${String(start.x)},${String(start.y)} Q${String(control.x)},${String(control.y)} ${String(end.x)},${String(end.y)}`;
};

export const tagBox = (point: Point, text: string): Box => {
  const width = textWidth(text, tagFontSize) + 2 * tagPadding;
  return { x: point.x - width / 2, y: point.y - tagHeight / 2, width, height: tagHeight };
};

// Tags leave the midpoint, where packets travel and where two wires most often meet, and step
// along the wire until their box clears every node and every tag already placed.
const tagFractions = (index: number): readonly number[] => {
  const primary = index % 2 === 0 ? 0.4 : 0.6;
  return [primary, 1 - primary, 0.3, 0.7, 0.5, 0.25, 0.75, 0.2, 0.8, 0.15, 0.85, 0.1, 0.9];
};

// The two wires of a pair that runs both ways bow apart, so their tags start a third of the way
// along each wire and never meet at the shared midpoint.
const antiparallelFractions: readonly (readonly number[])[] = [
  [0.35, 0.3, 0.25, 0.4, 0.2, 0.45, 0.15, 0.1],
  [0.65, 0.7, 0.75, 0.6, 0.8, 0.55, 0.85, 0.9],
];

// One tag serves a pair that runs both ways on one protocol; it sits on the chord between the
// two bows, where it belongs to both wires.
const sharedTagFractions: readonly number[] = [0.5, 0.4, 0.6, 0.3, 0.7, 0.25, 0.75, 0.2, 0.8];

// When no point on the wire is clear the tag steps whole tag heights to either side of it,
// which keeps it attributable to its wire while it leaves the neighbour it would have covered.
const tagNudges: readonly number[] = [0, -1, 1, -2, 2];

const placeTag = (
  route: Pick<PlacedEdge, 'start' | 'end' | 'control'>,
  text: string,
  fractions: readonly number[],
  obstacles: readonly Box[],
): Point => {
  const chordX = route.end.x - route.start.x;
  const chordY = route.end.y - route.start.y;
  const chord = Math.hypot(chordX, chordY) || 1;
  const candidate = (fraction: number, nudge: number): Point => {
    const point = pointAlong(route, fraction);
    return {
      x: point.x - (chordY / chord) * nudge * tagHeight,
      y: point.y + (chordX / chord) * nudge * tagHeight,
    };
  };
  const candidates = tagNudges.flatMap((nudge) =>
    fractions.map((fraction) => candidate(fraction, nudge)),
  );
  const clear = candidates.find(
    (point) => !obstacles.some((obstacle) => boxesOverlap(tagBox(point, text), obstacle)),
  );
  const point = clear ?? candidate(fractions[0] ?? 0.5, 0);
  return { x: tenth(point.x), y: tenth(point.y) };
};

// A bow's tag sits on its apex, half a bow out from the column; a rail bow reaches at least far
// enough for that tag to clear the parts it passes.
const bowFractions: readonly number[] = [0.5, 0.42, 0.58, 0.34, 0.66, 0.25, 0.75];

interface OutwardRoute {
  side: -1 | 1;
  level: number;
  bow: number;
  span: readonly [number, number];
  tagWidth: number;
}

const spansOverlap = (first: readonly [number, number], second: readonly [number, number]) =>
  first[0] < second[1] && second[0] < first[1];

// Two detours on one side share a bow unless they run alongside each other, so the room a
// column needs grows with the deepest overlap, not with the number of detours.
const levelOf = (
  placed: readonly OutwardRoute[],
  side: -1 | 1,
  span: readonly [number, number],
): number => {
  const taken = new Set(
    placed
      .filter((route) => route.side === side && spansOverlap(route.span, span))
      .map((route) => route.level),
  );
  let level = 0;
  while (taken.has(level)) {
    level += 1;
  }
  return level;
};

// On a rail only a wire to the next row runs straight down the column. Every other wire leaves
// the column and comes back: forwards on the right, backwards on the left, a second wire of one
// pair beside the first; each side is levelled by span overlap, and every bow on a side reaches
// far enough for the widest tag on that side to clear the parts it passes.
const railRoutes = <Node extends LayoutNode>(
  edges: readonly LayoutEdge[],
  byId: ReadonlyMap<string, PlacedNode<Node>>,
  rowOf: ReadonlyMap<string, number>,
  tagged: (edge: LayoutEdge) => boolean,
): Map<string, OutwardRoute> => {
  const routes = new Map<string, OutwardRoute>();
  const pairsSeen = new Set<string>();
  for (const edge of edges) {
    const origin = byId.get(edge.from);
    const destination = byId.get(edge.to);
    if (origin === undefined || destination === undefined) {
      continue;
    }
    const key = pairKey(edge);
    const firstOfPair = !pairsSeen.has(key);
    pairsSeen.add(key);
    const fromRow = rowOf.get(edge.from) ?? 0;
    const toRow = rowOf.get(edge.to) ?? 0;
    if (firstOfPair && toRow === fromRow + 1) {
      continue;
    }
    const side: -1 | 1 = toRow < fromRow ? -1 : 1;
    const ends = [center(origin).y, center(destination).y];
    const span: readonly [number, number] = [Math.min(...ends), Math.max(...ends)];
    const tagWidth = tagged(edge) ? tagBox({ x: 0, y: 0 }, protocolTag[edge.protocol]).width : 0;
    routes.set(edge.id, {
      side,
      level: levelOf([...routes.values()], side, span),
      bow: 0,
      span,
      tagWidth,
    });
  }
  for (const side of [-1, 1] as const) {
    const onSide = [...routes.values()].filter((route) => route.side === side);
    const reach = Math.max(0, ...onSide.map((route) => route.tagWidth / 2)) + tagPadding;
    for (const route of onSide) {
      route.bow = Math.max(bowMinimum, 2 * reach) + bowStep * route.level;
    }
  }
  return routes;
};

// In a horizontal drawing a wire between two parts of one column that are not neighbours would
// run through the parts between them, so it leaves the column into the gap beside it and comes
// back: to the right, or to the left from the last column, where nothing lies to the right.
const columnRoutes = <Node extends LayoutNode>(
  edges: readonly LayoutEdge[],
  byId: ReadonlyMap<string, PlacedNode<Node>>,
  laneIndexOf: ReadonlyMap<string, number>,
  lastRank: number,
): Map<string, OutwardRoute> => {
  const routes = new Map<string, OutwardRoute>();
  for (const edge of edges) {
    const origin = byId.get(edge.from);
    const destination = byId.get(edge.to);
    if (origin === undefined || destination === undefined) {
      continue;
    }
    if (origin.rank !== destination.rank) {
      continue;
    }
    const rows = Math.abs((laneIndexOf.get(edge.from) ?? 0) - (laneIndexOf.get(edge.to) ?? 0));
    if (rows < 2) {
      continue;
    }
    const side: -1 | 1 = origin.rank === lastRank && lastRank > 0 ? -1 : 1;
    const ends = [center(origin).y, center(destination).y];
    const span: readonly [number, number] = [Math.min(...ends), Math.max(...ends)];
    const level = levelOf([...routes.values()], side, span);
    routes.set(edge.id, {
      side,
      level,
      bow: bowMinimum + bowStep * level,
      span,
      tagWidth: tagBox({ x: 0, y: 0 }, protocolTag[edge.protocol]).width,
    });
  }
  return routes;
};

// A straight rail wire is too short to carry its tag, so the tag stands beside it, to the right
// unless something is already there.
const railTag = (
  route: Pick<PlacedEdge, 'start' | 'end' | 'control'>,
  text: string,
  obstacles: readonly Box[],
): Point => {
  if (route.control !== undefined) {
    return placeTag(route, text, bowFractions, obstacles);
  }
  const middle = pointAlong(route, 0.5);
  const offset = tagBox(middle, text).width / 2 + tagClearance;
  const candidates: readonly Point[] = [
    { x: middle.x + offset, y: middle.y },
    { x: middle.x - offset, y: middle.y },
  ];
  const clear = candidates.find(
    (point) => !obstacles.some((obstacle) => boxesOverlap(tagBox(point, text), obstacle)),
  );
  const point = clear ?? candidates[0] ?? middle;
  return { x: tenth(point.x), y: tenth(point.y) };
};

// A rail prints a tag only where the protocol differs from the one most of its wires use; that
// protocol is named once in a legend instead. Without a clear majority every wire is tagged.
const majorityProtocol = (edges: readonly LayoutEdge[]): EdgeProtocol | undefined => {
  const counts = new Map<EdgeProtocol, number>();
  for (const edge of edges) {
    counts.set(edge.protocol, (counts.get(edge.protocol) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((first, second) => second[1] - first[1]);
  const [leader, runnerUp] = ranked;
  if (leader === undefined || leader[1] === runnerUp?.[1]) {
    return undefined;
  }
  return leader[0];
};

const railOrder = (lanes: ReadonlyMap<number, string[]>): string[] =>
  [...lanes.keys()]
    .sort((first, second) => first - second)
    .flatMap((rank) => lanes.get(rank) ?? []);

const railGapFor = (count: number, nodeHeight: number, rows: number): number => {
  if (count < 2 || rows <= count) {
    return railGap;
  }
  const span = (rows - 1) * (nodeHeight + railGap);
  return Math.min(railGapLimit, Math.round(span / (count - 1) - nodeHeight));
};

const outwardEdge = (
  origin: Box,
  destination: Box,
  route: OutwardRoute,
): Pick<PlacedEdge, 'start' | 'end' | 'control'> => {
  const downwards = center(destination).y >= center(origin).y ? 1 : -1;
  const edgeX = (box: Box) => (route.side === -1 ? box.x : box.x + box.width);
  const columnEdge =
    route.side === -1
      ? Math.min(edgeX(origin), edgeX(destination))
      : Math.max(edgeX(origin), edgeX(destination));
  const start = { x: edgeX(origin), y: tenth(center(origin).y + (downwards * origin.height) / 4) };
  const end = {
    x: edgeX(destination),
    y: tenth(center(destination).y - (downwards * destination.height) / 4),
  };
  const control = {
    x: tenth(columnEdge + route.side * route.bow),
    y: tenth((start.y + end.y) / 2),
  };
  return { start, end, control };
};

const sideRoom = (routes: ReadonlyMap<string, OutwardRoute>, side: -1 | 1): number => {
  const outward = [...routes.values()].filter((route) => route.side === side);
  if (outward.length === 0) {
    return 0;
  }
  // Half the bow is the wire's farthest reach; a tag centred there needs half its own width.
  const reach = Math.max(...outward.map((route) => route.bow)) / 2;
  const tagHalf = Math.max(...outward.map((route) => route.tagWidth)) / 2;
  return Math.ceil(reach + tagHalf + tagClearance);
};

const bowMultiplier = (
  orientation: Orientation,
  count: number,
  spread: number,
  backwards: boolean,
): number => {
  if (orientation === 'rail') {
    return 0;
  }
  return count > 1 ? spread : Number(backwards);
};

// The wire that answers this one between the same two parts, when the pair is exactly two.
const antiparallelOf = <Edge extends LayoutEdge>(
  edge: Edge,
  edges: readonly Edge[],
  count: number,
): Edge | undefined => {
  if (count !== 2) {
    return undefined;
  }
  return edges.find((other) => other.from === edge.to && other.to === edge.from);
};

// A rail tag keeps a whole tag height plus two units to its neighbours, so a column of tags
// stays a column of separate words.
const separated = (box: Box, separation: number): Box => {
  const grow = (separation - box.height) / 2;
  return { ...box, y: box.y - grow, height: box.height + 2 * grow };
};

export const layoutSystem = <Node extends LayoutNode, Edge extends LayoutEdge>(
  nodes: readonly Node[],
  edges: readonly Edge[],
  orientation: Orientation,
  options: LayoutOptions = {},
): Layout<Node, Edge> => {
  const ranks = rankNodes(nodes, edges);
  const lanes = groupByRank(nodes, ranks);
  orderLanes(lanes, edges, ranks);
  const rankCount = Math.max(...lanes.keys()) + 1;
  const laneCount = Math.max(...[...lanes.values()].map((lane) => lane.length));
  const linesById = new Map(nodes.map((node) => [node.id, wrapLabel(node.label)]));
  const nodeHeight = nodeHeightOf(
    Math.max(1, ...[...linesById.values()].map((lines) => lines.length)),
    nodes.some((node) => node.stamp !== undefined),
  );
  const along = (rank: number): number => margin + rank * (nodeWidth + rankGap);
  const across = (index: number, count: number): number =>
    Math.round(margin + (index + (laneCount - count) / 2) * (nodeHeight + laneGap));
  const railRowOf = new Map(railOrder(lanes).map((id, row) => [id, row]));
  const railPitch = nodeHeight + railGapFor(nodes.length, nodeHeight, options.rows ?? 0);
  const drawnOrder =
    orientation === 'rail'
      ? [...nodes].sort(
          (first, second) => (railRowOf.get(first.id) ?? 0) - (railRowOf.get(second.id) ?? 0),
        )
      : nodes;

  const placed: PlacedNode<Node>[] = drawnOrder.map((node, index) => {
    const rank = ranks.get(node.id) ?? 0;
    const lane = lanes.get(rank) ?? [];
    const lines = linesById.get(node.id) ?? [node.label];
    const box = { node, rank, number: index + 1, lines, width: nodeWidth, height: nodeHeight };
    if (orientation === 'rail') {
      return { ...box, x: margin, y: margin + (railRowOf.get(node.id) ?? 0) * railPitch };
    }
    return { ...box, x: along(rank), y: across(lane.indexOf(node.id), lane.length) };
  });

  const pairs = countPairs(edges);
  const majority = orientation === 'rail' ? majorityProtocol(edges) : undefined;
  const legend = majority === undefined ? undefined : `unlabelled wires: ${protocolTag[majority]}`;
  const baseWidth =
    orientation === 'rail' ? 2 * margin + nodeWidth : along(rankCount - 1) + nodeWidth + margin;
  const placedById = new Map(placed.map((entry) => [entry.node.id, entry]));
  const laneIndexOf = new Map(
    [...lanes.values()].flatMap((lane) => lane.map((id, index) => [id, index] as const)),
  );
  const routes =
    orientation === 'rail'
      ? railRoutes(edges, placedById, railRowOf, (edge) => edge.protocol !== majority)
      : columnRoutes(edges, placedById, laneIndexOf, rankCount - 1);
  // The rail's margins already give a tag its clearance, so a side only grows by what its bows
  // need beyond them; a horizontal drawing grows only where a bow leaves its last column.
  const roomOf = (side: -1 | 1): number =>
    orientation === 'rail' ? Math.max(0, sideRoom(routes, side) - margin) : 0;
  const leftRoom = roomOf(-1);
  const rightRoom = roomOf(1);
  for (const entry of placed) {
    entry.x += leftRoom;
  }

  const byId = new Map(placed.map((entry) => [entry.node.id, entry]));
  const ordinals = new Map<string, number>();
  const obstacles: Box[] = placed.map(({ x, y, width, height }) => ({ x, y, width, height }));
  const placedEdges: PlacedEdge<Edge>[] = [];
  edges.forEach((edge, index) => {
    const origin = byId.get(edge.from);
    const destination = byId.get(edge.to);
    if (origin === undefined || destination === undefined) {
      return;
    }
    const key = pairKey(edge);
    const ordinal = ordinals.get(key) ?? 0;
    ordinals.set(key, ordinal + 1);
    const count = pairs.get(key) ?? 1;
    const canonical = edge.from <= edge.to ? 1 : -1;
    const spread = 2 * (ordinal - (count - 1) / 2) * canonical;
    const backwards = destination.rank < origin.rank;
    const outward = routes.get(edge.id);
    const straight = {
      start: boundaryPoint(origin, center(destination)),
      end: boundaryPoint(destination, center(origin)),
    };
    const multiplier = bowMultiplier(orientation, count, spread, backwards);
    const route =
      outward === undefined
        ? {
            ...straight,
            control: multiplier === 0 ? undefined : bowOf(straight.start, straight.end, multiplier),
          }
        : outwardEdge(origin, destination, outward);
    const text = protocolTag[edge.protocol];
    const opposite = antiparallelOf(edge, edges, count);
    const tagOf = (): Point | undefined => {
      if (orientation === 'rail') {
        return edge.protocol === majority ? undefined : railTag(route, text, obstacles);
      }
      if (opposite === undefined) {
        return placeTag(route, text, tagFractions(index), obstacles);
      }
      if (opposite.protocol !== edge.protocol) {
        return placeTag(route, text, antiparallelFractions[ordinal] ?? [], obstacles);
      }
      return ordinal === 0 ? placeTag(straight, text, sharedTagFractions, obstacles) : undefined;
    };
    const tag = tagOf();
    if (tag !== undefined) {
      const box = tagBox(tag, text);
      obstacles.push(orientation === 'rail' ? separated(box, railTagSeparation) : box);
    }
    placedEdges.push({ edge, ...route, tag });
  });

  const reach = placedEdges.flatMap((placed) => {
    const apex = placed.control === undefined ? [] : [pointAlong(placed, 0.5).x];
    if (placed.tag === undefined) {
      return apex;
    }
    const box = tagBox(placed.tag, protocolTag[placed.edge.protocol]);
    return [...apex, box.x + box.width];
  });
  const roomWidth = baseWidth + leftRoom + rightRoom;
  const width =
    orientation === 'rail' ? roomWidth : Math.max(roomWidth, ...reach.map((edge) => edge + margin));
  const height =
    orientation === 'rail'
      ? margin +
        (nodes.length - 1) * railPitch +
        nodeHeight +
        (legend === undefined ? 0 : legendRow) +
        margin
      : across(laneCount - 1, laneCount) + nodeHeight + margin;

  return { orientation, width, height, nodes: placed, edges: placedEdges, legend };
};
