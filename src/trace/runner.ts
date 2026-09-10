import type { Flow, Lever, Step, Tone } from '../systems/schema';
import {
  createSimulation,
  type LogEntry,
  type Scenario,
  type Simulation,
} from './kernel/simulation';

export type LeverValues = Readonly<Record<string, string>>;

interface TraceState {
  readonly completed: number;
  readonly total: number;
  readonly activeNode?: string;
  readonly activeEdge?: string;
  readonly statuses: Readonly<Record<string, string>>;
}

interface StepEvent {
  readonly step: Step;
  readonly travel: number;
}

export type TraceSimulation = Simulation<TraceState>;

type EdgeEndpoints = ReadonlyMap<string, { from: string; to: string }>;

export const defaultLeverValues = (levers: readonly Lever[]): LeverValues =>
  Object.fromEntries(levers.map((lever) => [lever.id, lever.defaultValue]));

const satisfies = (step: Step, values: LeverValues): boolean =>
  step.when.every((condition) => values[condition.lever] === condition.value);

export const selectSteps = (flow: Flow, values: LeverValues): Step[] =>
  flow.steps
    .filter((step) => satisfies(step, values))
    .sort((first, second) => first.at - second.at);

const minimumTravel = 240;
const maximumTravel = 1200;

const travelBetween = (current: Step, next: Step | undefined): number => {
  if (next === undefined) {
    return minimumTravel;
  }
  return Math.min(maximumTravel, Math.max(minimumTravel, next.at - current.at));
};

const stationFor = (step: Step, flow: Flow): string => step.node ?? step.edge ?? flow.id;

const createFlowScenario = (
  flow: Flow,
  edgeEndpoints: EdgeEndpoints,
): Scenario<TraceState, StepEvent, LeverValues> => ({
  defaultLevers: defaultLeverValues(flow.levers),
  initialState: (values) => ({
    completed: 0,
    total: selectSteps(flow, values).length,
    statuses: {},
  }),
  boot: (context, values) => {
    const steps = selectSteps(flow, values);
    steps.forEach((step, index) => {
      context.schedule(step.at, { step, travel: travelBetween(step, steps[index + 1]) });
    });
  },
  handle: (state, event, context) => {
    const { step, travel } = event;
    context.log(stationFor(step, flow), step.tone, step.ledger);
    const endpoints = step.edge === undefined ? undefined : edgeEndpoints.get(step.edge);
    if (endpoints !== undefined) {
      context.send(endpoints.from, endpoints.to, step.tone, travel, step.edge);
    }
    const statuses =
      step.status === undefined
        ? state.statuses
        : { ...state.statuses, [step.status.machine]: step.status.value };
    return {
      completed: state.completed + 1,
      total: state.total,
      activeNode: step.node ?? endpoints?.to ?? state.activeNode,
      activeEdge: step.edge,
      statuses,
    };
  },
});

export interface FlowRunOptions {
  readonly levers?: LeverValues;
}

export const createFlowSimulation = (
  flow: Flow,
  edgeEndpoints: EdgeEndpoints,
  options: FlowRunOptions = {},
): TraceSimulation => createSimulation(createFlowScenario(flow, edgeEndpoints), options.levers);

export const runTranscript = (
  flow: Flow,
  edgeEndpoints: EdgeEndpoints,
  options: FlowRunOptions = {},
): LogEntry[] => {
  const simulation = createFlowSimulation(flow, edgeEndpoints, options);
  while (simulation.step()) {
    continue;
  }
  return [...simulation.log];
};

export interface PacketOnEdge {
  readonly edge: string;
  readonly progress: number;
  readonly tone: Tone;
}

interface DrawnEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface PacketOptions {
  // Reduced motion: a packet sits at its origin, then appears at its destination, never between.
  readonly snap?: boolean;
}

// The packets still in flight, placed on the edge they travel: by the edge the step named when
// there is one, by endpoints otherwise.
export const packetsOn = (
  simulation: TraceSimulation,
  edges: readonly DrawnEdge[],
  options: PacketOptions = {},
): PacketOnEdge[] =>
  simulation.packets
    .filter((packet) => packet.arrivesAt > simulation.now)
    .flatMap((packet) => {
      const edge =
        edges.find((candidate) => candidate.id === packet.via) ??
        edges.find((candidate) => candidate.from === packet.from && candidate.to === packet.to);
      if (edge === undefined) {
        return [];
      }
      const progress =
        (simulation.now - packet.departedAt) / Math.max(1, packet.arrivesAt - packet.departedAt);
      return [
        {
          edge: edge.id,
          progress: options.snap === true ? Math.round(progress) : progress,
          tone: packet.tone,
        },
      ];
    });
