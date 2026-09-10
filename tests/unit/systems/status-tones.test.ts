import { describe, expect, it } from 'vitest';
import { findSystem, systems } from '../../../src/systems';

const statusesOf = (systemId: string, machineId: string) => {
  const machine = findSystem(systemId)?.stateMachines.find(
    (candidate) => candidate.id === machineId,
  );
  if (machine === undefined) {
    throw new Error(`${systemId} has no state machine ${machineId}`);
  }
  return machine.statuses;
};

describe('the status tones', () => {
  it('reserve unknown for the status that means an outcome nobody knows yet', () => {
    for (const system of systems) {
      for (const machine of system.stateMachines) {
        for (const status of machine.statuses) {
          if (status.tone !== 'unknown') {
            continue;
          }
          expect(status.id.toLowerCase(), `${system.id} ${machine.id} ${status.id}`).toBe(
            'unknown',
          );
        }
      }
    }
  });

  it('settle an unmatched receipt as neutral, like an ignored one, because nothing about it is pending', () => {
    const statuses = statusesOf('whatsapp-notification-platform', 'webhook-delivery');
    const unmatched = statuses.find((status) => status.id === 'UNMATCHED');
    const ignored = statuses.find((status) => status.id === 'IGNORED');
    expect(unmatched?.terminal).toBe(true);
    expect(unmatched?.tone).toBe('neutral');
    expect(unmatched?.tone).toBe(ignored?.tone);
  });
});
