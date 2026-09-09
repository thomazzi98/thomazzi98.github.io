import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type { Tone } from '../../systems/schema';
import { presenceTone, type Presence } from '../../systems/shared-patterns';
import { layoutSystem } from '../schematic/layout';
import type { SchematicEdge, SchematicNode } from '../schematic/Schematic';
import { SchematicPair, stackedLimit } from '../schematic/SchematicPair';

export interface MapPanel {
  readonly systemId: string;
  readonly name: string;
  readonly shortName: string;
  readonly href: string;
  readonly description: string;
  readonly nodes: readonly SchematicNode[];
  readonly edges: readonly SchematicEdge[];
}

export interface LensEvidence {
  readonly href: string;
  readonly label: string;
}

export interface LensReading {
  readonly presence: Presence;
  readonly note: string;
  readonly nodes: readonly string[];
  readonly evidence: readonly LensEvidence[];
}

export interface Lens {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systems: Readonly<Record<string, LensReading>>;
}

export interface ArchitectureMapProps {
  readonly panels: readonly MapPanel[];
  readonly lenses: readonly Lens[];
}

const noLens = '';
const litTone: Tone = 'ok';

const activityFor = (reading: LensReading | undefined): Record<string, Tone> =>
  Object.fromEntries((reading?.nodes ?? []).map((nodeId) => [nodeId, litTone]));

const labelsFor = (panel: MapPanel, nodeIds: readonly string[]): string[] =>
  nodeIds.flatMap((nodeId) => {
    const node = panel.nodes.find((candidate) => candidate.id === nodeId);
    return node === undefined ? [] : [node.label];
  });

export const ArchitectureMap = ({ panels, lenses }: ArchitectureMapProps) => {
  const selected = useSignal(noLens);
  const ready = useSignal(false);

  useEffect(() => {
    ready.value = true;
  }, []);

  const lens = lenses.find((candidate) => candidate.id === selected.value);

  return (
    <div class="map" data-lens={lens?.id ?? 'none'} data-ready={ready.value ? 'true' : 'false'}>
      <fieldset class="map__lenses" hidden={!ready.value}>
        <legend class="kicker">Pattern lens</legend>
        <div class="map__options">
          <label class="map__option control">
            <input
              type="radio"
              class="map__radio"
              name="architecture-lens"
              value={noLens}
              checked={lens === undefined}
              onChange={() => {
                selected.value = noLens;
              }}
            />
            <span>No lens</span>
          </label>
          {lenses.map((candidate) => (
            <label key={candidate.id} class="map__option control">
              <input
                type="radio"
                class="map__radio"
                name="architecture-lens"
                value={candidate.id}
                checked={lens?.id === candidate.id}
                onChange={() => {
                  selected.value = candidate.id;
                }}
              />
              <span>{candidate.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <noscript>
        <p class="map__note kicker">
          The lens selector needs JavaScript. The matrix below the map reads without it.
        </p>
      </noscript>

      <div class="map__boards">
        {panels.map((panel) => {
          const reading = lens?.systems[panel.systemId];
          const drawingWidth = layoutSystem(panel.nodes, panel.edges, 'horizontal').width;
          return (
            <section
              key={panel.systemId}
              class="map__board"
              aria-labelledby={`map-${panel.systemId}`}
              style={`--drawing-width: ${String(drawingWidth)}px`}
            >
              <header class="map__head">
                <a id={`map-${panel.systemId}`} class="map__name" href={panel.href}>
                  {panel.name}
                </a>
                {reading === undefined ? (
                  <span class="kicker">
                    {String(panel.nodes.length)} parts · {String(panel.edges.length)} connections
                  </span>
                ) : (
                  <span class="badge" data-tone={presenceTone[reading.presence]}>
                    {reading.presence}
                  </span>
                )}
              </header>
              <div class="map__drawing">
                <SchematicPair
                  systemId={`map-${panel.systemId}`}
                  title={`${panel.name} architecture`}
                  description={panel.description}
                  nodes={panel.nodes}
                  edges={panel.edges}
                  activity={activityFor(reading)}
                />
              </div>
              {panel.nodes.length > stackedLimit && (
                <p class="map__scroll-hint kicker">Full drawing · scrolls sideways</p>
              )}
            </section>
          );
        })}
      </div>

      {lens !== undefined && (
        <div class="map__reading panel">
          <div class="panel__head">
            <strong>{lens.name}</strong>
            <span>lens</span>
          </div>
          <div class="panel__body">
            <p class="map__description">{lens.description}</p>
            <dl class="map__systems">
              {panels.map((panel) => {
                const reading = lens.systems[panel.systemId];
                if (reading === undefined) {
                  return null;
                }
                const lit = labelsFor(panel, reading.nodes);
                return (
                  <div key={panel.systemId} class="map__system">
                    <dt>
                      <span class="map__system-name">{panel.shortName}</span>
                      <span class="badge" data-tone={presenceTone[reading.presence]}>
                        {reading.presence}
                      </span>
                    </dt>
                    <dd>
                      <p>{reading.note}</p>
                      <p class="map__lit kicker">
                        {lit.length === 0
                          ? 'No part is lit: this lives in scripts and documents'
                          : `Lit: ${lit.join(', ')}`}
                      </p>
                      <p class="evidence">
                        {reading.evidence.map((entry, index) => (
                          <span key={entry.href}>
                            {index > 0 && ' · '}
                            <a href={entry.href}>{entry.label}</a>
                          </span>
                        ))}
                      </p>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};
