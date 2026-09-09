import { useSignal } from '@preact/signals';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { Flow, SystemEdge, SystemNode, Tone } from '../../systems/schema';
import {
  createFlowSimulation,
  defaultLeverValues,
  selectSteps,
  type LeverValues,
  type TraceSimulation,
} from '../../trace/runner';
import { useMediaQuery } from '../explorer/use-media-query';
import { Schematic, type Packet } from '../schematic/Schematic';
import { formatClock } from './format';
import { Ledger } from './Ledger';

export interface FlowPlayerProps {
  readonly systemId: string;
  readonly title: string;
  readonly description: string;
  readonly nodes: readonly SystemNode[];
  readonly edges: readonly SystemEdge[];
  readonly flow: Flow;
  readonly autoplay?: boolean;
}

const frameCap = 100;
const tail = 600;

const endOf = (flow: Flow, values: LeverValues): number => {
  const steps = selectSteps(flow, values);
  const last = steps[steps.length - 1];
  return (last?.at ?? 0) + tail;
};

export const FlowPlayer = ({
  systemId,
  title,
  description,
  nodes,
  edges,
  flow,
  autoplay = false,
}: FlowPlayerProps) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
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

  const reset = (nextLevers: LeverValues = levers.value) => {
    stop();
    simulationReference.current = createFlowSimulation(flow, endpoints, { levers: nextLevers });
    announcement.value = '';
    refresh();
  };

  const advanceTo = (target: number) => {
    const current = simulationReference.current;
    if (target < current.now) {
      reset();
    }
    const fresh = simulationReference.current;
    fresh.advance(Math.max(0, target - fresh.now));
    refresh();
  };

  const frame = (timestamp: number) => {
    const previous = lastFrameReference.current ?? timestamp;
    lastFrameReference.current = timestamp;
    const delta = Math.min(frameCap, timestamp - previous);
    const current = simulationReference.current;
    current.advance(delta);
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

  const setLever = (id: string, value: string) => {
    const next = { ...levers.value, [id]: value };
    levers.value = next;
    reset(next);
  };

  useEffect(() => {
    ready.value = true;
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (
      autoplay &&
      !reducedMotion &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      play();
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
    // The player starts once; levers and reduced motion are read at that moment.
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
    .map((packet) => {
      const edge = edges.find(
        (candidate) => candidate.from === packet.from && candidate.to === packet.to,
      );
      return {
        edge: edge?.id ?? '',
        progress:
          (simulation.now - packet.departedAt) / Math.max(1, packet.arrivesAt - packet.departedAt),
        tone: packet.tone,
      };
    })
    .filter((packet) => packet.edge !== '');
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
          <button
            type="button"
            class="control"
            onClick={() => {
              reset();
            }}
          >
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
            <fieldset key={lever.id} class="lever">
              <legend class="kicker">{lever.label}</legend>
              <div class="lever__options">
                {lever.options.map((option) => (
                  <label key={option.value} class="lever__option">
                    <input
                      type="radio"
                      name={`${flow.id}-${lever.id}`}
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
          <Schematic
            systemId={`${systemId}-${flow.id}`}
            title={title}
            description={description}
            nodes={nodes}
            edges={edges}
            orientation="horizontal"
            activity={activity}
            activeEdge={simulation.state.activeEdge}
            packets={packets}
          />
          <Schematic
            systemId={`${systemId}-${flow.id}`}
            title={title}
            description={description}
            nodes={nodes}
            edges={edges}
            orientation="vertical"
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
