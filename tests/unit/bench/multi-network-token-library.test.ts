import { describe, expect, it } from 'vitest';
import { assertDefinitionIsConsistent } from '../../../src/bench/core/definition';
import { transcriptOf } from '../../../src/bench/core/demonstration';
import { createSimulation } from '../../../src/bench/core/simulation';
import {
  definition,
  demonstration,
  present,
  scenario,
} from '../../../src/bench/scenarios/multi-network-token-library';

describe('multi-network token library', () => {
  it('has a consistent bench definition', () => {
    expect(() => {
      assertDefinitionIsConsistent(definition);
    }).not.toThrow();
  });

  it('dispatches a read to the implementation for the network named by the input', () => {
    const simulation = createSimulation(scenario, { seed: 1 });
    simulation.dispatch({ type: 'read', reading: 'total-supply' });
    simulation.advance(1000);
    const [call] = simulation.state.calls;
    expect(call?.answeredBy).toBe('Polygon implementation');
    expect(call?.tone).toBe('ok');
    expect(simulation.log.at(-1)?.message).toMatch(/core untouched$/);
  });

  it('answers Bitcoin through a different implementation behind the same interface', () => {
    const simulation = createSimulation(scenario, { seed: 1, levers: { network: 'bitcoin' } });
    simulation.dispatch({ type: 'read', reading: 'total-supply' });
    simulation.advance(2000);
    expect(simulation.state.calls[0]?.result).toMatch(/read from the chain/);
    expect(present(simulation.state, simulation.levers).headline).toMatch(/no contracts/);
  });

  it('refuses an unregistered network, then serves it once registered without touching the core', () => {
    const simulation = createSimulation(scenario, { seed: 1, levers: { network: 'bnb' } });
    simulation.dispatch({ type: 'read', reading: 'balance-of' });
    expect(simulation.state.calls[0]?.tone).toBe('refused');
    expect(simulation.log.at(-1)?.tone).toBe('refused');
    simulation.dispatch({ type: 'register' });
    simulation.dispatch({ type: 'read', reading: 'balance-of' });
    simulation.advance(1000);
    expect(simulation.state.calls[1]?.tone).toBe('ok');
    expect(simulation.state.coreLinesChanged).toBe(0);
    expect(simulation.state.registered).toHaveLength(4);
    const view = present(simulation.state, simulation.levers);
    expect(view.stations.bnb?.badge).toBe('registered');
    expect(view.meters[0]?.value).toBe(0);
  });

  it('runs its demonstration deterministically', () => {
    const first = transcriptOf(scenario, demonstration);
    const second = transcriptOf(scenario, demonstration);
    expect(first.entries).toEqual(second.entries);
    expect(first.entries.some((entry) => entry.tone === 'refused')).toBe(true);
  });
});
