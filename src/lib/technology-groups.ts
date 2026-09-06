import { technologyGroups } from '../content/schemas';

export type TechnologyGroup = (typeof technologyGroups)[number];

interface TechnologyLike {
  data: { name: string; group: TechnologyGroup; firstUsed: number };
}

export const technologyGroupLabels: Record<TechnologyGroup, string> = {
  'owned-in-production': 'Owned in production',
  'shipped-with': 'Shipped with',
  familiar: 'Familiar',
};

export const compareByFirstUsedThenName = (first: TechnologyLike, second: TechnologyLike): number =>
  first.data.firstUsed - second.data.firstUsed || first.data.name.localeCompare(second.data.name);

export const selectGroup = <T extends TechnologyLike>(
  technologies: T[],
  group: TechnologyGroup,
): T[] =>
  technologies
    .filter((technology) => technology.data.group === group)
    .sort(compareByFirstUsedThenName);

export const groupTechnologyNames = (
  technologies: TechnologyLike[],
): { label: string; names: string[] }[] =>
  technologyGroups.map((group) => ({
    label: technologyGroupLabels[group],
    names: selectGroup(technologies, group).map((technology) => technology.data.name),
  }));
