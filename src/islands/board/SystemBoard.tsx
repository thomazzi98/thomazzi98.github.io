import { useMemo } from 'preact/hooks';
import type { Flow, Tone } from '../../systems/schema';
import {
  createFlowSimulation,
  defaultLeverValues,
  packetsOn,
  selectSteps,
} from '../../trace/runner';
import { useMediaQuery } from '../explorer/use-media-query';
import { formatClock } from '../player/format';
import { Ledger, type LedgerLine } from '../player/Ledger';
import { clockOf, usePlayback } from '../player/use-playback';
import { Schematic, type SchematicEdge, type SchematicNode } from '../schematic/Schematic';

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

// The clock runs on past the last event so the last packet arrives and the last line can be read.
const tail = 800;

// Each replay runs with its flow's default levers, so the end is where that selection ends.
const endOf = (flow: Flow): number => {
  const steps = selectSteps(flow, defaultLeverValues(flow.levers));
  const last = steps[steps.length - 1];
  return (last?.at ?? 0) + tail;
};

export const SystemBoard = ({ panels }: SystemBoardProps) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const endpointsByPanel = useMemo(
    () =>
      panels.map(
        (panel) => new Map(panel.edges.map((edge) => [edge.id, { from: edge.from, to: edge.to }])),
      ),
    [panels],
  );
  const end = useMemo(() => Math.max(0, ...panels.map((panel) => endOf(panel.flow))), [panels]);
  // Side by side, every rail spreads over as many rows as the longest footprint so the three
  // drawings end close to one height; stacked, each keeps its natural pitch. The query names the
  // stacked case so the markup rendered at build is the side-by-side one.
  const stacked = useMediaQuery('not all and (min-width: 64rem)');
  const rows = stacked ? 0 : Math.max(0, ...panels.map((panel) => panel.nodes.length));
  const playback = usePlayback({
    build: () =>
      panels.map((panel, index) =>
        createFlowSimulation(panel.flow, endpointsByPanel[index] ?? new Map()),
      ),
    endOf: () => end,
    autoplay: true,
    finishedText: (finished) => `Every replay finished at ${formatClock(clockOf(finished))}.`,
  });
  const { simulations } = playback;
  const clock = Math.min(end, playback.now);
  const stepExhausted = simulations.every((simulation) => simulation.pending() === 0);

  const step = () => {
    if (stepExhausted) {
      return;
    }
    const advanced = playback.step();
    const messages = advanced.flatMap((simulation) => {
      const panel = panels[simulations.indexOf(simulation)];
      const latest = simulation.log[simulation.log.length - 1];
      if (panel === undefined || latest === undefined) {
        return [];
      }
      return [`${panel.shortName}: ${latest.message}`];
    });
    playback.announce(messages.length === 0 ? 'Every replay has finished.' : messages.join('. '));
  };

  const playLabel = (): string => {
    if (playback.playing) {
      return 'Pause';
    }
    return playback.finished ? 'Replay' : 'Play';
  };

  const totalLines = simulations.reduce((sum, simulation) => sum + simulation.state.total, 0);
  const printedLines = simulations.reduce((sum, simulation) => sum + simulation.log.length, 0);

  const ledger = useMemo(() => {
    const lines: LedgerLine[] = simulations
      .flatMap((simulation, index) => {
        const panel = panels[index];
        if (panel === undefined) {
          return [];
        }
        return simulation.log.map((entry) => ({ entry, panel }));
      })
      .sort(
        (first, second) =>
          first.entry.at - second.entry.at || first.panel.name.localeCompare(second.panel.name),
      )
      .map(({ entry, panel }) => ({
        key: `${panel.systemId}-${String(entry.sequence)}`,
        at: entry.at,
        tone: entry.tone,
        station: panel.shortName,
        message: entry.message,
      }));
    return (
      <div class="board__ledger">
        <Ledger
          title="Ledger · three systems interleaved"
          name="Board ledger"
          lines={lines}
          total={totalLines}
        />
      </div>
    );
    // The logs only grow, so their combined length says whether the list changed.
  }, [simulations, printedLines, panels, totalLines]);

  return (
    <div
      ref={playback.root}
      class="board"
      data-ready={playback.ready ? 'true' : 'false'}
      data-running={playback.playing ? 'true' : 'false'}
      data-revision={playback.revision}
    >
      <div class="board__rail" role="group" aria-label="Board controls">
        <span class="badge" data-tone="neutral">
          simulation · one virtual clock
        </span>
        <span
          class="board__clock mono"
          role="timer"
          aria-live="off"
          aria-label="Virtual clock"
          data-clock
        >
          {formatClock(playback.now)}
        </span>
        <div class="board__buttons">
          <button type="button" class="control" onClick={playback.toggle}>
            {playLabel()}
          </button>
          <button
            type="button"
            class="control"
            onClick={step}
            aria-disabled={stepExhausted ? 'true' : undefined}
          >
            Step
          </button>
          <button type="button" class="control" onClick={playback.reset}>
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
            value={clock}
            aria-valuetext={formatClock(clock)}
            onInput={(event) => {
              playback.advanceTo(Number(event.currentTarget.value));
            }}
          />
        </label>
        <p class="board__note kicker">
          Reduced motion: nothing moves until you press Play or Step or move the scrubber.
        </p>
      </div>

      <div class="board__panels">
        {panels.map((panel, index) => {
          const simulation = simulations[index];
          if (simulation === undefined) {
            return null;
          }
          const activity: Record<string, Tone> = {};
          const latestTone = simulation.log[simulation.log.length - 1]?.tone ?? 'neutral';
          const activeNode = simulation.state.activeNode;
          if (activeNode !== undefined) {
            activity[activeNode] = latestTone;
          }
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
                {panel.flow.name} · {String(simulation.state.completed)} of{' '}
                {String(simulation.state.total)}
              </p>
              <Schematic
                systemId={`board-${panel.systemId}`}
                title={`${panel.name}: ${panel.flow.name}`}
                description={panel.flow.summary}
                nodes={panel.nodes}
                edges={panel.edges}
                orientation="rail"
                rows={rows}
                activity={activity}
                activeEdge={simulation.state.activeEdge}
                packets={packetsOn(simulation, panel.edges, { snap: reducedMotion })}
              />
              <a class="board__enter control" href={panel.href}>
                Enter the system
              </a>
            </section>
          );
        })}
      </div>

      {ledger}
      <p class="sr-only" aria-live="polite">
        {playback.announcement}
      </p>
    </div>
  );
};
