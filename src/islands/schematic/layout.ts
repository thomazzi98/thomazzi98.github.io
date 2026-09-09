import type { NodeKind } from '../../systems/schema';

export type Orientation = 'horizontal' | 'vertical';

export interface LayoutNode {
  readonly id: string;
  readonly label: string;
  readonly kind: NodeKind;
}

export interface LayoutEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
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
}

export interface PlacedEdge<Edge extends LayoutEdge = LayoutEdge> {
  edge: Edge;
  start: Point;
  end: Point;
  control?: Point;
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

export const nodeWidth = 132;
export const nodeHeight = 44;
const rankGap = 84;
const laneGap = 30;
const margin = 16;
const verticalLaneLimit = 2;
const orderingSweeps = 3;

const entryKinds: ReadonlySet<NodeKind> = new Set(['actor', 'external']);

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

const bowOf = (start: Point, end: Point): Point => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const bow = Math.min(bowLimit, length * bowShare);
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

const countPairs = (edges: readonly LayoutEdge[]): Map<string, number> => {
  const pairs = new Map<string, number>();
  for (const edge of edges) {
    const key = [edge.from, edge.to].sort().join('|');
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  return pairs;
};

export const layoutSystem = <Node extends LayoutNode, Edge extends LayoutEdge>(
  nodes: readonly Node[],
  edges: readonly Edge[],
  orientation: Orientation,
): Layout<Node, Edge> => {
  const ranks = rankNodes(nodes, edges);
  const lanes = groupByRank(nodes, ranks);
  orderLanes(lanes, edges, ranks);
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
    Math.round(margin + (index + (laneCount - count) / 2) * (nodeHeight + laneGap));
  const acrossVertical = (index: number, count: number): number =>
    Math.round(margin + (index + (verticalLaneCount - count) / 2) * (nodeWidth + laneGap));

  const placed: PlacedNode<Node>[] = nodes.map((node, number) => {
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
  const placedEdges: PlacedEdge<Edge>[] = edges.flatMap((edge) => {
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
