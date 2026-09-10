import { useSignal } from '@preact/signals';
import { useEffect, useMemo } from 'preact/hooks';
import type { Flow, Tone } from '../../systems/schema';
import {
  createFlowSimulation,
  defaultLeverValues,
  packetsOn,
  selectSteps,
  type LeverValues,
} from '../../trace/runner';
import { useMediaQuery } from '../explorer/use-media-query';
import type { SchematicEdge, SchematicNode } from '../schematic/Schematic';
import { SchematicPair } from '../schematic/SchematicPair';
import { formatClock } from './format';
import { Ledger, type LedgerLine, type LedgerNote } from './Ledger';
import { clockOf, prefersReducedMotion, usePlayback } from './use-playback';

export interface FlowPlayerProps {
  // Unique per player on a page: it names the radio groups and prefixes the drawing's ids.
  readonly stageId: string;
  readonly systemId: string;
  readonly systemName: string;
  readonly nodes: readonly SchematicNode[];
  readonly edges: readonly SchematicEdge[];
  readonly flows: readonly Flow[];
  readonly autoplay?: boolean;
}

// The clock runs on past the last event so its packet arrives and the last line can be read.
const tail = 600;
const hashPrefix = '#flow-';

const endOf = (flow: Flow, values: LeverValues): number => {
  const steps = selectSteps(flow, values);
  const last = steps[steps.length - 1];
  return (last?.at ?? 0) + tail;
};

const firstFlow = (flows: readonly Flow[]): Flow => {
  const flow = flows[0];
  if (flow === undefined) {
    throw new Error('A flow player needs at least one flow.');
  }
  return flow;
};

const flowFromHash = (flows: readonly Flow[]): Flow | undefined => {
  if (!window.location.hash.startsWith(hashPrefix)) {
    return undefined;
  }
  const id = window.location.hash.slice(hashPrefix.length);
  return flows.find((candidate) => candidate.id === id);
};

const machinesOf = (flow: Flow): string[] => [
  ...new Set(
    flow.steps.flatMap((step) => (step.status === undefined ? [] : [step.status.machine])),
  ),
];

// The tone of a status is the tone of the step that set it, so a badge never borrows a later line's.
const statusTones = (flow: Flow): ReadonlyMap<string, Tone> =>
  new Map(
    flow.steps.flatMap((step) =>
      step.status === undefined ? [] : [[`${step.status.machine}:${step.status.value}`, step.tone]],
    ),
  );

