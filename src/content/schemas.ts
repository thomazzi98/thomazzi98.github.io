import { reference } from 'astro:content';
import { z } from 'astro/zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a YYYY-MM value');

const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Expected a kebab-case identifier');

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
  id: identifier,
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

export const practiceBackingKinds = ['system', 'role'] as const;

export const practiceBackingSchema = z.object({
  kind: z.enum(practiceBackingKinds),
  id: identifier,
});

export const practiceSchema = z.object({
  id: identifier,
  // The collection loader sorts entries by id; the About page renders them in this order instead.
  order: z.number().int().positive(),
  claim: z.string().min(1),
  backing: z.array(practiceBackingSchema).min(1),
});

export type PracticeBackingKind = (typeof practiceBackingKinds)[number];
export type PracticeBacking = z.infer<typeof practiceBackingSchema>;
