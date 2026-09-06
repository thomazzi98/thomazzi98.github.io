import { reference } from 'astro:content';
import { z } from 'astro/zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a YYYY-MM value');

export const periodSchema = z
  .object({ start: yearMonth, end: yearMonth.nullable() })
  .refine(({ start, end }) => end === null || start <= end, {
    message: 'A period cannot end before it starts',
  });

export const technologyCategories = [
  'language',
  'runtime',
  'framework',
  'database',
  'messaging',
  'cloud',
  'blockchain',
  'testing',
  'tooling',
  'frontend',
] as const;

export const technologyGroups = ['owned-in-production', 'shipped-with', 'familiar'] as const;

export const technologySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: z.enum(technologyCategories),
  firstUsed: z.number().int().min(2015).max(2100),
  group: z.enum(technologyGroups),
});

export const roleSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  companyGloss: z.string().min(1),
  location: z.string().min(1),
  period: periodSchema,
  concurrentWith: reference('roles').optional(),
  stack: z.array(reference('technologies')).min(1),
});

export const projectKinds = ['case-study', 'also-built'] as const;

export const projectStatuses = [
  'in-production',
  'paused-by-client',
  'never-launched',
  'internal',
  'personal',
] as const;

export const evidenceKinds = ['company', 'repo', 'none'] as const;

export const projectSchema = z.object({
  title: z.string().min(1),
  tagline: z.string().min(1),
  kind: z.enum(projectKinds),
  status: z.enum(projectStatuses),
  period: periodSchema,
  role: reference('roles').optional(),
  featured: z.number().int().positive().optional(),
  stack: z.array(reference('technologies')).min(1),
  confidentiality: z.string().optional(),
  evidence: z
    .array(
      z.object({
        kind: z.enum(evidenceKinds),
        label: z.string().optional(),
        url: z.url().optional(),
      }),
    )
    .default([]),
});

export const decisionStatuses = ['proposed', 'accepted', 'superseded', 'rejected'] as const;

export const decisionSchema = z.object({
  title: z.string().min(1),
  status: z.enum(decisionStatuses),
  date: z.coerce.date(),
});

export const educationSchema = z.object({
  institution: z.string().min(1),
  institutionGloss: z.string().min(1),
  credential: z.string().min(1),
  credentialGloss: z.string().min(1),
  field: z.string().min(1),
  year: z.number().int().min(1990).max(2100),
});