export const FlowPlayer = ({
  stageId,
  systemId,
  systemName,
  nodes,
  edges,
  flows,
  autoplay = false,
}: FlowPlayerProps) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const flowId = useSignal(firstFlow(flows).id);
  const levers = useSignal<LeverValues>(defaultLeverValues(firstFlow(flows).levers));
  const note = useSignal<LedgerNote | undefined>(undefined);
  const currentFlow = (): Flow =>
    flows.find((candidate) => candidate.id === flowId.value) ?? firstFlow(flows);
  const flow = currentFlow();
  const endpoints = useMemo(
    () => new Map(edges.map((edge) => [edge.id, { from: edge.from, to: edge.to }])),
    [edges],
  );
  const labels = useMemo(
    () =>
      new Map<string, string>([
        ...nodes.map((node) => [node.id, node.label] as const),
        ...edges.map((edge) => [edge.id, edge.label] as const),
      ]),
    [nodes, edges],
  );
  const playback = usePlayback({
    build: () => [createFlowSimulation(currentFlow(), endpoints, { levers: levers.value })],
    endOf: () => endOf(currentFlow(), levers.value),
    autoplay,
    finishedText: (simulations) =>
      `${currentFlow().name} finished at ${formatClock(clockOf(simulations))}.`,
  });
  const simulation = playback.simulations[0];
  if (simulation === undefined) {
    throw new Error('The flow player lost its simulation.');
  }
  const end = endOf(flow, levers.value);
  const machines = useMemo(() => machinesOf(flow), [flow]);
  const toneOfStatus = useMemo(() => statusTones(flow), [flow]);

  const reset = () => {
    note.value = undefined;
    playback.reset();
  };

  // A lever or flow change restarts the replay and says so, in the live region and in the ledger.
  const restartAfter = (station: string, change: string) => {
    playback.reset();
    const reduced = prefersReducedMotion();
    const text = `${change}. ${reduced ? 'Reset; press Play or Step.' : 'Replaying.'}`;
    note.value = { station, message: text };
    if (!reduced) {
      playback.play();
    }
    playback.announce(text);
  };

  const selectFlow = (next: Flow) => {
    flowId.value = next.id;
    levers.value = defaultLeverValues(next.levers);
    restartAfter('flow', `Flow: ${next.name}`);
  };

  const setLever = (leverId: string, value: string) => {
    const lever = flow.levers.find((candidate) => candidate.id === leverId);
    const option = lever?.options.find((candidate) => candidate.value === value);
    if (lever === undefined || option === undefined) {
      return;
    }
    levers.value = { ...levers.value, [leverId]: value };
    restartAfter('lever', `${lever.label}: ${option.label}`);
  };

  const step = () => {
    if (simulation.pending() === 0) {
      return;
    }
    playback.step();
    const latest = simulation.log[simulation.log.length - 1];
    const finished = simulation.pending() === 0 ? ` ${flow.name} finished.` : '';
    playback.announce(`${latest?.message ?? ''}${finished}`);
  };

  const playLabel = (): string => {
    if (playback.playing) {
      return 'Pause';
    }
    return playback.finished ? 'Replay' : 'Play';
  };

  useEffect(() => {
    const followHash = () => {
      const target = flowFromHash(flows);
      if (target !== undefined && target.id !== flowId.value) {
        selectFlow(target);
      }
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => {
      window.removeEventListener('hashchange', followHash);
    };
    // The hash is read once at mount and then on every change.
  }, []);

  const activity: Record<string, Tone> = {};
  const activeNode = simulation.state.activeNode;
  const latestTone = simulation.log[simulation.log.length - 1]?.tone ?? 'neutral';
  if (activeNode !== undefined) {
    activity[activeNode] = latestTone;
  }
  const packets = packetsOn(simulation, edges, { snap: reducedMotion });
  const statuses = simulation.state.statuses;
  const lineCount = simulation.log.length;
  const clock = Math.min(end, simulation.now);
  const stepExhausted = simulation.pending() === 0;

  const ledger = useMemo(() => {
    const lines: LedgerLine[] = simulation.log.map((entry) => ({
      key: String(entry.sequence),
      at: entry.at,
      tone: entry.tone,
      station: labels.get(entry.station) ?? entry.station,
      message: entry.message,
    }));
    return (
      <Ledger
        title="Ledger"
        name={`${flow.name} ledger`}
        lines={lines}
        total={simulation.state.total}
        note={note.value}
      />
    );
    // The log only grows, so its length says whether the list changed.
  }, [simulation, lineCount, labels, note.value, flow.name]);

  const statusRow = useMemo(
    () =>
      machines.length > 0 && (
        <dl class="player__statuses">
          {machines.map((machine) => {
            const value = statuses[machine];
            return (
              <div key={machine} class="player__status">
                <dt class="kicker">{machine}</dt>
                <dd
                  class="badge"
                  data-tone={
                    value === undefined ? 'neutral' : toneOfStatus.get(`${machine}:${value}`)
                  }
                >
                  {value ?? 'not yet set'}
                </dd>
              </div>
            );
          })}
        </dl>
      ),
    [machines, statuses, toneOfStatus],
  );

  return (
    <div
      ref={playback.root}
      class="player"
      data-system={systemId}
      data-flow={flow.id}
      data-ready={playback.ready ? 'true' : 'false'}
      data-running={playback.playing ? 'true' : 'false'}
      data-revision={playback.revision}
    >
      {flows.length > 1 && (
        <fieldset class="lever player__flows">
          <legend class="kicker">Flow</legend>
          <div class="lever__options">
            {flows.map((candidate) => (
              <label key={candidate.id} class="lever__option">
                <input
                  type="radio"
                  name={`${stageId}-flow`}
                  value={candidate.id}
                  checked={candidate.id === flow.id}
                  onChange={() => {
                    selectFlow(candidate);
                  }}
                />
                <span>{candidate.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <p class="player__flow">
        <strong>{flow.name}.</strong> {flow.summary}
      </p>

      <div class="player__rail" role="group" aria-label={`${flow.name} controls`}>
        <span class="player__lamp badge" data-tone={playback.playing ? 'wait' : 'neutral'}>
          simulation
        </span>
        <span
          class="player__clock mono"
          role="timer"
          aria-live="off"
          aria-label="Virtual clock"
          data-clock
        >
          {formatClock(simulation.now)}
        </span>
        <span class="kicker player__progress">
          {String(simulation.state.completed)} of {String(simulation.state.total)} steps
        </span>
        <div class="player__buttons">
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
          <button type="button" class="control" onClick={reset}>
            Reset
          </button>
        </div>
        <label class="player__scrubber">
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
        <p class="player__note kicker">
          Reduced motion: nothing moves until you press Play or Step or move the scrubber.
        </p>
      </div>

      {flow.levers.length > 0 && (
        <div class="player__levers">
          {flow.levers.map((lever) => (
            <fieldset key={`${flow.id}-${lever.id}`} class="lever">
              <legend class="kicker">{lever.label}</legend>
              <div class="lever__options">
                {lever.options.map((option) => (
                  <label key={option.value} class="lever__option">
                    <input
                      type="radio"
                      name={`${stageId}-${flow.id}-${lever.id}`}
                      value={option.value}
                      checked={levers.value[lever.id] === option.value}
                      onChange={() => {
                        setLever(lever.id, option.value);
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div class="player__stage">
        <div class="player__drawing">
          <SchematicPair
            systemId={`${stageId}-player`}
            title={`${systemName} while ${flow.name.toLowerCase()} runs`}
            description={flow.summary}
            nodes={nodes}
            edges={edges}
            activity={activity}
            activeEdge={simulation.state.activeEdge}
            packets={packets}
          />
          {statusRow}
        </div>
        {ledger}
      </div>
      <p class="sr-only" aria-live="polite">
        {playback.announcement}
      </p>
    </div>
  );
};
