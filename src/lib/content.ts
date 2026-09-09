import { getCollection } from 'astro:content';
import { systems } from '../systems';
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
  assertContentIntegrity({ roles, projects, technologies, systems: [...systems] });
  const companyByRoleId = new Map(roles.map((role) => [role.id, role.data.company]));
  const companyOf = (project: HasRole): string | undefined =>
    project.data.role === undefined ? undefined : companyByRoleId.get(project.data.role.id);
  const roleOf = (project: HasRole) =>
    project.data.role === undefined
      ? undefined
      : roles.find((role) => role.id === project.data.role?.id);
  return { roles, projects, technologies, education, practices, companyOf, roleOf };
};
