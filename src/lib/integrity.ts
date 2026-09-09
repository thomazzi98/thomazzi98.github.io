import type { PracticeBackingKind } from '../content/schemas';

interface Reference {
  id: string;
}

interface RoleLike {
  id: string;
  data: { stack: Reference[]; concurrentWith?: Reference | undefined };
}

interface TechnologyLike {
  id: string;
}

interface SystemLike {
  id: string;
  stack: { technology: string }[];
}

interface PracticeLike {
  id: string;
  data: { backing: { kind: PracticeBackingKind; id: string }[] };
}

export interface ContentGraph {
  roles: RoleLike[];
  technologies: TechnologyLike[];
  systems?: SystemLike[];
  practices?: PracticeLike[];
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
  technologies,
  systems = [],
  practices = [],
}: ContentGraph): string[] => {
  const technologyIds = new Set(technologies.map((technology) => technology.id));
  const roleIds = new Set(roles.map((role) => role.id));
  const systemIds = new Set(systems.map((system) => system.id));
  const knownBackingIds: Record<PracticeBackingKind, Set<string>> = {
    system: systemIds,
    role: roleIds,
  };
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

  for (const system of systems) {
    checkStack(
      `system "${system.id}"`,
      system.stack.map((entry) => ({ id: entry.technology })),
    );
  }

  for (const practice of practices) {
    for (const backing of practice.data.backing) {
      if (knownBackingIds[backing.kind].has(backing.id)) {
        continue;
      }
      problems.push(`practice "${practice.id}" cites unknown ${backing.kind} "${backing.id}"`);
    }
  }

  for (const technologyId of technologyIds) {
    if (referencedTechnologyIds.has(technologyId)) {
      continue;
    }
    problems.push(`technology "${technologyId}" is not referenced by any role or system`);
  }

  return problems;
};

export const assertContentIntegrity = (graph: ContentGraph): void => {
  const problems = findIntegrityProblems(graph);
  if (problems.length === 0) {
    return;
  }
  throw new ContentIntegrityError(problems);
};
