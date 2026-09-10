import type { EdgeProtocol, NodeKind } from '../../systems/schema';
import { protocolTag } from './protocol';

export type Orientation = 'horizontal' | 'vertical' | 'rail';

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
  tag: Point;
}

export interface Layout<
  Node extends LayoutNode = LayoutNode,
  Edge extends LayoutEdge = LayoutEdge,
> {
  orientation: Orientation;
  width: number;
  height: number;
  nodes: PlacedNode<Node>[];
  edges: PlacedEdge<Edge>[];
}

export const nodeWidth = 160;
export const labelFontSize = 13;
export const labelLineHeight = 15;
export const tagFontSize = 10;
const labelInset = 8;
const labelLineLimit = 2;
const rankGap = 84;
const laneGap = 30;
const margin = 16;
const verticalLaneLimit = 2;
const orderingSweeps = 3;
const outwardBow = 56;
const outwardStep = 14;
const tagHeight = 14;
const tagClearance = 6;
const tagPadding = 4;
const railGap = 28;
const railGapLimit = 128;
const railStep = 10;

const stampRow = 18;

// A stamp needs its own band between the label and the kind caption; every box in the drawing
// grows by that band so the parts keep one size.
export const nodeHeightOf = (lineCount: number, stamped = false): number =>
  (lineCount > 1 ? 58 : 46) + (stamped ? stampRow : 0);

const entryKinds: ReadonlySet<NodeKind> = new Set(['actor', 'external']);

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

const rankNodes = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]) => {
  const ranks = new Map<string, number>();
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }
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
      if ((ranks.get(edge.to) ?? -1) < currentRank + 1) {
        ranks.set(edge.to, currentRank + 1);
      }
      const remaining = (incoming.get(edge.to) ?? 1) - 1;
      incoming.set(edge.to, remaining);
      if (remaining === 0) {
        queue.push(edge.to);
      }
    }
  }
  // A node inside a cycle never reaches zero incoming edges; place it after its predecessors.
  for (const node of nodes) {
    if (ranks.has(node.id)) {
      continue;
    }
    const predecessors = edges
      .filter((edge) => edge.to === node.id)
      .map((edge) => ranks.get(edge.from))
      .filter((rank): rank is number => rank !== undefined);
    ranks.set(node.id, predecessors.length === 0 ? 0 : Math.max(...predecessors) + 1);
  }
  // A process nobody calls, such as a worker that polls, belongs next to what it talks to,
  // not in the column of entry points.
  for (const node of nodes) {
    if (!sources.includes(node.id) || entryKinds.has(node.kind)) {
      continue;
    }
    const targets = edges
      .filter((edge) => edge.from === node.id)
      .map((edge) => ranks.get(edge.to))
      .filter((rank): rank is number => rank !== undefined);
    if (targets.length === 0) {
      continue;
    }
    ranks.set(node.id, Math.max(0, Math.min(...targets) - 1));
  }
  return ranks;
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

// Liang-Barsky clipping: true when the segment enters the box.
const segmentCrossesBox = (start: Point, end: Point, box: Box): boolean => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const checks: readonly (readonly [number, number])[] = [
    [-deltaX, start.x - box.x],
    [deltaX, box.x + box.width - start.x],
    [-deltaY, start.y - box.y],
    [deltaY, box.y + box.height - start.y],
  ];
  let enter = 0;
  let exit = 1;
  for (const [direction, distance] of checks) {
    if (direction === 0) {
      if (distance < 0) {
        return false;
      }
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) {
      enter = Math.max(enter, ratio);
    }
    if (direction > 0) {
      exit = Math.min(exit, ratio);
    }
  }
  return enter < exit;
};

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
  return [primary, 1 - primary, 0.3, 0.7, 0.5, 0.25, 0.75, 0.2, 0.8, 0.15, 0.85];
};

// When no point on the wire is clear the tag steps one tag height to either side of it, which
// keeps it attributable to its wire while it leaves the neighbour it would have covered.
const tagNudges: readonly number[] = [0, -1, 1];

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

