import { systemSchema, type SystemInput, type SystemModel } from './schema';

export class SystemIntegrityError extends Error {
  readonly problems: string[];

  constructor(systemId: string, problems: string[]) {
    const lines = problems.map((problem) => `  - ${problem}`);
    super([`System "${systemId}" is not internally consistent:`, ...lines].join('\n'));
    this.name = 'SystemIntegrityError';
    this.problems = problems;
  }
}

const duplicates = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated];
};

export const findSystemProblems = (system: SystemModel): string[] => {
  const problems: string[] = [];
  const nodeIds = new Set(system.nodes.map((node) => node.id));
  const edgeIds = new Set(system.edges.map((edge) => edge.id));
  const machineIds = new Set(system.stateMachines.map((machine) => machine.id));

  for (const id of duplicates(system.nodes.map((node) => node.id))) {
    problems.push(`node "${id}" is declared more than once`);
  }
  for (const id of duplicates(system.edges.map((edge) => edge.id))) {
    problems.push(`edge "${id}" is declared more than once`);
  }
  for (const id of duplicates(system.flows.map((flow) => flow.id))) {
    problems.push(`flow "${id}" is declared more than once`);
  }
  for (const id of duplicates(system.fragments.map((fragment) => fragment.id))) {
    problems.push(`fragment "${id}" is declared more than once`);
  }
  for (const id of duplicates(system.decisions.map((decision) => decision.id))) {
    problems.push(`decision "${id}" is declared more than once`);
  }

  for (const edge of system.edges) {
    if (!nodeIds.has(edge.from)) {
      problems.push(`edge "${edge.id}" starts at unknown node "${edge.from}"`);
    }
    if (!nodeIds.has(edge.to)) {
      problems.push(`edge "${edge.id}" ends at unknown node "${edge.to}"`);
    }
  }

  for (const flow of system.flows) {
    const leverOptions = new Map(
      flow.levers.map((lever) => [lever.id, new Set(lever.options.map((option) => option.value))]),
    );
    for (const lever of flow.levers) {
      if (!leverOptions.get(lever.id)?.has(lever.defaultValue)) {
        problems.push(`flow "${flow.id}" lever "${lever.id}" defaults to an unknown option`);
      }
    }
    flow.steps.forEach((step, index) => {
      const where = `flow "${flow.id}" step ${String(index + 1)}`;
      if (step.node !== undefined && !nodeIds.has(step.node)) {
        problems.push(`${where} names unknown node "${step.node}"`);
      }
      if (step.edge !== undefined && !edgeIds.has(step.edge)) {
        problems.push(`${where} names unknown edge "${step.edge}"`);
      }
      if (step.status !== undefined && !machineIds.has(step.status.machine)) {
        problems.push(`${where} names unknown state machine "${step.status.machine}"`);
      }
      for (const condition of step.when) {
        if (!leverOptions.get(condition.lever)?.has(condition.value)) {
          problems.push(
            `${where} depends on unknown lever option "${condition.lever}=${condition.value}"`,
          );
        }
      }
    });
  }

  if (
    system.boardFlow !== undefined &&
    !system.flows.some((flow) => flow.id === system.boardFlow)
  ) {
    problems.push(`board flow "${system.boardFlow}" is not one of the system's flows`);
  }

  for (const machine of system.stateMachines) {
    const statusIds = new Set(machine.statuses.map((status) => status.id));
    const terminal = new Set(
      machine.statuses.filter((status) => status.terminal).map((status) => status.id),
    );
    for (const transition of machine.transitions) {
      if (!statusIds.has(transition.from) || !statusIds.has(transition.to)) {
        problems.push(
          `state machine "${machine.id}" transition ${transition.from} -> ${transition.to} names an undeclared status`,
        );
      }
      if (terminal.has(transition.from)) {
        problems.push(
          `state machine "${machine.id}" leaves terminal status "${transition.from}" via ${transition.trigger}`,
        );
      }
    }
    for (const flow of system.flows) {
      for (const step of flow.steps) {
        if (step.status?.machine === machine.id && !statusIds.has(step.status.value)) {
          problems.push(
            `flow "${flow.id}" moves "${machine.id}" to undeclared status "${step.status.value}"`,
          );
        }
      }
    }
  }

  return problems;
};

export const defineSystem = (input: SystemInput): SystemModel => {
  const system = systemSchema.parse(input);
  const problems = findSystemProblems(system);
  if (problems.length > 0) {
    throw new SystemIntegrityError(system.id, problems);
  }
  return system;
};
