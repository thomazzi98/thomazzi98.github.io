import { createScheduler } from './scheduler';

export type Tone = 'neutral' | 'ok' | 'wait' | 'fault' | 'unknown' | 'flight';

export interface LogEntry {
  sequence: number;
  at: number;
  station: string;
  tone: Tone;
  message: string;
}

export interface Packet {
  id: number;
  from: string;
  to: string;
  // The edge the packet travels when the scenario knows it; parallel edges share endpoints.
  via?: string;
  tone: Tone;
  departedAt: number;
  arrivesAt: number;
}

export interface StepContext<Event> {
  readonly now: number;
  schedule(delay: number, event: Event): void;
  log(station: string, tone: Tone, message: string): void;
  send(from: string, destination: string, tone: Tone, travel: number, via?: string): void;
}

export interface Scenario<State, Event, Levers> {
  defaultLevers: Levers;
  initialState(levers: Levers): State;
  boot(context: StepContext<Event>, levers: Levers): void;
  handle(state: State, event: Event, context: StepContext<Event>, levers: Levers): State;
}

export interface Simulation<State> {
  readonly state: State;
  readonly now: number;
  readonly log: readonly LogEntry[];
  readonly packets: readonly Packet[];
  step(): boolean;
  advance(duration: number): number;
  pending(): number;
}

const logLimit = 400;

export const createSimulation = <State, Event, Levers extends object>(
  scenario: Scenario<State, Event, Levers>,
  leverOverrides: Partial<Levers> = {},
): Simulation<State> => {
  const scheduler = createScheduler<Event>();
  const log: LogEntry[] = [];
  const packets: Packet[] = [];
  const levers: Levers = { ...scenario.defaultLevers, ...leverOverrides };
  let state = scenario.initialState(levers);
  let now = 0;
  let packetSequence = 0;
  let logSequence = 0;

  const context: StepContext<Event> = {
    get now() {
      return now;
    },
    schedule: (delay, event) => {
      scheduler.schedule(now + Math.max(0, delay), event);
    },
    log: (station, tone, message) => {
      logSequence += 1;
      log.push({ sequence: logSequence, at: now, station, tone, message });
      if (log.length > logLimit) {
        log.splice(0, log.length - logLimit);
      }
    },
    send: (from, destination, tone, travel, via) => {
      packets.push({
        id: packetSequence++,
        from,
        to: destination,
        via,
        tone,
        departedAt: now,
        arrivesAt: now + travel,
      });
    },
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

  const applyEvent = (event: Event): void => {
    state = scenario.handle(state, event, context, levers);
  };

  const processNext = (): boolean => {
    const next = scheduler.take();
    if (next === undefined) {
      return false;
    }
    now = Math.max(now, next.at);
    applyEvent(next.event);
    forgetArrivedPackets();
    return true;
  };

  scenario.boot(context, levers);

  return {
    get state() {
      return state;
    },
    get now() {
      return now;
    },
    log,
    packets,
    step: processNext,
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
      return processed;
    },
    pending: () => scheduler.size(),
  };
};