// Side 0 is the gap between the two lanes, which no part occupies.
interface OutwardRoute {
  side: -1 | 0 | 1;
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

// In the two-lane vertical layout a wire that would run through another part leaves the
// column on its outer side and comes back in, so packets never appear to cross unrelated parts.
const outwardRoutes = <Node extends LayoutNode>(
  edges: readonly LayoutEdge[],
  byId: ReadonlyMap<string, PlacedNode<Node>>,
  pairs: ReadonlyMap<string, number>,
  columnsCentre: number,
): Map<string, OutwardRoute> => {
  const routes = new Map<string, OutwardRoute>();
  for (const edge of edges) {
    const origin = byId.get(edge.from);
    const destination = byId.get(edge.to);
    if (origin === undefined || destination === undefined) {
      continue;
    }
    if ((pairs.get(pairKey(edge)) ?? 1) > 1 || destination.rank < origin.rank) {
      continue;
    }
    const start = boundaryPoint(origin, center(destination));
    const end = boundaryPoint(destination, center(origin));
    const blocked = [...byId.values()].some(
      (other) => other !== origin && other !== destination && segmentCrossesBox(start, end, other),
    );
    if (!blocked) {
      continue;
    }
    const ends = [center(origin).y, center(destination).y];
    const span: readonly [number, number] = [Math.min(...ends), Math.max(...ends)];
    const tagWidth = tagBox({ x: 0, y: 0 }, protocolTag[edge.protocol]).width;
    const originLeft = center(origin).x <= columnsCentre;
    const destinationLeft = center(destination).x <= columnsCentre;
    if (originLeft !== destinationLeft) {
      routes.set(edge.id, { side: 0, level: 0, bow: 0, span, tagWidth });
      continue;
    }
    const side: -1 | 1 = originLeft ? -1 : 1;
    const level = levelOf([...routes.values()], side, span);
    routes.set(edge.id, {
      side,
      level,
      bow: outwardBow + outwardStep * level,
      span,
      tagWidth,
    });
  }
  return routes;
};

// On a rail only a wire to the next row runs straight down the column. Every other wire leaves
// the column and comes back: forwards on the right, backwards on the left, a second wire of one
// pair beside the first; each side is levelled by span overlap, and every bow on a side reaches
// far enough for the widest tag on that side to clear the parts it passes.
const railRoutes = <Node extends LayoutNode>(
  edges: readonly LayoutEdge[],
  byId: ReadonlyMap<string, PlacedNode<Node>>,
  rowOf: ReadonlyMap<string, number>,
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
    const tagWidth = tagBox({ x: 0, y: 0 }, protocolTag[edge.protocol]).width;
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
      route.bow = 2 * reach + railStep * route.level;
    }
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

// A wire between the lanes that must skip a rank runs straight down the gap between them, from
// the inner edge of one part to the inner edge of the other.
const gapEdge = (origin: Box, destination: Box): Pick<PlacedEdge, 'start' | 'end'> => {
  const downwards = center(destination).y >= center(origin).y ? 1 : -1;
  const innerX = (box: Box, other: Box) => (box.x < other.x ? box.x + box.width : box.x);
  return {
    start: {
      x: innerX(origin, destination),
      y: tenth(center(origin).y + (downwards * origin.height) / 4),
    },
    end: {
      x: innerX(destination, origin),
      y: tenth(center(destination).y - (downwards * destination.height) / 4),
    },
  };
};

const outwardEdge = (
  origin: Box,
  destination: Box,
  route: OutwardRoute,
): Pick<PlacedEdge, 'start' | 'end' | 'control'> => {
  if (route.side === 0) {
    return gapEdge(origin, destination);
  }
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
  const verticalLaneCount = Math.min(laneCount, verticalLaneLimit);
  const linesById = new Map(nodes.map((node) => [node.id, wrapLabel(node.label)]));
  const nodeHeight = nodeHeightOf(
    Math.max(1, ...[...linesById.values()].map((lines) => lines.length)),
    nodes.some((node) => node.stamp !== undefined),
  );
  const rowsOf = (rank: number): number =>
    Math.ceil((lanes.get(rank)?.length ?? 1) / verticalLaneLimit);
  const rowOffsets = [...Array(rankCount).keys()].map((rank) =>
    [...Array(rank).keys()].reduce((total, earlier) => total + rowsOf(earlier), 0),
  );
  const along = (rank: number): number => margin + rank * (nodeWidth + rankGap);
  const alongVertical = (rank: number): number =>
    margin + (rowOffsets[rank] ?? 0) * (nodeHeight + laneGap) + rank * rankGap;
  const across = (index: number, count: number): number =>
    Math.round(margin + (index + (laneCount - count) / 2) * (nodeHeight + laneGap));
  // A lone part in a rank stays in the left lane rather than the middle, so the gap between the
  // lanes remains free for the wires that run down it.
  const acrossVertical = (index: number): number => margin + index * (nodeWidth + laneGap);
  const railRowOf = new Map(railOrder(lanes).map((id, row) => [id, row]));
  const railPitch = nodeHeight + railGapFor(nodes.length, nodeHeight, options.rows ?? 0);

  const placed: PlacedNode<Node>[] = nodes.map((node, number) => {
    const rank = ranks.get(node.id) ?? 0;
    const lane = lanes.get(rank) ?? [];
    const index = lane.indexOf(node.id);
    const lines = linesById.get(node.id) ?? [node.label];
    const box = { node, rank, number: number + 1, lines, width: nodeWidth, height: nodeHeight };
    if (orientation === 'horizontal') {
      return { ...box, x: along(rank), y: across(index, lane.length) };
    }
    if (orientation === 'rail') {
      return { ...box, x: margin, y: margin + (railRowOf.get(node.id) ?? 0) * railPitch };
    }
    const row = Math.floor(index / verticalLaneLimit);
    return {
      ...box,
      x: acrossVertical(index % verticalLaneLimit),
      y: alongVertical(rank) + row * (nodeHeight + laneGap),
    };
  });

  const pairs = countPairs(edges);
  const baseWidthOf: Readonly<Record<Orientation, number>> = {
    horizontal: along(rankCount - 1) + nodeWidth + margin,
    vertical: acrossVertical(verticalLaneCount - 1) + nodeWidth + margin,
    rail: 2 * margin + nodeWidth,
  };
  const baseWidth = baseWidthOf[orientation];
  const placedById = new Map(placed.map((entry) => [entry.node.id, entry]));
  const routesOf = (): Map<string, OutwardRoute> => {
    if (orientation === 'vertical') {
      return outwardRoutes(edges, placedById, pairs, baseWidth / 2);
    }
    if (orientation === 'rail') {
      return railRoutes(edges, placedById, railRowOf);
    }
    return new Map<string, OutwardRoute>();
  };
  const routes = routesOf();
  // The rail's margins already give a tag its clearance, so a side only grows by what its bows
  // need beyond them.
  const roomOf = (side: -1 | 1): number => {
    const room = sideRoom(routes, side);
    return orientation === 'rail' ? Math.max(0, room - margin) : room;
  };
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
    const tag =
      orientation === 'rail'
        ? railTag(route, text, obstacles)
        : placeTag(route, text, tagFractions(index), obstacles);
    obstacles.push(tagBox(tag, text));
    placedEdges.push({ edge, ...route, tag });
  });

  const width = baseWidth + leftRoom + rightRoom;
  const heightOf: Readonly<Record<Orientation, () => number>> = {
    horizontal: () => across(laneCount - 1, laneCount) + nodeHeight + margin,
    vertical: () =>
      alongVertical(rankCount - 1) +
      (rowsOf(rankCount - 1) - 1) * (nodeHeight + laneGap) +
      nodeHeight +
      margin,
    rail: () => margin + (nodes.length - 1) * railPitch + nodeHeight + margin,
  };

  return { orientation, width, height: heightOf[orientation](), nodes: placed, edges: placedEdges };
};
