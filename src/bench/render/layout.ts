import type { BenchDefinition, Station, Wire } from '../core/definition';

export type Orientation = 'horizontal' | 'vertical';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedStation extends Box {
  station: Station;
  rank: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PlacedWire {
  wire: Wire;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  control?: Point;
}

export interface Layout {
  orientation: Orientation;
  width: number;
  height: number;
  stations: PlacedStation[];
  wires: PlacedWire[];
}

const stationWidth = 132;
const stationHeight = 44;
const rankGap = 72;
const laneGap = 28;
const margin = 12;

const rankStations = (definition: BenchDefinition): Map<string, number> => {
  const ranks = new Map<string, number>();
  const solidWires = definition.wires.filter((wire) => wire.dashed !== true);
  const incoming = new Map<string, number>();
  for (const station of definition.stations) {
    incoming.set(station.id, 0);
  }
  for (const wire of solidWires) {
    incoming.set(wire.to, (incoming.get(wire.to) ?? 0) + 1);
  }
  const hasSolidWire = (id: string): boolean =>
    solidWires.some((wire) => wire.from === id || wire.to === id);
  const queue = definition.stations
    .filter((station) => incoming.get(station.id) === 0 && hasSolidWire(station.id))
    .map((station) => station.id);
  for (const id of queue) {
    ranks.set(id, 0);
  }
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const currentRank = ranks.get(current) ?? 0;
    for (const wire of solidWires.filter((candidate) => candidate.from === current)) {
      const proposed = currentRank + 1;
      const known = ranks.get(wire.to);
      if (known === undefined || known < proposed) {
        ranks.set(wire.to, proposed);
      }
      const remaining = (incoming.get(wire.to) ?? 1) - 1;
      incoming.set(wire.to, remaining);
      if (remaining === 0) {
        queue.push(wire.to);
      }
    }
  }
  for (const station of definition.stations) {
    if (ranks.has(station.id)) {
      continue;
    }
    const targets = definition.wires
      .filter((wire) => wire.from === station.id)
      .map((wire) => ranks.get(wire.to))
      .filter((rank): rank is number => rank !== undefined);
    ranks.set(station.id, targets.length === 0 ? 0 : Math.max(0, Math.min(...targets) - 1));
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

const center = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

const edgePoint = (box: Box, towards: Point): Point => {
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

export const layoutBench = (definition: BenchDefinition, orientation: Orientation): Layout => {
  const ranks = rankStations(definition);
  const lanes = new Map<number, string[]>();
  for (const station of definition.stations) {
    const rank = ranks.get(station.id) ?? 0;
    lanes.set(rank, [...(lanes.get(rank) ?? []), station.id]);
  }
  const rankCount = Math.max(...lanes.keys()) + 1;
  const laneCount = Math.max(...[...lanes.values()].map((lane) => lane.length));
  const along = (rank: number): number => margin + rank * (stationWidth + rankGap);
  const alongVertical = (rank: number): number => margin + rank * (stationHeight + rankGap);
  const across = (index: number, count: number, size: number): number =>
    margin + (index + (laneCount - count) / 2) * (size + laneGap);

  const stations: PlacedStation[] = definition.stations.map((station) => {
    const rank = ranks.get(station.id) ?? 0;
    const lane = lanes.get(rank) ?? [];
    const index = lane.indexOf(station.id);
    if (orientation === 'horizontal') {
      return {
        station,
        rank,
        x: along(rank),
        y: across(index, lane.length, stationHeight),
        width: stationWidth,
        height: stationHeight,
      };
    }
    return {
      station,
      rank,
      x: across(index, lane.length, stationWidth),
      y: alongVertical(rank),
      width: stationWidth,
      height: stationHeight,
    };
  });

  const byId = new Map(stations.map((placed) => [placed.station.id, placed]));
  const wires: PlacedWire[] = definition.wires.flatMap((wire) => {
    const origin = byId.get(wire.from);
    const destination = byId.get(wire.to);
    if (origin === undefined || destination === undefined) {
      return [];
    }
    const start = edgePoint(origin, center(destination));
    const end = edgePoint(destination, center(origin));
    const control = wire.dashed === true ? bowOf(start, end) : undefined;
    return [{ wire, x1: start.x, y1: start.y, x2: end.x, y2: end.y, control }];
  });

  const width =
    orientation === 'horizontal'
      ? along(rankCount - 1) + stationWidth + margin
      : across(laneCount - 1, laneCount, stationWidth) + stationWidth + margin;
  const height =
    orientation === 'horizontal'
      ? across(laneCount - 1, laneCount, stationHeight) + stationHeight + margin
      : alongVertical(rankCount - 1) + stationHeight + margin;

  return { orientation, width, height, stations, wires };
};

export const pointAlong = (wire: PlacedWire, progress: number): Point => {
  const clamped = Math.min(1, Math.max(0, progress));
  if (wire.control === undefined) {
    return {
      x: wire.x1 + (wire.x2 - wire.x1) * clamped,
      y: wire.y1 + (wire.y2 - wire.y1) * clamped,
    };
  }
  const remaining = 1 - clamped;
  return {
    x:
      remaining * remaining * wire.x1 +
      2 * remaining * clamped * wire.control.x +
      clamped * clamped * wire.x2,
    y:
      remaining * remaining * wire.y1 +
      2 * remaining * clamped * wire.control.y +
      clamped * clamped * wire.y2,
  };
};

export const wirePath = (wire: PlacedWire): string =>
  wire.control === undefined
    ? `M${String(wire.x1)},${String(wire.y1)} L${String(wire.x2)},${String(wire.y2)}`
    : `M${String(wire.x1)},${String(wire.y1)} Q${String(wire.control.x)},${String(wire.control.y)} ${String(wire.x2)},${String(wire.y2)}`;
