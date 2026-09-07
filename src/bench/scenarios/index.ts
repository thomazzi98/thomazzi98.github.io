import type { BenchDefinition } from '../core/definition';
import type { Demonstration } from '../core/demonstration';
import type { Presenter } from '../core/presentation';
import type { Scenario } from '../core/simulation';

export interface ScenarioModule<State = unknown, Event = unknown, Levers extends object = object> {
  scenario: Scenario<State, Event, Levers>;
  definition: BenchDefinition;
  present: Presenter<State, Levers>;
  demonstration: Demonstration<Event, Levers>;
  actionEvent(actionId: string): Event | undefined;
}

export const scenarioIds = [
  'queued-bank-onboarding',
  'design-contest-backend',
  'ipaas-admin-indicators',
  'contract-backend-boundary',
  'multi-network-token-library',
] as const;

export type ScenarioId = (typeof scenarioIds)[number];

const loaders: Record<ScenarioId, () => Promise<ScenarioModule>> = {
  'queued-bank-onboarding': () =>
    import('./queued-bank-onboarding').then((module) => module as unknown as ScenarioModule),
  'design-contest-backend': () =>
    import('./design-contest-backend').then((module) => module as unknown as ScenarioModule),
  'ipaas-admin-indicators': () =>
    import('./ipaas-admin-indicators').then((module) => module as unknown as ScenarioModule),
  'contract-backend-boundary': () =>
    import('./contract-backend-boundary').then((module) => module as unknown as ScenarioModule),
  'multi-network-token-library': () =>
    import('./multi-network-token-library').then((module) => module as unknown as ScenarioModule),
};

export const isScenarioId = (candidate: string): candidate is ScenarioId =>
  (scenarioIds as readonly string[]).includes(candidate);

export const loadScenario = (id: ScenarioId): Promise<ScenarioModule> => loaders[id]();
