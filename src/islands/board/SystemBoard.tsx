import { useSignal } from '@preact/signals';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { Flow, Tone } from '../../systems/schema';
import type { LogEntry } from '../../trace/kernel/simulation';
import { createFlowSimulation, selectSteps, type TraceSimulation } from '../../trace/runner';
import { useMediaQuery } from '../explorer/use-media-query';
import { formatClock } from '../player/format';
import {
  Schematic,
  type Packet,
  type SchematicEdge,
  type SchematicNode,
} from '../schematic/Schematic';

export interface BoardPanel {
  readonly systemId: string;
  readonly name: string;
  readonly shortName: string;
  readonly href: string;
  readonly maturity: string;
  readonly maturityTone: Tone;
  readonly nodes: readonly SchematicNode[];
  readonly edges: readonly SchematicEdge[];
  readonly flow: Flow;
}

export interface SystemBoardProps {
  readonly panels: readonly BoardPanel[];
}

const frameCap = 100;
const tail = 800;
const ledgerLines = 9;

const endOf = (flow: Flow): number => {
  const steps = selectSteps(flow, {});
  const last = steps[steps.length - 1];
  return (last?.at ?? 0) + tail;
};

interface TaggedEntry extends LogEntry {
  readonly panel: BoardPanel;
}

