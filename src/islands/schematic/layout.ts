import type { SystemEdge, SystemNode } from '../../systems/schema';

export type Orientation = 'horizontal' | 'vertical';

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

export interface PlacedNode extends Box {
  node: SystemNode;
  rank: number;
  number: number;
}

export interface PlacedEdge {
  edge: SystemEdge;
  start: Point;
  end: Point;
  control?: Point;
}

export interface Layout {
  orientation: Orientation;
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

export const nodeWidth = 132;
export const nodeHeight = 44;
const rankGap = 84;
const laneGap = 30;
const margin = 16;
const verticalLaneLimit = 2;

const rankNodes = (nodes: readonly SystemNode[], edges: readonly SystemEdge[]) => {
  const ranks = new Map<string, number>();
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }
  const queue = nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
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
    const sources = edges
      .filter((edge) => edge.to === node.id)
      .map((edge) => ranks.get(edge.from))
      .filter((rank): rank is number => rank !== undefined);
    ranks.set(node.id, sources.length === 0 ? 0 : Math.max(...sources) + 1);
  }
  return ranks;
};

const bowShare = 0.22;
const bowLimit = 64;

const bowOf = (start: Point, end: Point): Point => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const bow = Math.min(bowLimit, length * bowShare);
  return {
    x: (start.x + end.x) / 2 - (deltaY / length) * bow,
    y: (start.y + end.y) / 2 + (deltaX / length) * bow,
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
  return { x: middle.x + deltaX * scale, y: middle.y + deltaY * scale };
};

const countPairs = (edges: readonly SystemEdge[]): Map<string, number> => {
  const pairs = new Map<string, number>();
  for (const edge of edges) {
    const key = [edge.from, edge.to].sort().join('|');
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  return pairs;
};

export const layoutSystem = (
  nodes: readonly SystemNode[],
  edges: readonly SystemEdge[],
  orientation: Orientation,
): Layout => {
  const ranks = rankNodes(nodes, edges);
  const lanes = new Map<number, string[]>();
  for (const node of nodes) {
    const rank = ranks.get(node.id) ?? 0;
    lanes.set(rank, [...(lanes.get(rank) ?? []), node.id]);
  }
  const rankCount = Math.max(...lanes.keys()) + 1;
  const laneCount = Math.max(...[...lanes.values()].map((lane) => lane.length));
  const verticalLaneCount = Math.min(laneCount, verticalLaneLimit);
  const rowsOf = (rank: number): number =>
    Math.ceil((lanes.get(rank)?.length ?? 1) / verticalLaneLimit);
  const rowOffsets = [...Array(rankCount).keys()].map((rank) =>
    [...Array(rank).keys()].reduce((total, earlier) => total + rowsOf(earlier), 0),
  );
  const along = (rank: number): number => margin + rank * (nodeWidth + rankGap);
  const alongVertical = (rank: number): number =>
    margin + (rowOffsets[rank] ?? 0) * (nodeHeight + laneGap) + rank * rankGap;
  const across = (index: number, count: number): number =>
    margin + (index + (laneCount - count) / 2) * (nodeHeight + laneGap);
  const acrossVertical = (index: number, count: number): number =>
    margin + (index + (verticalLaneCount - count) / 2) * (nodeWidth + laneGap);

  const placed: PlacedNode[] = nodes.map((node, number) => {
    const rank = ranks.get(node.id) ?? 0;
    const lane = lanes.get(rank) ?? [];
    const index = lane.indexOf(node.id);
    if (orientation === 'horizontal') {
      return {
        node,
        rank,
        number: number + 1,
        x: along(rank),
        y: across(index, lane.length),
        width: nodeWidth,
        height: nodeHeight,
      };
    }
    const row = Math.floor(index / verticalLaneLimit);
    const rowLength = Math.min(verticalLaneLimit, lane.length - row * verticalLaneLimit);
    return {
      node,
      rank,
      number: number + 1,
      x: acrossVertical(index % verticalLaneLimit, rowLength),
      y: alongVertical(rank) + row * (nodeHeight + laneGap),
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  const byId = new Map(placed.map((entry) => [entry.node.id, entry]));
  const pairs = countPairs(edges);
  const placedEdges: PlacedEdge[] = edges.flatMap((edge) => {
    const origin = byId.get(edge.from);
    const destination = byId.get(edge.to);
    if (origin === undefined || destination === undefined) {
      return [];
    }
    const start = boundaryPoint(origin, center(destination));
    const end = boundaryPoint(destination, center(origin));
    const shared = (pairs.get([edge.from, edge.to].sort().join('|')) ?? 1) > 1;
    const backwards = destination.rank < origin.rank;
    const control = shared || backwards ? bowOf(start, end) : undefined;
    return [{ edge, start, end, control }];
  });

  const width =
    orientation === 'horizontal'
      ? along(rankCount - 1) + nodeWidth + margin
      : acrossVertical(verticalLaneCount - 1, verticalLaneCount) + nodeWidth + margin;
  const height =
    orientation === 'horizontal'
      ? across(laneCount - 1, laneCount) + nodeHeight + margin
      : alongVertical(rankCount - 1) +
        (rowsOf(rankCount - 1) - 1) * (nodeHeight + laneGap) +
        nodeHeight +
        margin;

  return { orientation, width, height, nodes: placed, edges: placedEdges };
};

export const pointAlong = (edge: PlacedEdge, progress: number): Point => {
  const clamped = Math.min(1, Math.max(0, progress));
  if (edge.control === undefined) {
    return {
      x: edge.start.x + (edge.end.x - edge.start.x) * clamped,
      y: edge.start.y + (edge.end.y - edge.start.y) * clamped,
    };
  }
  const remaining = 1 - clamped;
  return {
    x:
      remaining * remaining * edge.start.x +
      2 * remaining * clamped * edge.control.x +
      clamped * clamped * edge.end.x,
    y:
      remaining * remaining * edge.start.y +
      2 * remaining * clamped * edge.control.y +
      clamped * clamped * edge.end.y,
  };
};

export const edgePath = (edge: PlacedEdge): string => {
  const { start, end, control } = edge;
  if (control === undefined) {
    return `M${String(start.x)},${String(start.y)} L${String(end.x)},${String(end.y)}`;
  }
  return `M${String(start.x)},${String(start.y)} Q${String(control.x)},${String(control.y)} ${String(end.x)},${String(end.y)}`;
};

export const labelPoint = (edge: PlacedEdge): Point => pointAlong(edge, 0.5);
