import type { LogEntry, Scenario, Simulation } from './simulation';
import { createSimulation } from './simulation';

type LeverStep<Levers> = {
  [Name in keyof Levers & string]: { kind: 'lever'; name: Name; value: Levers[Name] };
}[keyof Levers & string];

export type DemonstrationStep<Event, Levers> =
  LeverStep<Levers> | { kind: 'dispatch'; event: Event } | { kind: 'advance'; duration: number };

export interface Demonstration<Event, Levers> {
  seed: number;
  steps: readonly DemonstrationStep<Event, Levers>[];
}

export interface Transcript {
  scenario: string;
  seed: number;
  duration: number;
  entries: readonly LogEntry[];
}

export const runDemonstration = <State, Event, Levers extends object>(
  scenario: Scenario<State, Event, Levers>,
  demonstration: Demonstration<Event, Levers>,
): Simulation<State, Event, Levers> => {
  const simulation = createSimulation(scenario, { seed: demonstration.seed });
  for (const step of demonstration.steps) {
    switch (step.kind) {
      case 'lever':
        simulation.setLever(step.name, step.value);
        break;
      case 'dispatch':
        simulation.dispatch(step.event);
        break;
      case 'advance':
        simulation.advance(step.duration);
        break;
    }
  }
  return simulation;
};

export const transcriptOf = <State, Event, Levers extends object>(
  scenario: Scenario<State, Event, Levers>,
  demonstration: Demonstration<Event, Levers>,
): Transcript => {
  const simulation = runDemonstration(scenario, demonstration);
  return {
    scenario: scenario.id,
    seed: demonstration.seed,
    duration: simulation.now,
    entries: [...simulation.log],
  };
};