export const SystemBoard = ({ panels }: SystemBoardProps) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const version = useSignal(0);
  const playing = useSignal(false);
  const ready = useSignal(false);
  const announcement = useSignal('');
  const endpointsByPanel = useMemo(
    () =>
      panels.map(
        (panel) => new Map(panel.edges.map((edge) => [edge.id, { from: edge.from, to: edge.to }])),
      ),
    [panels],
  );
  const simulationsReference = useRef<TraceSimulation[]>(
    panels.map((panel, index) =>
      createFlowSimulation(panel.flow, endpointsByPanel[index] ?? new Map(), { seed: index + 1 }),
    ),
  );
  const frameReference = useRef<number | undefined>(undefined);
  const lastFrameReference = useRef<number | undefined>(undefined);

  const simulations = simulationsReference.current;
  const end = Math.max(...panels.map((panel) => endOf(panel.flow)));
  const clock = Math.max(0, ...simulations.map((simulation) => simulation.now));
  const finished = simulations.every((simulation) => simulation.pending() === 0) && clock >= end;

  const refresh = () => {
    version.value += 1;
  };

  const stop = () => {
    playing.value = false;
    if (frameReference.current !== undefined) {
      cancelAnimationFrame(frameReference.current);
      frameReference.current = undefined;
    }
    lastFrameReference.current = undefined;
  };

  const reset = () => {
    stop();
    simulationsReference.current = panels.map((panel, index) =>
      createFlowSimulation(panel.flow, endpointsByPanel[index] ?? new Map(), { seed: index + 1 }),
    );
    announcement.value = '';
    refresh();
  };

  const advanceAll = (duration: number) => {
    for (const simulation of simulationsReference.current) {
      simulation.advance(duration);
    }
  };

  const advanceTo = (target: number) => {
    if (target < clock) {
      reset();
    }
    const current = Math.max(
      0,
      ...simulationsReference.current.map((simulation) => simulation.now),
    );
    advanceAll(Math.max(0, target - current));
    refresh();
  };

  const frame = (timestamp: number) => {
    const previous = lastFrameReference.current ?? timestamp;
    lastFrameReference.current = timestamp;
    advanceAll(Math.min(frameCap, timestamp - previous));
    refresh();
    const current = simulationsReference.current;
    const done =
      current.every((simulation) => simulation.pending() === 0) &&
      Math.max(0, ...current.map((simulation) => simulation.now)) >= end;
    if (done) {
      stop();
      announcement.value = 'All three replays finished.';
      return;
    }
    frameReference.current = requestAnimationFrame(frame);
  };

  const play = () => {
    if (playing.value) {
      stop();
      return;
    }
    if (finished) {
      reset();
    }
    playing.value = true;
    frameReference.current = requestAnimationFrame(frame);
  };

  const playLabel = (): string => {
    if (playing.value) {
      return 'Pause';
    }
    return finished ? 'Replay' : 'Play';
  };

  const step = () => {
    stop();
    const messages: string[] = [];
    simulationsReference.current.forEach((simulation, index) => {
      if (!simulation.step()) {
        return;
      }
      const latest = simulation.log[simulation.log.length - 1];
      if (latest !== undefined) {
        messages.push(`${panels[index]?.shortName ?? ''}: ${latest.message}`);
      }
    });
    announcement.value = messages.length === 0 ? 'Every replay has finished.' : messages.join('. ');
    refresh();
  };

  useEffect(() => {
    ready.value = true;
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      play();
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
    // The board starts once when it mounts; reduced motion is read at that moment.
  }, []);

  const revision = version.value;
  const ledger: TaggedEntry[] = simulations
    .flatMap((simulation, index) => {
      const panel = panels[index];
      if (panel === undefined) {
        return [];
      }
      return simulation.log.map((entry) => ({ ...entry, panel }));
    })
    .sort(
      (first, second) => first.at - second.at || first.panel.name.localeCompare(second.panel.name),
    )
    .slice(-ledgerLines);
  const totalLines = simulations.reduce((sum, simulation) => sum + simulation.state.total, 0);
  const printedLines = simulations.reduce((sum, simulation) => sum + simulation.log.length, 0);

  return (
    <div
      class="board"
      data-ready={ready.value ? 'true' : 'false'}
      data-running={playing.value ? 'true' : 'false'}
      data-revision={revision}
    >
      <div class="board__rail" role="group" aria-label="Board controls">
        <span class="badge" data-tone={playing.value ? 'wait' : 'neutral'}>
          simulation · one virtual clock
        </span>
        <output class="board__clock mono" aria-label="Virtual clock" data-clock>
          {formatClock(clock)}
        </output>
        <div class="board__buttons">
          {!reducedMotion && (
            <button type="button" class="control" onClick={play} aria-pressed={playing.value}>
              {playLabel()}
            </button>
          )}
          <button
            type="button"
            class="control"
            onClick={step}
            disabled={simulations.every((simulation) => simulation.pending() === 0)}
          >
            Step
          </button>
          <button type="button" class="control" onClick={reset}>
            Reset
          </button>
        </div>
        <label class="board__scrubber">
          <span class="sr-only">Scrub the virtual clock</span>
          <input
            type="range"
            min={0}
            max={end}
            step={100}
            value={Math.min(end, clock)}
            onInput={(event) => {
              stop();
              advanceTo(Number(event.currentTarget.value));
            }}
          />
        </label>
        {reducedMotion && (
          <p class="board__note kicker">Reduced motion: nothing moves until you press Step.</p>
        )}
      </div>

      <div class="board__panels">
        {panels.map((panel, index) => {
          const simulation = simulations[index];
          const activity: Record<string, Tone> = {};
          const latestTone = simulation?.log[simulation.log.length - 1]?.tone ?? 'neutral';
          const activeNode = simulation?.state.activeNode;
          if (activeNode !== undefined) {
            activity[activeNode] = latestTone;
          }
          const packets: Packet[] = (simulation?.packets ?? [])
            .filter((packet) => packet.arrivesAt > (simulation?.now ?? 0))
            .flatMap((packet) => {
              const edge = panel.edges.find(
                (candidate) => candidate.from === packet.from && candidate.to === packet.to,
              );
              if (edge === undefined || simulation === undefined) {
                return [];
              }
              return [
                {
                  edge: edge.id,
                  progress:
                    (simulation.now - packet.departedAt) /
                    Math.max(1, packet.arrivesAt - packet.departedAt),
                  tone: packet.tone,
                },
              ];
            });
          const completed = simulation?.state.completed ?? 0;
          const total = simulation?.state.total ?? 0;
          return (
            <section
              key={panel.systemId}
              class="board__panel"
              aria-labelledby={`board-${panel.systemId}`}
            >
              <header class="board__head">
                <a id={`board-${panel.systemId}`} class="board__name" href={panel.href}>
                  {panel.name}
                </a>
                <span class="badge" data-tone={panel.maturityTone}>
                  {panel.maturity}
                </span>
              </header>
              <p class="board__flow kicker">
                {panel.flow.name} · {String(completed)} of {String(total)}
              </p>
              <Schematic
                systemId={`board-${panel.systemId}`}
                title={`${panel.name}: ${panel.flow.name}`}
                description={panel.flow.summary}
                nodes={panel.nodes}
                edges={panel.edges}
                orientation="vertical"
                activity={activity}
                activeEdge={simulation?.state.activeEdge}
                packets={packets}
              />
              <a class="board__enter control" href={panel.href}>
                Enter the system
              </a>
            </section>
          );
        })}
      </div>

      <div class="ledger board__ledger" data-ledger>
        <div class="ledger__head">
          <span class="kicker">Ledger · three systems interleaved</span>
          <span class="kicker">
            {String(printedLines)} of {String(totalLines)} lines · simulation
          </span>
        </div>
        {ledger.length === 0 && <p class="ledger__empty muted">Nothing has happened yet.</p>}
        <ol class="ledger__lines">
          {ledger.map((entry) => (
            <li
              key={`${entry.panel.systemId}-${String(entry.sequence)}`}
              class="ledger__line"
              data-tone={entry.tone}
            >
              <span class="ledger__time mono">{formatClock(entry.at)}</span>
              <span class="ledger__station kicker">{entry.panel.shortName}</span>
              <span class="ledger__message">{entry.message}</span>
            </li>
          ))}
        </ol>
      </div>
      <p class="sr-only" aria-live="polite">
        {announcement.value}
      </p>
    </div>
  );
};
