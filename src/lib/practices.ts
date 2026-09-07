interface Reference {
  id: string;
}

interface PracticeLike {
  id: string;
  data: { claim: string; backedBy: readonly Reference[] };
}

interface ProjectLike {
  id: string;
}

const notTied = Number.MAX_SAFE_INTEGER;

const firstTiedColumn = (practice: PracticeLike, caseStudies: readonly ProjectLike[]): number => {
  const columns = practice.data.backedBy
    .map((reference) => caseStudies.findIndex((project) => project.id === reference.id))
    .filter((column) => column !== -1);
  return columns.length === 0 ? notTied : Math.min(...columns);
};

export const sortPracticesByTie = <Practice extends PracticeLike>(
  practices: readonly Practice[],
  caseStudies: readonly ProjectLike[],
): Practice[] =>
  [...practices].sort((first, second) => {
    const byColumn = firstTiedColumn(first, caseStudies) - firstTiedColumn(second, caseStudies);
    return byColumn !== 0 ? byColumn : first.data.claim.localeCompare(second.data.claim);
  });

export const isTiedToCaseStudy = (
  practice: PracticeLike,
  caseStudies: readonly ProjectLike[],
): boolean => firstTiedColumn(practice, caseStudies) !== notTied;
