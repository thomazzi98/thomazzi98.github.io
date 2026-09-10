import { describe, expect, it } from 'vitest';
import { createScheduler } from '../../../src/trace/kernel/scheduler';
import { createSimulation, type Scenario } from '../../../src/trace/kernel/simulation';

describe('createScheduler', () => {
  it('releases events by time, then by insertion order', () => {
    const scheduler = createScheduler<string>();
    scheduler.schedule(30, 'late');
    scheduler.schedule(10, 'first');
    scheduler.schedule(10, 'second');
    scheduler.schedule(20, 'middle');
    expect(scheduler.size()).toBe(4);
    expect(scheduler.peek()?.event).toBe('first');
    expect(['first', 'second', 'middle', 'late'].map(() => scheduler.take()?.event)).toEqual([
      'first',
      'second',
      'middle',
      'late',
    ]);
    expect(scheduler.take()).toBeUndefined();
  });
});

interface CounterState {
  count: number;
}
interface CounterEvent {
  type: 'tick';
}
interface CounterLevers {
  interval: number;
}

const counterScenario: Scenario<CounterState, CounterEvent, CounterLevers> = {
  defaultLevers: { interval: 100 },
  initialState: () => ({ count: 0 }),
  boot: (context, levers) => {
    context.schedule(levers.interval, { type: 'tick' });
  },
  handle: (state, event, context, levers) => {
    context.log('counter', 'ok', event.type);
    context.send('clock', 'counter', 'ok', 10, 'clock-counter');
    context.schedule(levers.interval, { type: 'tick' });
    return { count: state.count + 1 };
  },
};

describe('createSimulation', () => {
  it('advances virtual time and processes due events in order', () => {
    const simulation = createSimulation(counterScenario);
    expect(simulation.advance(350)).toBe(3);
    expect(simulation.state.count).toBe(3);
    expect(simulation.now).toBe(350);
    expect(simulation.pending()).toBe(1);
  });

  it('steps one event at a time for the reduced-motion mode', () => {
    const simulation = createSimulation(counterScenario);
    expect(simulation.step()).toBe(true);
    expect(simulation.now).toBe(100);
    expect(simulation.state.count).toBe(1);
  });

  it('takes lever overrides at creation', () => {
    const simulation = createSimulation(counterScenario, { interval: 50 });
    simulation.advance(100);
    expect(simulation.state.count).toBe(2);
  });

  it('logs with the virtual clock and keeps a packet, with its edge, until it has arrived', () => {
    const simulation = createSimulation(counterScenario);
    simulation.advance(100);
    expect(simulation.log).toEqual([
      { sequence: 1, at: 100, station: 'counter', tone: 'ok', message: 'tick' },
    ]);
    expect(simulation.packets).toEqual([
      {
        id: 0,
        from: 'clock',
        to: 'counter',
        via: 'clock-counter',
        tone: 'ok',
        departedAt: 100,
        arrivesAt: 110,
      },
    ]);
    simulation.advance(50);
    expect(simulation.packets).toHaveLength(0);
  });

  it('produces identical transcripts across runs', () => {
    const transcript = () => {
      const simulation = createSimulation(counterScenario);
      simulation.advance(1000);
      return simulation.log.map((entry) => `${String(entry.at)}:${entry.message}`);
    };
    expect(transcript()).toEqual(transcript());
    expect(transcript()).toHaveLength(10);
  });
});
