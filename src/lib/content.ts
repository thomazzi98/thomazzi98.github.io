import { getCollection } from 'astro:content';
import { assertContentIntegrity } from './integrity';

interface HasRole {
  data: { role?: { id: string } | undefined };
}

export const loadContent = async () => {
  const [roles, projects, technologies, education, practices] = await Promise.all([
    getCollection('roles'),
    getCollection('projects'),
    getCollection('technologies'),
    getCollection('education'),
    getCollection('practices'),
  ]);
  assertContentIntegrity({ roles, projects, technologies });
  const companyByRoleId = new Map(roles.map((role) => [role.id, role.data.company]));
  const companyOf = (project: HasRole): string | undefined =>
    project.data.role === undefined ? undefined : companyByRoleId.get(project.data.role.id);
  return { roles, projects, technologies, education, practices, companyOf };
};

export type SiteContent = Awaited<ReturnType<typeof loadContent>>;
