import { describe, expect, it } from 'vitest';
import { systemSchema } from '../../../src/systems/schema';
import {
  defineSystem,
  findSystemProblems,
  SystemIntegrityError,
} from '../../../src/systems/validate';
import { firstOf, fixtureSystem } from './fixture';

const parsed = () => systemSchema.parse(fixtureSystem);

describe('defineSystem', () => {
  it('accepts a system whose references all resolve', () => {
    expect(defineSystem(fixtureSystem).id).toBe('ledger');
  });

  it('rejects a commit hash that is not forty hexadecimal characters', () => {
    const input = {
      ...fixtureSystem,
      repository: { ...fixtureSystem.repository, pinnedCommit: 'abc123' },
    };
    expect(() => defineSystem(input)).toThrow(/commit hash/);
  });

  it('raises every problem at once', () => {
    const edge = firstOf(fixtureSystem.edges);
    const input = {
      ...fixtureSystem,
      edges: [...fixtureSystem.edges, { ...edge, id: 'broken', to: 'nowhere' }],
    };
    expect(() => defineSystem(input)).toThrow(SystemIntegrityError);
    expect(() => defineSystem(input)).toThrow(/ends at unknown node "nowhere"/);
  });
});

describe('findSystemProblems', () => {
  it('reports an edge that names an unknown node', () => {
    const system = parsed();
    firstOf(system.edges).from = 'ghost';
    expect(findSystemProblems(system)).toEqual([
      'edge "client-api" starts at unknown node "ghost"',
    ]);
  });

  it('reports a flow step that names an unknown edge or node', () => {
    const system = parsed();
    const flow = firstOf(system.flows);
    firstOf(flow.steps).edge = 'missing-edge';
    const third = flow.steps[2];
    if (third !== undefined) {
      third.node = 'missing-node';
    }
    expect(findSystemProblems(system)).toEqual([
      'flow "record-entry" step 1 names unknown edge "missing-edge"',
      'flow "record-entry" step 3 names unknown node "missing-node"',
    ]);
  });

  it('reports a step that depends on a lever option nobody declared', () => {
    const system = parsed();
    const second = firstOf(system.flows).steps[1];
    if (second !== undefined) {
      second.when = [{ lever: 'database', value: 'slow' }];
    }
    expect(findSystemProblems(system)).toEqual([
      'flow "record-entry" step 2 depends on unknown lever option "database=slow"',
    ]);
  });

  it('reports a transition that leaves a terminal status', () => {
    const system = parsed();
    firstOf(system.stateMachines).transitions.push({
      from: 'recorded',
      to: 'pending',
      trigger: 'UNDO',
    });
    expect(findSystemProblems(system)).toEqual([
      'state machine "entry" leaves terminal status "recorded" via UNDO',
    ]);
  });

  it('reports a step that moves a machine to a status it does not declare', () => {
    const system = parsed();
    const second = firstOf(system.flows).steps[1];
    if (second !== undefined) {
      second.status = { machine: 'entry', value: 'archived' };
    }
    expect(findSystemProblems(system)).toEqual([
      'flow "record-entry" moves "entry" to undeclared status "archived"',
    ]);
  });

  it('reports duplicate identifiers', () => {
    const system = parsed();
    const api = system.nodes[1];
    if (api !== undefined) {
      system.nodes.push({ ...api });
    }
    expect(findSystemProblems(system)).toEqual(['node "api" is declared more than once']);
  });

  it('reports a lever declared twice inside one flow', () => {
    const system = parsed();
    const flow = firstOf(system.flows);
    flow.levers.push({ ...firstOf(flow.levers) });
    expect(findSystemProblems(system)).toEqual([
      'flow "record-entry" declares lever "database" more than once',
    ]);
  });

  it('reports an edge that starts and ends at the same node', () => {
    const system = parsed();
    const edge = firstOf(system.edges);
    edge.to = edge.from;
    expect(findSystemProblems(system)).toEqual([
      'edge "client-api" starts and ends at the same node',
    ]);
  });

  it('requires a tone on every status', () => {
    const machine = firstOf(fixtureSystem.stateMachines ?? []);
    const statuses = machine.statuses.map((status) => ({
      id: status.id,
      terminal: status.terminal,
    }));
    const result = systemSchema.safeParse({
      ...fixtureSystem,
      stateMachines: [{ ...machine, statuses }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'stateMachines.0.statuses.0.tone',
      'stateMachines.0.statuses.1.tone',
    ]);
  });
});
