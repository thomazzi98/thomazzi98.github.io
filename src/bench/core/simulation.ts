import { createRandom, type Random } from './random';
import { createScheduler } from './scheduler';

export type Tone = 'neutral' | 'ok' | 'pending' | 'fault' | 'refused';

export interface LogEntry {
  sequence: number;
  at: number;
  station: string;
  tone: Tone;
  message: string;
}

export const leverStation = 'lever';

export interface Packet {
  id: number;
  from: string;
  to: string;
  tone: Tone;
  departedAt: number;
  arrivesAt: number;
}

export interface StepContext<Event> {
  readonly now: number;
  readonly random: Random;
  schedule(delay: number, event: Event): void;
  log(station: string, tone: Tone, message: string): void;
  send(from: string, destination: string, tone: Tone, travel: number): void;
}

export interface Scenario<State, Event, Levers> {
  id: string;
  defaultLevers: Levers;
  initialState(levers: Levers): State;
  boot(context: StepContext<Event>, levers: Levers): void;
  handle(state: State, event: Event, context: StepContext<Event>, levers: Levers): State;
}

export interface SimulationOptions<Levers> {
  seed?: number;
  levers?: Partial<Levers>;
}

export interface Simulation<State, Event, Levers> {
  readonly scenario: Scenario<State, Event, Levers>;
  readonly state: State;
  readonly levers: Levers;
  readonly now: number;
  readonly log: readonly LogEntry[];
  readonly packets: readonly Packet[];
  readonly seed: number;
  dispatch(event: Event): void;
  setLever<Name extends keyof Levers>(name: Name, value: Levers[Name]): void;
  step(): boolean;
  advance(duration: number): number;
  pending(): number;
  subscribe(listener: () => void): () => void;
}

const logLimit = 400;

export const createSimulation = <State, Event, Levers extends object>(
  scenario: Scenario<State, Event, Levers>,
  options: SimulationOptions<Levers> = {},
): Simulation<State, Event, Levers> => {
  const seed = options.seed ?? 1;
  const random = createRandom(seed);
  const scheduler = createScheduler<Event>();
  const log: LogEntry[] = [];
  const packets: Packet[] = [];
  const listeners = new Set<() => void>();
  let levers: Levers = { ...scenario.defaultLevers, ...options.levers };
  let state = scenario.initialState(levers);
  let now = 0;
  let packetSequence = 0;
  let logSequence = 0;

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const context: StepContext<Event> = {
    get now() {
      return now;
    },
    random,
    schedule: (delay, event) => {
      scheduler.schedule(now + Math.max(0, delay), event);
    },
    log: (station, tone, message) => {
      record(station, tone, message);
    },
    send: (from, destination, tone, travel) => {
      packets.push({
        id: packetSequence++,
        from,
        to: destination,
        tone,
        departedAt: now,
        arrivesAt: now + travel,
      });
    },
  };

  const record = (station: string, tone: Tone, message: string): void => {
    logSequence += 1;
    log.push({ sequence: logSequence, at: now, station, tone, message });
    if (log.length > logLimit) {
      log.splice(0, log.length - logLimit);
    }
  };

  const forgetArrivedPackets = (): void => {
    const horizon = now - 1;
    let index = packets.length;
    while (index > 0) {
      index -= 1;
      const packet = packets[index];
      if (packet !== undefined && packet.arrivesAt < horizon) {
        packets.splice(index, 1);
      }
    }
  };

  const process = (event: Event): void => {
    state = scenario.handle(state, event, context, levers);
  };

  const processNext = (): boolean => {
    const next = scheduler.take();
    if (next === undefined) {
      return false;
    }
    now = Math.max(now, next.at);
    process(next.event);
    forgetArrivedPackets();
    return true;
  };

  const step = (): boolean => {
    const processed = processNext();
    notify();
    return processed;
  };

  scenario.boot(context, levers);

  return {
    scenario,
    get state() {
      return state;
    },
    get levers() {
      return levers;
    },
    get now() {
      return now;
    },
    log,
    packets,
    seed,
    dispatch: (event) => {
      process(event);
      notify();
    },
    setLever: (name, value) => {
      levers = { ...levers, [name]: value };
      record(leverStation, 'neutral', `${String(name)} → ${String(value)}`);
      notify();
    },
    step,
    advance: (duration) => {
      const until = now + duration;
      let processed = 0;
      for (;;) {
        const next = scheduler.peek();
        if (next === undefined || next.at > until) {
          break;
        }
        processNext();
        processed += 1;
      }
      now = until;
      forgetArrivedPackets();
      notify();
      return processed;
    },
    pending: () => scheduler.size(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
