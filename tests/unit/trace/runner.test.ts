import { describe, expect, it } from 'vitest';
import { defineSystem } from '../../../src/systems/validate';
import {
  createFlowSimulation,
  defaultLeverValues,
  runTranscript,
  selectSteps,
} from '../../../src/trace/runner';
import { firstOf, fixtureSystem } from '../systems/fixture';

const system = defineSystem(fixtureSystem);
const flow = firstOf(system.flows);
const endpoints = new Map(system.edges.map((edge) => [edge.id, { from: edge.from, to: edge.to }]));

describe('selectSteps', () => {
  it('keeps the steps whose conditions match the lever values, in time order', () => {
    expect(selectSteps(flow, defaultLeverValues(flow.levers)).map((step) => step.ledger)).toEqual([
      'entry.received',
      'entry.inserted',
      'entry.answered 201',
    ]);
    expect(selectSteps(flow, { database: 'down' }).map((step) => step.ledger)).toEqual([
      'entry.received',
      'insert.failed',
      'entry.answered 503',
    ]);
  });
});

describe('runTranscript', () => {
  it('replays the same ledger for the same levers', () => {
    const first = runTranscript(flow, endpoints);
    const second = runTranscript(flow, endpoints);
    expect(first).toEqual(second);
    expect(first.map((entry) => [entry.at, entry.message])).toEqual([
      [0, 'entry.received'],
      [600, 'entry.inserted'],
      [1200, 'entry.answered 201'],
    ]);
  });

  it('branches on the lever without touching the other branch', () => {
    const messages = runTranscript(flow, endpoints, { levers: { database: 'down' } }).map(
      (entry) => entry.message,
    );
    expect(messages).toEqual(['entry.received', 'insert.failed', 'entry.answered 503']);
  });
});

describe('createFlowSimulation', () => {
  it('moves a packet along the edge of a step and records the status it sets', () => {
    const simulation = createFlowSimulation(flow, endpoints);
    simulation.step();
    expect(simulation.packets.map((packet) => [packet.from, packet.to])).toEqual([
      ['client', 'api'],
    ]);
    simulation.step();
    expect(simulation.state.statuses).toEqual({ entry: 'recorded' });
    expect(simulation.state.activeNode).toBe('database');
    simulation.step();
    expect(simulation.state.completed).toBe(3);
    expect(simulation.step()).toBe(false);
  });
});
