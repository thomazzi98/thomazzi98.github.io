import type { BenchDefinition, StationKind } from '../core/definition';

const kindLabel: Record<StationKind, string> = {
  actor: 'actor',
  service: 'service',
  store: 'store',
  queue: 'queue',
  external: 'external system',
  boundary: 'boundary',
};

export const describeDefinition = (definition: BenchDefinition): string => {
  const labels = new Map(definition.stations.map((station) => [station.id, station.label]));
  const stations = definition.stations
    .map((station) => {
      const note = station.note === undefined ? '' : ` (${station.note})`;
      return `${station.label}, ${kindLabel[station.kind]}${note}`;
    })
    .join('; ');
  const wires = definition.wires
    .map((wire) => {
      const from = labels.get(wire.from) ?? wire.from;
      const destination = labels.get(wire.to) ?? wire.to;
      const label = wire.label === undefined ? '' : `, ${wire.label}`;
      const dashed = wire.dashed === true ? ', dashed' : '';
      return `${from} to ${destination}${label}${dashed}`;
    })
    .join('; ');
  return `Stations: ${stations}. Wires: ${wires}. A dashed wire is a path the design avoids or an alternative on the table.`;
};
