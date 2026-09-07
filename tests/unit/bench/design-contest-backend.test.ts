import { describe, expect, it } from 'vitest';
import { assertDefinitionIsConsistent } from '../../../src/bench/core/definition';
import { transcriptOf } from '../../../src/bench/core/demonstration';
import { createSimulation } from '../../../src/bench/core/simulation';
import {
  definition,
  demonstration,
  present,
  scenario,
  type Levers,
} from '../../../src/bench/scenarios/design-contest-backend';

const start = (levers: Partial<Levers> = {}, seed = 3) =>
  createSimulation(scenario, { seed, levers });

describe('design contest vote race', () => {
  it('has a consistent bench definition', () => {
    expect(() => {
      assertDefinitionIsConsistent(definition);
    }).not.toThrow();
  });

  it('loses updates under read-modify-write with fifty concurrent votes', () => {
    const simulation = start();
    simulation.dispatch({ type: 'cast' });
    simulation.advance(2000);
    const [burst] = simulation.state.bursts;
    expect(burst?.cast).toBe(50);
    expect(burst?.counted).toBeLessThan(50);
    expect(simulation.state.counter).toBe(burst?.counted);
    expect(simulation.log.at(-1)?.message).toMatch(/updates lost$/);
    expect(present(simulation.state, simulation.levers).headline).toMatch(/lost/);
  });

  it('counts every vote with an atomic increment', () => {
    const simulation = start({ writeMode: 'atomic-increment', burst: '200' });
    simulation.dispatch({ type: 'cast' });
    simulation.advance(2000);
    expect(simulation.state.counter).toBe(200);
    expect(simulation.state.bursts[0]?.counted).toBe(200);
    expect(simulation.log.at(-1)?.message).toMatch(/nothing lost$/);
  });

  it('refuses to mint from the API and mints through the signer', () => {
    const simulation = start();
    simulation.dispatch({ type: 'mint-from-api' });
    expect(simulation.log.at(-1)?.tone).toBe('refused');
    simulation.dispatch({ type: 'mint' });
    simulation.advance(6000);
    expect(simulation.state.mints).toBe(1);
    const messages = simulation.log.map((entry) => entry.message);
    expect(
      messages.some((message) => message.startsWith('signs the mint with the owner key')),
    ).toBe(true);
    expect(messages.at(-1)).toMatch(/token minted/);
  });

  it('runs its demonstration deterministically', () => {
    const first = transcriptOf(scenario, demonstration);
    const second = transcriptOf(scenario, demonstration);
    expect(first.entries).toEqual(second.entries);
    expect(first.entries.map((entry) => entry.message)).toContain(
      'refused · no key here · only the signer can mint',
    );
  });
});
