interface Reference {
  id: string;
}

interface RoleLike {
  id: string;
  data: { stack: Reference[]; concurrentWith?: Reference | undefined };
}

interface ProjectLike {
  id: string;
  data: { stack: Reference[]; role?: Reference | undefined; kind?: 'case-study' | 'also-built' };
}

interface TechnologyLike {
  id: string;
}

export interface ContentGraph {
  roles: RoleLike[];
  projects: ProjectLike[];
  technologies: TechnologyLike[];
  scenarioIds?: readonly string[];
}

export class ContentIntegrityError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    const lines = problems.map((problem) => `  - ${problem}`);
    super(['Content integrity check failed:', ...lines].join('\n'));
    this.name = 'ContentIntegrityError';
    this.problems = problems;
  }
}

export const findIntegrityProblems = ({
  roles,
  projects,
  technologies,
}: ContentGraph): string[] => {
  const technologyIds = new Set(technologies.map((technology) => technology.id));
  const roleIds = new Set(roles.map((role) => role.id));
  const referencedTechnologyIds = new Set<string>();
  const problems: string[] = [];

  const checkStack = (owner: string, stack: Reference[]) => {
    for (const technology of stack) {
      referencedTechnologyIds.add(technology.id);
      if (technologyIds.has(technology.id)) {
        continue;
      }
      problems.push(`${owner} references unknown technology "${technology.id}"`);
    }
  };

  for (const role of roles) {
    checkStack(`role "${role.id}"`, role.data.stack);
    const concurrent = role.data.concurrentWith;
    if (concurrent !== undefined && !roleIds.has(concurrent.id)) {
      problems.push(`role "${role.id}" is concurrent with unknown role "${concurrent.id}"`);
    }
  }

  for (const project of projects) {
    checkStack(`project "${project.id}"`, project.data.stack);
    const role = project.data.role;
    if (role !== undefined && !roleIds.has(role.id)) {
      problems.push(`project "${project.id}" belongs to unknown role "${role.id}"`);
    }
  }

  for (const technologyId of technologyIds) {
    if (referencedTechnologyIds.has(technologyId)) {
      continue;
    }
    problems.push(`technology "${technologyId}" is not referenced by any role or project`);
  }

  return problems;
};

export const findBenchProblems = ({ projects, scenarioIds }: ContentGraph): string[] => {
  if (scenarioIds === undefined) {
    return [];
  }
  const caseStudies = projects.filter((project) => project.data.kind === 'case-study');
  const withoutBench = caseStudies
    .filter((project) => !scenarioIds.includes(project.id))
    .map((project) => `case study "${project.id}" has no bench scenario`);
  const withoutCase = scenarioIds
    .filter((id) => !caseStudies.some((project) => project.id === id))
    .map((id) => `bench scenario "${id}" has no case study`);
  return [...withoutBench, ...withoutCase];
};

export const assertContentIntegrity = (graph: ContentGraph): void => {
  const problems = [...findIntegrityProblems(graph), ...findBenchProblems(graph)];
  if (problems.length === 0) {
    return;
  }
  throw new ContentIntegrityError(problems);
};
