import { describe, expect, it } from 'vitest';
import { assertDefinitionIsConsistent } from '../../../src/bench/core/definition';
import { transcriptOf } from '../../../src/bench/core/demonstration';
import { createSimulation } from '../../../src/bench/core/simulation';
import * as boundary from '../../../src/bench/scenarios/contract-backend-boundary';
import * as readModel from '../../../src/bench/scenarios/ipaas-admin-indicators';

describe('integration platform read model', () => {
  it('has a consistent bench definition', () => {
    expect(() => {
      assertDefinitionIsConsistent(readModel.definition);
    }).not.toThrow();
  });

  it('keeps worker throughput when reports read the reference collection', () => {
    const simulation = createSimulation(readModel.scenario, { seed: 4 });
    simulation.advance(6000);
    const before = simulation.state.executions;
    simulation.dispatch({ type: 'query', kind: 'count-running' });
    simulation.advance(2000);
    const [query] = simulation.state.queries;
    expect(query?.writesSlowed).toBe(false);
    expect(query?.duration).toBeLessThan(80);
    expect(simulation.state.executions - before).toBeGreaterThanOrEqual(8);
    expect(simulation.log.at(-1)?.message).toMatch(/did not notice/);
  });

  it('scans the execution store slowly and slows the workers meanwhile', () => {
    const fast = createSimulation(readModel.scenario, { seed: 4 });
    fast.advance(6000);
    fast.advance(2500);
    const undisturbed = fast.state.executions;

    const slow = createSimulation(readModel.scenario, {
      seed: 4,
      levers: { source: 'execution-store' },
    });
    slow.advance(6000);
    slow.dispatch({ type: 'query', kind: 'usage' });
    slow.advance(2500);
    const [query] = slow.state.queries;
    expect(query?.writesSlowed).toBe(true);
    expect(query?.duration).toBeGreaterThan(500);
    expect(slow.state.executions).toBeLessThan(undisturbed);
    expect(slow.log.at(-1)?.message).toMatch(/slowed worker writes/);
  });

  it('adds and removes workers when the lever moves', () => {
    const simulation = createSimulation(readModel.scenario, { seed: 4, levers: { workers: '1' } });
    simulation.advance(4000);
    const withOne = simulation.state.executions;
    simulation.setLever('workers', '8');
    simulation.advance(4000);
    expect(simulation.state.executions - withOne).toBeGreaterThan(withOne * 3);
    const view = readModel.present(simulation.state, simulation.levers);
    expect(view.stations.workers?.badge).toBe('×8');
  });

  it('runs its demonstration deterministically', () => {
    const first = transcriptOf(readModel.scenario, readModel.demonstration);
    const second = transcriptOf(readModel.scenario, readModel.demonstration);
    expect(first.entries).toEqual(second.entries);
  });
});

describe('contract backend boundary', () => {
  it('has a consistent bench definition', () => {
    expect(() => {
      assertDefinitionIsConsistent(boundary.definition);
    }).not.toThrow();
  });

  it('keeps the key on the server, upgrades without a front-end release, and exposes nothing', () => {
    const simulation = createSimulation(boundary.scenario, { seed: 2 });
    simulation.dispatch({ type: 'act', action: 'view-source' });
    simulation.dispatch({ type: 'act', action: 'operator-allocate' });
    simulation.dispatch({ type: 'act', action: 'upgrade-contract' });
    simulation.advance(2000);
    expect(simulation.state.exposures).toBe(0);
    expect(simulation.state.frontEndReleases).toBe(0);
    expect(simulation.state.contractVersion).toBe(2);
    expect(simulation.state.transactions[0]?.keyWas).toBe('on the server');
    const view = boundary.present(simulation.state, simulation.levers);
    expect(view.stations.panel?.badge).toBe('no secrets');
  });

  it('shows the leak and the forced releases when the key moves into the bundle', () => {
    const simulation = createSimulation(boundary.scenario, {
      seed: 2,
      levers: { keyLocation: 'panel' },
    });
    simulation.dispatch({ type: 'act', action: 'view-source' });
    simulation.dispatch({ type: 'act', action: 'operator-allocate' });
    simulation.dispatch({ type: 'act', action: 'upgrade-contract' });
    simulation.advance(2000);
    expect(simulation.state.exposures).toBe(1);
    expect(simulation.state.frontEndReleases).toBe(1);
    expect(simulation.state.transactions[0]?.exposed).toBe(true);
    expect(
      simulation.log.some(
        (entry) => entry.tone === 'fault' && entry.message.includes('anyone reading it'),
      ),
    ).toBe(true);
  });

  it('lets users sign their own purchases either way', () => {
    const simulation = createSimulation(boundary.scenario, {
      seed: 2,
      levers: { keyLocation: 'panel' },
    });
    simulation.dispatch({ type: 'act', action: 'user-buy' });
    simulation.advance(2000);
    expect(simulation.state.transactions[0]?.exposed).toBe(false);
    expect(simulation.state.transactions[0]?.keyWas).toBe('theirs');
  });

  it('runs its demonstration deterministically', () => {
    const first = transcriptOf(boundary.scenario, boundary.demonstration);
    const second = transcriptOf(boundary.scenario, boundary.demonstration);
    expect(first.entries).toEqual(second.entries);
    expect(first.entries.filter((entry) => entry.tone === 'fault').length).toBeGreaterThan(2);
  });
});
