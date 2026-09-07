export type StationKind = 'actor' | 'service' | 'store' | 'queue' | 'external' | 'boundary';

export interface Station {
  id: string;
  label: string;
  kind: StationKind;
  note?: string;
}

export interface Wire {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface LeverOption {
  value: string;
  label: string;
}

export interface LeverDefinition {
  id: string;
  label: string;
  options: readonly LeverOption[];
}

export interface ActionDefinition {
  id: string;
  label: string;
}

export interface BenchDefinition {
  stations: readonly Station[];
  wires: readonly Wire[];
  levers: readonly LeverDefinition[];
  actions: readonly ActionDefinition[];
  rowActions?: boolean;
  idleTraffic?: boolean;
}

export const assertDefinitionIsConsistent = (definition: BenchDefinition): void => {
  const stationIds = new Set(definition.stations.map((station) => station.id));
  for (const wire of definition.wires) {
    if (!stationIds.has(wire.from) || !stationIds.has(wire.to)) {
      throw new Error(`Wire ${wire.from} -> ${wire.to} names a station that does not exist.`);
    }
  }
};
