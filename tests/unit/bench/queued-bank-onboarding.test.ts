import { describe, expect, it } from 'vitest';
import { assertDefinitionIsConsistent } from '../../../src/bench/core/definition';
import { createSimulation } from '../../../src/bench/core/simulation';
import {
  definition,
  maxAttempts,
  scenario,
  type Levers,
} from '../../../src/bench/scenarios/queued-bank-onboarding';

const start = (levers: Partial<Levers> = {}, seed = 11) =>
  createSimulation(scenario, { seed, levers });

const messages = (simulation: ReturnType<typeof start>) =>
  simulation.log.map((entry) => entry.message);

describe('queued bank onboarding', () => {
  it('has a consistent bench definition', () => {
    expect(() => {
      assertDefinitionIsConsistent(definition);
    }).not.toThrow();
  });

  it('answers sign-ups in milliseconds and creates the account from the worker', () => {
    const simulation = start();
    simulation.dispatch({ type: 'signup' });
    simulation.dispatch({ type: 'signup' });
    simulation.advance(5000);
    expect(simulation.state.registrations.map((registration) => registration.status)).toEqual([
      'processed',
      'processed',
    ]);
    expect(Math.max(...simulation.state.signupLatencies)).toBeLessThan(20);
    expect(messages(simulation)[0]).toMatch(/^202 Accepted · registration #1/);
    expect(simulation.state.workerBusy).toBe(false);
  });

  it('retries server faults with doubling backoff, then surfaces the job to support', () => {
    const simulation = start({ providerHealth: 'server-fault' });
    simulation.dispatch({ type: 'signup' });
    simulation.advance(12000);
    const [registration] = simulation.state.registrations;
    expect(registration?.status).toBe('failed');
    expect(registration?.attempts).toBe(maxAttempts);
    expect(simulation.state.supportInbox).toEqual([1]);
    const log = messages(simulation);
    expect(log).toContain('#1 · 503 from provider · retry in 1 s');
    expect(log).toContain('#1 · 503 from provider · retry in 2 s');
    expect(log.at(-1)).toBe('#1 · gave up after 3 attempts · surfaced to support');
    expect(Math.max(...simulation.state.signupLatencies)).toBeLessThan(20);
  });

  it('records a client fault once and never retries it', () => {
    const simulation = start({ providerHealth: 'client-fault' });
    simulation.dispatch({ type: 'signup' });
    simulation.advance(5000);
    const [registration] = simulation.state.registrations;
    expect(registration?.status).toBe('recorded-fault');
    expect(registration?.attempts).toBe(1);
    expect(simulation.state.supportInbox).toEqual([1]);
    expect(messages(simulation).at(-1)).toMatch(/recorded, not retried/);
  });

  it('refuses to re-queue a processed row and replays a failed one', () => {
    const simulation = start({ providerHealth: 'client-fault' });
    simulation.dispatch({ type: 'signup' });
    simulation.advance(5000);
    simulation.setLever('providerHealth', 'healthy');
    simulation.dispatch({ type: 'requeue-failed' });
    simulation.advance(5000);
    expect(simulation.state.registrations[0]?.status).toBe('processed');
    expect(simulation.state.supportInbox).toEqual([]);
    simulation.dispatch({ type: 'requeue', registrationId: 1 });
    expect(messages(simulation).at(-1)).toBe('re-queue #1 refused · already processed');
  });

  it('makes the user wait for the provider on the synchronous path', () => {
    const slow = start({ mode: 'synchronous', providerHealth: 'slow' });
    slow.dispatch({ type: 'signup' });
    slow.advance(6000);
    expect(slow.state.registrations[0]?.status).toBe('processed');
    expect(slow.state.signupLatencies[0]).toBeGreaterThan(2500);

    const failing = start({ mode: 'synchronous', providerHealth: 'server-fault' });
    failing.dispatch({ type: 'signup' });
    failing.advance(6000);
    expect(failing.state.registrations[0]?.status).toBe('lost');
    expect(failing.state.supportInbox).toEqual([]);
    expect(messages(failing).at(-1)).toMatch(/nothing recorded/);
  });

  it('generates steady traffic when asked and stays quiet otherwise', () => {
    const quiet = start();
    quiet.advance(10000);
    expect(quiet.state.registrations).toHaveLength(0);
    const steady = start({ traffic: 'steady' });
    steady.advance(10000);
    expect(steady.state.registrations.length).toBeGreaterThanOrEqual(4);
  });

  it('processes every sign-up even when the ledger is trimmed', () => {
    const simulation = start();
    for (let count = 0; count < 120; count += 1) {
      simulation.dispatch({ type: 'signup' });
    }
    simulation.advance(120_000);
    expect(simulation.state.queue).toEqual([]);
    expect(simulation.state.workerBusy).toBe(false);
    expect(simulation.state.registrations.length).toBeLessThanOrEqual(80);
    expect(simulation.state.registrations.every((entry) => entry.status === 'processed')).toBe(
      true,
    );
  });

  it('keeps working under steady slow traffic for ten simulated minutes', () => {
    const simulation = start({ traffic: 'steady', providerHealth: 'slow' });
    simulation.advance(600_000);
    expect(simulation.pending()).toBeGreaterThan(1);
    expect(simulation.state.createdTotal).toBeGreaterThan(150);
    expect(simulation.state.queue.length).toBeGreaterThan(0);
    expect(simulation.log.at(-1)?.message).not.toMatch(/^takes #1 /);
  });

  it('is deterministic for a seed', () => {
    const run = () => {
      const simulation = start({ traffic: 'steady', providerHealth: 'server-fault' }, 99);
      simulation.advance(20000);
      return messages(simulation);
    };
    expect(run()).toEqual(run());
  });
});
