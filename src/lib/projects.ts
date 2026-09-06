import { compareByStartDescending, type Period } from './period';

interface ProjectLike {
  data: { kind: 'case-study' | 'also-built'; featured?: number | undefined; period: Period };
}

const compareByFeaturedThenStart = <T extends ProjectLike>(first: T, second: T): number => {
  const firstRank = first.data.featured ?? Number.POSITIVE_INFINITY;
  const secondRank = second.data.featured ?? Number.POSITIVE_INFINITY;
  if (firstRank !== secondRank) {
    return firstRank - secondRank;
  }
  return compareByStartDescending(first, second);
};

export const selectCaseStudies = <T extends ProjectLike>(projects: T[]): T[] =>
  projects.filter((project) => project.data.kind === 'case-study').sort(compareByFeaturedThenStart);

export const selectFeatured = <T extends ProjectLike>(projects: T[]): T[] =>
  selectCaseStudies(projects).filter((project) => project.data.featured !== undefined);

export const selectAlsoBuilt = <T extends ProjectLike>(projects: T[]): T[] =>
  projects.filter((project) => project.data.kind === 'also-built').sort(compareByStartDescending);
