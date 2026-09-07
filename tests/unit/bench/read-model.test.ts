import { describe, expect, it } from 'vitest';
import { createSimulation } from '../../../src/bench/core/simulation';
import { present, scenario } from '../../../src/bench/scenarios/ipaas-admin-indicators';

describe('read-model worker chains', () => {
  it('keeps exactly one write chain per worker after boot', () => {
    const simulation = createSimulation(scenario, { seed: 4 });
    expect(simulation.pending()).toBe(4);
    simulation.advance(10_000);
    expect(simulation.pending()).toBe(4);
    const view = present(simulation.state, simulation.levers);
    expect(view.meters[0]?.value).toBeLessThanOrEqual((view.meters[0]?.maximum ?? 0) * 1.05);
  });

  it('adds and retires chains without duplicates when the lever flaps', () => {
    const simulation = createSimulation(scenario, { seed: 4, levers: { workers: '8' } });
    simulation.advance(3000);
    simulation.setLever('workers', '1');
    simulation.advance(100);
    simulation.setLever('workers', '8');
    simulation.advance(5000);
    expect(simulation.pending()).toBe(8);
    expect(simulation.state.liveWorkers).toHaveLength(8);
  });

  it('shows the workers slowing down while the execution store is scanned', () => {
    const simulation = createSimulation(scenario, {
      seed: 4,
      levers: { source: 'execution-store' },
    });
    simulation.advance(8000);
    simulation.dispatch({ type: 'query', kind: 'usage' });
    let faulted = false;
    for (let sample = 0; sample < 40; sample += 1) {
      simulation.advance(100);
      const view = present(simulation.state, simulation.levers);
      if (view.meters[0]?.tone === 'fault') {
        faulted = true;
        break;
      }
    }
    expect(faulted).toBe(true);
    simulation.advance(6000);
    const settled = present(simulation.state, simulation.levers);
    expect(settled.stations.executions?.tone).toBe('neutral');
    expect(settled.meters[0]?.tone).toBe('ok');
  });
});
