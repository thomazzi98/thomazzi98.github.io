import { describe, expect, it } from 'vitest';
import { runDemonstration, transcriptOf } from '../../../src/bench/core/demonstration';
import { median } from '../../../src/bench/core/presentation';
import {
  demonstration,
  present,
  scenario,
} from '../../../src/bench/scenarios/queued-bank-onboarding';

describe('median', () => {
  it('handles empty, odd and even samples', () => {
    expect(median([])).toBe(0);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('the onboarding demonstration', () => {
  it('walks through success, retries, a recorded fault, a refusal and a replay', () => {
    const transcript = transcriptOf(scenario, demonstration);
    const messages = transcript.entries.map((entry) => entry.message);
    expect(messages).toContain('#1 · 201 from provider · account created');
    expect(messages).toContain('#2 · 503 from provider · retry in 1 s');
    expect(messages).toContain('#2 · gave up after 3 attempts · surfaced to support');
    expect(messages.some((message) => message.includes('recorded, not retried'))).toBe(true);
    expect(messages).toContain('re-queue #1 refused · already processed');
    expect(messages).toContain('re-queued #2');
    expect(messages).toContain('re-queued #3');
    expect(transcript.duration).toBe(14700);
    expect(transcript.scenario).toBe('queued-bank-onboarding');
  });

  it('presents gauges and a ledger the renderer can show without knowing the scenario', () => {
    const simulation = runDemonstration(scenario, demonstration);
    const view = present(simulation.state, simulation.levers);
    expect(view.meters.map((meter) => meter.id)).toEqual(['signup', 'provider']);
    expect(view.meters[0]?.tone).toBe('ok');
    expect(view.ledger.columns).toEqual(['#', 'Status', 'Attempts', 'Last answer']);
    expect(view.ledger.rows).toHaveLength(3);
    expect(view.ledger.rows.every((row) => row.cells[1] === 'account created')).toBe(true);
    expect(view.stations.provider?.tone).toBe('ok');
    expect(view.headline).toMatch(/Sign-up still \d+ ms/);
  });
});
