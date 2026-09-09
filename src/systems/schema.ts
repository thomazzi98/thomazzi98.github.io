import { z } from 'astro/zod';

const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Expected a kebab-case identifier');

const lineRange = z
  .tuple([z.number().int().positive(), z.number().int().positive()])
  .refine(([start, end]) => start <= end, { message: 'A line range cannot end before it starts' });

export const evidenceSchema = z.object({
  path: z.string().min(1),
  lines: lineRange.optional(),
  note: z.string().optional(),
});

export const repositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string().min(1),
  pinnedCommit: z.string().regex(/^[0-9a-f]{40}$/, 'Expected a full commit hash'),
  pinnedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  firstCommitOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  commitCount: z.number().int().positive(),
  license: z.string().min(1).optional(),
  packageManager: z.string().min(1),
  runtime: z.string().min(1),
});

export const maturityLabels = ['validated', 'complete', 'in-progress'] as const;

export const maturitySchema = z.object({
  label: z.enum(maturityLabels),
  statement: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
});

export const stackEntrySchema = z.object({
  technology: identifier,
  role: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
});

export const nodeKinds = [
  'actor',
  'process',
  'job',
  'store',
  'queue',
  'external',
  'frontend',
  'package',
] as const;

export const nodeSchema = z.object({
  id: identifier,
  label: z.string().min(1),
  kind: z.enum(nodeKinds),
  purpose: z.string().min(1),
  technologies: z.array(identifier).default([]),
  notes: z.array(z.string().min(1)).default([]),
  evidence: z.array(evidenceSchema).min(1),
});

export const edgeProtocols = [
  'http',
  'https',
  'sql',
  'json-rpc',
  'webhook',
  'in-process',
  'orchestration',
] as const;

export const edgeSchema = z.object({
  id: identifier,
  from: identifier,
  to: identifier,
  label: z.string().min(1),
  protocol: z.enum(edgeProtocols),
  authentication: z.string().min(1).optional(),
  payload: z.string().min(1).optional(),
  failureHandling: z.string().min(1).optional(),
  evidence: z.array(evidenceSchema).min(1),
});

export const tones = ['neutral', 'ok', 'wait', 'fault', 'unknown', 'flight'] as const;

export const leverSchema = z.object({
  id: identifier,
  label: z.string().min(1),
  options: z.array(z.object({ value: identifier, label: z.string().min(1) })).min(2),
  defaultValue: identifier,
});

export const leverConditionSchema = z.object({ lever: identifier, value: identifier });

export const stepSchema = z.object({
  // Virtual milliseconds that pace the replay; the ledger text states the real duration.
  at: z.number().nonnegative(),
  ledger: z.string().min(1),
  tone: z.enum(tones).default('neutral'),
  node: identifier.optional(),
  edge: identifier.optional(),
  status: z.object({ machine: identifier, value: z.string().min(1) }).optional(),
  when: z.array(leverConditionSchema).default([]),
  evidence: z.array(evidenceSchema).default([]),
});

export const flowKinds = ['request', 'asynchronous', 'failure', 'recovery', 'security'] as const;

export const flowSchema = z.object({
  id: identifier,
  name: z.string().min(1),
  kind: z.enum(flowKinds),
  summary: z.string().min(1),
  levers: z.array(leverSchema).default([]),
  steps: z.array(stepSchema).min(2),
  assertedBy: z.array(evidenceSchema).default([]),
});

export const statusSchema = z.object({
  id: z.string().min(1),
  terminal: z.boolean(),
  funded: z.boolean().optional(),
  note: z.string().min(1).optional(),
});

export const transitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  trigger: z.string().min(1),
  guard: z.string().min(1).optional(),
});

export const stateMachineSchema = z.object({
  id: identifier,
  name: z.string().min(1),
  statuses: z.array(statusSchema).min(2),
  transitions: z.array(transitionSchema).min(1),
  notes: z.array(z.string().min(1)).default([]),
  evidence: z.array(evidenceSchema).min(1),
});

export const decisionThemes = [
  'durability',
  'correctness',
  'security',
  'boundaries',
  'operability',
  'tooling',
] as const;

export const decisionSchema = z.object({
  id: identifier,
  title: z.string().min(1),
  decision: z.string().min(1),
  alternatives: z.array(z.string().min(1)).default([]),
  cost: z.string().min(1),
  themes: z.array(z.enum(decisionThemes)).min(1),
  evidence: z.array(evidenceSchema).min(1),
});

export const fragmentLanguages = ['ts', 'tsx', 'sql', 'yaml', 'js', 'caddyfile'] as const;

export const fragmentSchema = z.object({
  id: identifier,
  title: z.string().min(1),
  path: z.string().min(1),
  lines: lineRange,
  language: z.enum(fragmentLanguages),
  demonstrates: z.string().min(1),
});

export const verificationLayerSchema = z.object({
  name: z.string().min(1),
  tool: z.string().min(1),
  proves: z.string().min(1),
  examples: z.array(z.object({ path: z.string().min(1), proves: z.string().min(1) })).min(1),
});

export const verificationSchema = z.object({
  layers: z.array(verificationLayerSchema).min(1),
  pipeline: z.array(z.object({ name: z.string().min(1), detail: z.string().min(1) })).default([]),
  checks: z.array(z.object({ command: z.string().min(1), refuses: z.string().min(1) })).default([]),
  evidence: z.array(evidenceSchema).min(1),
});

export const securityControlSchema = z.object({
  concern: z.string().min(1),
  control: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
});

export const limitationSchema = z.object({
  statement: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
});

export const systemSchema = z.object({
  id: identifier,
  name: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().min(1),
  problem: z.array(z.string().min(1)).min(1),
  thesis: z.string().min(1),
  repository: repositorySchema,
  maturity: maturitySchema,
  stack: z.array(stackEntrySchema).min(1),
  nodes: z.array(nodeSchema).min(2),
  edges: z.array(edgeSchema).min(1),
  flows: z.array(flowSchema).min(1),
  stateMachines: z.array(stateMachineSchema).default([]),
  decisions: z.array(decisionSchema).min(1),
  fragments: z.array(fragmentSchema).min(1),
  verification: verificationSchema,
  security: z.array(securityControlSchema).default([]),
  limitations: z.array(limitationSchema).default([]),
  // The flow the home page board replays for this system; its footprint is the board's drawing.
  boardFlow: identifier.optional(),
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type Maturity = z.infer<typeof maturitySchema>;
export type StackEntry = z.infer<typeof stackEntrySchema>;
export type NodeKind = (typeof nodeKinds)[number];
export type SystemNode = z.infer<typeof nodeSchema>;
export type EdgeProtocol = (typeof edgeProtocols)[number];
export type SystemEdge = z.infer<typeof edgeSchema>;
export type Tone = (typeof tones)[number];
export type Lever = z.infer<typeof leverSchema>;
export type Step = z.infer<typeof stepSchema>;
export type FlowKind = (typeof flowKinds)[number];
export type Flow = z.infer<typeof flowSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type StateMachine = z.infer<typeof stateMachineSchema>;
export type DecisionTheme = (typeof decisionThemes)[number];
export type Decision = z.infer<typeof decisionSchema>;
export type Fragment = z.infer<typeof fragmentSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type SecurityControl = z.infer<typeof securityControlSchema>;
export type Limitation = z.infer<typeof limitationSchema>;
export type SystemModel = z.infer<typeof systemSchema>;
export type SystemInput = z.input<typeof systemSchema>;
