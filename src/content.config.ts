import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { educationSchema, projectSchema, roleSchema, technologySchema } from './content/schemas';

const roles = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/roles' }),
  schema: roleSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: projectSchema,
});

const education = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/education' }),
  schema: educationSchema,
});

const technologies = defineCollection({
  loader: file('./src/content/technologies.json'),
  schema: technologySchema,
});

export const collections = { roles, projects, education, technologies };
