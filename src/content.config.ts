import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  decisionSchema,
  educationSchema,
  practiceSchema,
  projectSchema,
  roleSchema,
  technologySchema,
} from './content/schemas';

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

const practices = defineCollection({
  loader: file('./src/content/practices.json'),
  schema: practiceSchema,
});

const decisions = defineCollection({
  loader: glob({ pattern: '*.md', base: './docs/decisions' }),
  schema: decisionSchema,
});

export const collections = { roles, projects, education, technologies, practices, decisions };
