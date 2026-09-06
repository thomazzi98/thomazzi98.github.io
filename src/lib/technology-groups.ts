import { technologyGroups } from '../content/schemas';

type TechnologyGroup = (typeof technologyGroups)[number];

interface TechnologyLike {
  data: { name: string; group: TechnologyGroup; firstUsed: number };
}

export const technologyGroupLabels: Record<TechnologyGroup, string> = {
  'owned-in-production': 'Owned in production',
  'shipped-with': 'Shipped with',
  familiar: 'Familiar',
};

export const groupTechnologyNames = (
  technologies: TechnologyLike[],
): { label: string; names: string[] }[] =>
  technologyGroups.map((group) => ({
    label: technologyGroupLabels[group],
    names: technologies
      .filter((technology) => technology.data.group === group)
      .sort((first, second) => first.data.firstUsed - second.data.firstUsed)
      .map((technology) => technology.data.name),
  }));
