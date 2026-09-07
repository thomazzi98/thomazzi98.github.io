import { describe, expect, it } from 'vitest';
import { createRandom, seedFromText } from '../../../src/bench/core/random';
import { createScheduler } from '../../../src/bench/core/scheduler';
import { createSimulation, type Scenario } from '../../../src/bench/core/simulation';

describe('createRandom', () => {
  it('is deterministic for a seed and different across seeds', () => {
    const first = createRandom(7);
    const second = createRandom(7);
    const third = createRandom(8);
    const sequence = [first.next(), first.next(), first.next()];
    expect([second.next(), second.next(), second.next()]).toEqual(sequence);
    expect(third.next()).not.toBe(sequence[0]);
  });

  it('stays inside the requested range and picks from a list', () => {
    const random = createRandom(3);
    for (let round = 0; round < 200; round += 1) {
      const value = random.between(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
    expect(['a', 'b', 'c']).toContain(random.pick(['a', 'b', 'c']));
    expect(() => random.pick([])).toThrow(RangeError);
  });

  it('hashes text to a stable seed', () => {
    expect(seedFromText('queued-bank-onboarding')).toBe(seedFromText('queued-bank-onboarding'));
    expect(seedFromText('a')).not.toBe(seedFromText('b'));
  });
});

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
type CounterEvent = { type: 'tick' } | { type: 'reset' };
interface CounterLevers {
  interval: number;
}

const counterScenario: Scenario<CounterState, CounterEvent, CounterLevers> = {
  id: 'counter',
  defaultLevers: { interval: 100 },
  initialState: () => ({ count: 0 }),
  boot: (context, levers) => {
    context.schedule(levers.interval, { type: 'tick' });
  },
  handle: (state, event, context, levers) => {
    if (event.type === 'reset') {
      context.log('counter', 'neutral', 'reset');
      return { count: 0 };
    }
    context.send('clock', 'counter', 'ok', 10);
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

  it('applies lever changes to events scheduled afterwards', () => {
    const simulation = createSimulation(counterScenario, { levers: { interval: 50 } });
    simulation.advance(100);
    expect(simulation.state.count).toBe(2);
    simulation.setLever('interval', 500);
    simulation.advance(1000);
    expect(simulation.state.count).toBe(4);
  });

  it('dispatches external events, logs, tracks packets and notifies subscribers', () => {
    const simulation = createSimulation(counterScenario);
    let notifications = 0;
    const unsubscribe = simulation.subscribe(() => {
      notifications += 1;
    });
    simulation.advance(100);
    expect(simulation.packets).toHaveLength(1);
    simulation.dispatch({ type: 'reset' });
    expect(simulation.state.count).toBe(0);
    expect(simulation.log.at(-1)).toEqual({
      at: 100,
      station: 'counter',
      tone: 'neutral',
      message: 'reset',
    });
    unsubscribe();
    simulation.advance(100);
    expect(notifications).toBe(2);
    expect(simulation.packets).toHaveLength(1);
  });

  it('produces identical transcripts for the same seed', () => {
    const transcript = (seed: number) => {
      const simulation = createSimulation(counterScenario, { seed });
      simulation.advance(1000);
      return simulation.log.map((entry) => `${String(entry.at)}:${entry.message}`);
    };
    expect(transcript(42)).toEqual(transcript(42));
  });
});
