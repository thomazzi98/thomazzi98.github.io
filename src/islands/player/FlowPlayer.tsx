import { useSignal } from '@preact/signals';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { Flow, Tone } from '../../systems/schema';
import {
  createFlowSimulation,
  defaultLeverValues,
  selectSteps,
  type LeverValues,
  type TraceSimulation,
} from '../../trace/runner';
import { useMediaQuery } from '../explorer/use-media-query';
import type { Packet, SchematicEdge, SchematicNode } from '../schematic/Schematic';
import { SchematicPair } from '../schematic/SchematicPair';
import { formatClock } from './format';
import { Ledger } from './Ledger';

export interface FlowPlayerProps {
  readonly systemId: string;
  readonly systemName: string;
  readonly nodes: readonly SchematicNode[];
  readonly edges: readonly SchematicEdge[];
  readonly flows: readonly Flow[];
  readonly autoplay?: boolean;
}

const frameCap = 100;
const tail = 600;

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

export const FlowPlayer = ({
  systemId,
  systemName,
  nodes,
  edges,
  flows,
  autoplay = false,
}: FlowPlayerProps) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const flowId = useSignal(firstFlow(flows).id);
  const flow = flows.find((candidate) => candidate.id === flowId.value) ?? firstFlow(flows);
  const levers = useSignal<LeverValues>(defaultLeverValues(flow.levers));
  const version = useSignal(0);
  const playing = useSignal(false);
  const announcement = useSignal('');
  const ready = useSignal(false);
  const endpoints = useMemo(
    () => new Map(edges.map((edge) => [edge.id, { from: edge.from, to: edge.to }])),
    [edges],
  );
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      map.set(node.id, node.label);
    }
    for (const edge of edges) {
      map.set(edge.id, edge.label);
    }
    return map;
  }, [nodes, edges]);
  const simulationReference = useRef<TraceSimulation>(
    createFlowSimulation(flow, endpoints, { levers: levers.value }),
  );
  const frameReference = useRef<number | undefined>(undefined);
  const lastFrameReference = useRef<number | undefined>(undefined);

  const simulation = simulationReference.current;
  const end = endOf(flow, levers.value);
  const finished = simulation.pending() === 0 && simulation.now >= end;

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

  const restart = (nextFlow: Flow, nextLevers: LeverValues) => {
    stop();
    simulationReference.current = createFlowSimulation(nextFlow, endpoints, {
      levers: nextLevers,
    });
    announcement.value = '';
    refresh();
  };

  const reset = () => {
    restart(flow, levers.value);
  };

  const advanceTo = (target: number) => {
    if (target < simulationReference.current.now) {
      reset();
    }
    const current = simulationReference.current;
    current.advance(Math.max(0, target - current.now));
    refresh();
  };

  const frame = (timestamp: number) => {
    const previous = lastFrameReference.current ?? timestamp;
    lastFrameReference.current = timestamp;
    const current = simulationReference.current;
    current.advance(Math.min(frameCap, timestamp - previous));
    refresh();
    if (current.now >= endOf(flow, levers.value) && current.pending() === 0) {
      stop();
      announcement.value = `${flow.name} finished at ${formatClock(current.now)}.`;
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

  const step = () => {
    stop();
    const current = simulationReference.current;
    const advanced = current.step();
    const latest = current.log[current.log.length - 1];
    announcement.value =
      advanced && latest !== undefined ? latest.message : `${flow.name} finished.`;
    refresh();
  };

  const playLabel = (): string => {
    if (playing.value) {
      return 'Pause';
    }
    return finished ? 'Replay' : 'Play';
  };

  const selectFlow = (id: string) => {
    const next = flows.find((candidate) => candidate.id === id);
    if (next === undefined) {
      return;
    }
    flowId.value = next.id;
    const nextLevers = defaultLeverValues(next.levers);
    levers.value = nextLevers;
    restart(next, nextLevers);
  };

  const setLever = (id: string, value: string) => {
    const next = { ...levers.value, [id]: value };
    levers.value = next;
    restart(flow, next);
  };

  useEffect(() => {
    ready.value = true;
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      play();
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
    // The player starts once; reduced motion is read at that moment.
  }, []);

  const revision = version.value;
  const activity: Record<string, Tone> = {};
  const activeNode = simulation.state.activeNode;
  const latestTone = simulation.log[simulation.log.length - 1]?.tone ?? 'neutral';
  if (activeNode !== undefined) {
    activity[activeNode] = latestTone;
  }
  const packets: Packet[] = simulation.packets
    .filter((packet) => packet.arrivesAt > simulation.now)
    .flatMap((packet) => {
      const edge = edges.find(
        (candidate) => candidate.from === packet.from && candidate.to === packet.to,
      );
      if (edge === undefined) {
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
  const statuses = Object.entries(simulation.state.statuses);
  const labelFor = (station: string) => labels.get(station) ?? station;

  return (
    <div
      class="player"
      data-flow={flow.id}
      data-ready={ready.value ? 'true' : 'false'}
      data-running={playing.value ? 'true' : 'false'}
      data-revision={revision}
    >
      {flows.length > 1 && (
        <fieldset class="lever player__flows">
          <legend class="kicker">Flow</legend>
          <div class="lever__options">
            {flows.map((candidate) => (
              <label key={candidate.id} class="lever__option">
                <input
                  type="radio"
                  name={`${systemId}-flow`}
                  value={candidate.id}
                  checked={candidate.id === flow.id}
                  onChange={() => {
                    selectFlow(candidate.id);
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
        <span class="player__lamp badge" data-tone={playing.value ? 'wait' : 'neutral'}>
          simulation
        </span>
        <output class="player__clock mono" aria-label="Virtual clock" data-clock>
          {formatClock(simulation.now)}
        </output>
        <span class="kicker player__progress">
          {String(simulation.state.completed)} of {String(simulation.state.total)} steps
        </span>
        <div class="player__buttons">
          {!reducedMotion && (
            <button type="button" class="control" onClick={play} aria-pressed={playing.value}>
              {playLabel()}
            </button>
          )}
          <button type="button" class="control" onClick={step} disabled={finished}>
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
            value={Math.min(end, simulation.now)}
            onInput={(event) => {
              stop();
              advanceTo(Number(event.currentTarget.value));
            }}
          />
        </label>
        {reducedMotion && (
          <p class="player__note kicker">Reduced motion: nothing moves until you press Step.</p>
        )}
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
                      name={`${systemId}-${flow.id}-${lever.id}`}
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
            systemId={`${systemId}-player`}
            title={`${systemName} while ${flow.name.toLowerCase()} runs`}
            description={flow.summary}
            nodes={nodes}
            edges={edges}
            activity={activity}
            activeEdge={simulation.state.activeEdge}
            packets={packets}
          />
          {statuses.length > 0 && (
            <dl class="player__statuses">
              {statuses.map(([machine, value]) => (
                <div key={machine} class="player__status">
                  <dt class="kicker">{machine}</dt>
                  <dd class="badge" data-tone={latestTone}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <Ledger entries={simulation.log} total={simulation.state.total} labelFor={labelFor} />
      </div>
      <p class="sr-only" aria-live="polite">
        {announcement.value}
      </p>
    </div>
  );
};
