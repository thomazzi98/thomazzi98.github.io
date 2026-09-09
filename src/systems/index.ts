import { presentationOrder } from './repositories';
import type { SystemModel } from './schema';

const modules = import.meta.glob<{ system: SystemModel }>('./*.system.ts', { eager: true });

const rank = (system: SystemModel): number => {
  const index = presentationOrder.indexOf(system.id);
  return index === -1 ? presentationOrder.length : index;
};

export const systems: readonly SystemModel[] = Object.values(modules)
  .map((module) => module.system)
  .sort((first, second) => rank(first) - rank(second) || first.id.localeCompare(second.id));

export const findSystem = (id: string): SystemModel | undefined =>
  systems.find((system) => system.id === id);
