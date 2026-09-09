import { getCollection } from 'astro:content';
import { systems } from '../systems';
import { assertContentIntegrity } from './integrity';

export const loadContent = async () => {
  const [roles, technologies, education, practices] = await Promise.all([
    getCollection('roles'),
    getCollection('technologies'),
    getCollection('education'),
    getCollection('practices'),
  ]);
  assertContentIntegrity({ roles, technologies, practices, systems: [...systems] });
  return { roles, technologies, education, practices };
};
