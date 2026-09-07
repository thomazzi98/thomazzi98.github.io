import { describe, expect, it } from 'vitest';
import { describeDefinition } from '../../../src/bench/render/describe';
import { definition } from '../../../src/bench/scenarios/queued-bank-onboarding';

describe('describeDefinition', () => {
  it('lists every station with its kind and note, and every wire with its label', () => {
    const text = describeDefinition(definition);
    expect(text).toContain('User, actor;');
    expect(text).toContain('Queue, queue (BullMQ on Redis)');
    expect(text).toContain('Bank provider, external system (slow, may fail)');
    expect(text).toContain('Support to Queue, re-queue, dashed');
    expect(text).toContain('API to Bank provider, what it replaced, dashed');
    expect(text).toMatch(/A dashed wire is a path the design avoids/);
  });
});
