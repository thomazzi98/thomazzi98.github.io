import { useSignal } from '@preact/signals';
import type { ComponentChildren, TargetedEvent } from 'preact';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { Tone } from '../../systems/schema';
import type { SchematicEdge, SchematicNode } from '../schematic/Schematic';
import { SchematicPair } from '../schematic/SchematicPair';

export interface MapPanel {
  readonly systemId: string;
  readonly name: string;
  readonly href: string;
  readonly description: string;
  readonly nodes: readonly SchematicNode[];
  readonly edges: readonly SchematicEdge[];
}

export interface Lens {
  readonly id: string;
  readonly name: string;
  // The parts each system lights under this lens; the prose lives in the readings the page renders.
  readonly systems: Readonly<Record<string, readonly string[]>>;
}

export interface ArchitectureMapProps {
  readonly panels: readonly MapPanel[];
  readonly lenses: readonly Lens[];
  readonly readings?: ComponentChildren;
}

type Activity = Readonly<Record<string, Tone>>;

const noLens = '';
const litTone: Tone = 'ok';
const legendId = 'architecture-lens-legend';
const selectId = 'architecture-lens-select';
const noActivity: Activity = {};

const activityFor = (nodeIds: readonly string[]): Activity =>
  Object.fromEntries(nodeIds.map((nodeId) => [nodeId, litTone]));

const litCount = (activity: Activity, panel: MapPanel): number =>
  panel.nodes.filter((node) => node.id in activity).length;

const headText = (activity: Activity | undefined, panel: MapPanel): string => {
  if (activity === undefined) {
    return `${String(panel.nodes.length)} parts · ${String(panel.edges.length)} connections`;
  }
  const lit = litCount(activity, panel);
  if (lit === 0) {
    return `No part lit of ${String(panel.nodes.length)}`;
  }
  return `${String(lit)} of ${String(panel.nodes.length)} parts lit`;
};

// The notes and evidence of a lens are printed once, in the matrix; a reading borrows them by
// cloning the row's cells the first time it is shown, so the document carries each sentence once.
const borrowFromMatrix = (block: HTMLElement) => {
  for (const slot of block.querySelectorAll<HTMLElement>('[data-copy-of]')) {
    if (slot.childElementCount > 0 || slot.dataset.copyOf === undefined) {
      continue;
    }
    const source = document.querySelector(slot.dataset.copyOf);
    if (source === null) {
      continue;
    }
    for (const child of source.children) {
      slot.append(child.cloneNode(true));
    }
  }
};

// The selector is sticky, so a reading that is not wholly on screen under it is scrolled to sit
// right below it; aligning to the nearest edge would leave a long reading with its head hidden.
const bringUnderSelector = (reading: HTMLElement, selector: HTMLElement | null) => {
  if (typeof reading.scrollIntoView !== 'function') {
    return;
  }
  const selectorBottom = selector?.getBoundingClientRect().bottom ?? 0;
  const { top, bottom } = reading.getBoundingClientRect();
  if (top >= selectorBottom && bottom <= window.innerHeight) {
    return;
  }
  const gap = Number.parseFloat(getComputedStyle(reading).marginTop) || 0;
  reading.style.scrollMarginTop = `${String((selector?.offsetHeight ?? 0) + gap)}px`;
  reading.scrollIntoView({ block: 'start' });
};

const revealReading = (region: HTMLElement, lensId: string, selector: HTMLElement | null) => {
  let shown: HTMLElement | undefined;
  for (const block of region.querySelectorAll<HTMLElement>('[data-lens-reading]')) {
    const matches = block.dataset.lensReading === lensId;
    if (matches) {
      borrowFromMatrix(block);
      shown = block;
    }
    block.hidden = !matches;
  }
  if (shown !== undefined) {
    bringUnderSelector(shown, selector);
  }
};

export const ArchitectureMap = ({ panels, lenses, readings }: ArchitectureMapProps) => {
  const selected = useSignal(noLens);
  const lensesReference = useRef<HTMLFieldSetElement>(null);
  const readingReference = useRef<HTMLDivElement>(null);

  const activityByLens = useMemo(
    () =>
      new Map(
        lenses.map((lens) => [
          lens.id,
          new Map(
            panels.map((panel) => [
              panel.systemId,
              activityFor(lens.systems[panel.systemId] ?? []),
            ]),
          ),
        ]),
      ),
    [lenses, panels],
  );

  const lens = lenses.find((candidate) => candidate.id === selected.value);
  const activities = lens === undefined ? undefined : activityByLens.get(lens.id);

  // Before paint, so the reading and the lit parts appear in the same frame.
  useLayoutEffect(() => {
    const region = readingReference.current;
    if (region === null) {
      return;
    }
    revealReading(region, selected.value, lensesReference.current);
  }, [selected.value]);

  const choose = (lensId: string) => {
    selected.value = lensId;
  };

  const onSelectChange = (event: TargetedEvent<HTMLSelectElement>) => {
    choose(event.currentTarget.value);
  };

  return (
    <div class="map" data-lens={lens?.id ?? 'none'}>
      <fieldset ref={lensesReference} class="map__lenses">
        <legend id={legendId} class="kicker">
          Pattern lens
        </legend>
        <div class="map__options">
          <label class="map__option control">
            <input
              type="radio"
              class="map__radio"
              name="architecture-lens"
              value={noLens}
              checked={lens === undefined}
              onChange={() => {
                choose(noLens);
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
                  choose(candidate.id);
                }}
              />
              <span>{candidate.name}</span>
            </label>
          ))}
        </div>
        <select
          id={selectId}
          class="map__select"
          aria-labelledby={legendId}
          value={selected.value}
          onChange={onSelectChange}
        >
          <option value={noLens}>No lens</option>
          {lenses.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </fieldset>
      {/* Outside the fieldset, because the layout hides the whole fieldset when scripts are off. */}
      <noscript>
        <p class="map__note kicker">
          The lens selector needs JavaScript. The matrix below the map reads without it.
        </p>
      </noscript>

      <div ref={readingReference} class="map__reading" aria-live="polite">
        {readings}
      </div>

      <div class="map__boards">
        {panels.map((panel) => {
          const activity = activities?.get(panel.systemId);
          return (
            <section
              key={panel.systemId}
              class="map__board"
              aria-labelledby={`map-${panel.systemId}`}
            >
              <header class="map__head">
                <a id={`map-${panel.systemId}`} class="map__name" href={panel.href}>
                  {panel.name}
                </a>
                <span class="kicker" data-lit={activity === undefined ? undefined : 'true'}>
                  {headText(activity, panel)}
                </span>
              </header>
              <div class="map__drawing">
                <SchematicPair
                  systemId={`map-${panel.systemId}`}
                  title={`${panel.name} architecture`}
                  description={panel.description}
                  nodes={panel.nodes}
                  edges={panel.edges}
                  activity={activity ?? noActivity}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
