interface Reference {
  id: string;
}

interface HasStack {
  id: string;
  data: { stack: Reference[] };
}

const groupByTechnology = <T extends HasStack>(entries: T[]): Map<string, T[]> => {
  const byTechnology = new Map<string, T[]>();
  for (const entry of entries) {
    for (const technology of entry.data.stack) {
      const existing = byTechnology.get(technology.id) ?? [];
      byTechnology.set(technology.id, [...existing, entry]);
    }
  }
  return byTechnology;
};

export const indexEvidence = <Role extends HasStack, Project extends HasStack>(
  roles: Role[],
  projects: Project[],
) => {
  const rolesByTechnology = groupByTechnology(roles);
  const projectsByTechnology = groupByTechnology(projects);
  return {
    rolesFor: (technologyId: string): Role[] => rolesByTechnology.get(technologyId) ?? [],
    projectsFor: (technologyId: string): Project[] => projectsByTechnology.get(technologyId) ?? [],
  };
};
