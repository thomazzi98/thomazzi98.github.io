import { getCollection } from 'astro:content';
import { assertContentIntegrity } from './integrity';

export const loadContent = async () => {
  const [roles, projects, technologies, education] = await Promise.all([
    getCollection('roles'),
    getCollection('projects'),
    getCollection('technologies'),
    getCollection('education'),
  ]);
  assertContentIntegrity({ roles, projects, technologies });
  return { roles, projects, technologies, education };
};

export type SiteContent = Awaited<ReturnType<typeof loadContent>>;
