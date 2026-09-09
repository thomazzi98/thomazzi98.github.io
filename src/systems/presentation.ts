import type { SystemEdge, SystemNode, Tone, maturityLabels } from './schema';

type MaturityLabel = (typeof maturityLabels)[number];

export const maturityTone: Readonly<Record<MaturityLabel, Tone>> = {
  validated: 'ok',
  complete: 'ok',
  'in-progress': 'wait',
};

export const maturityText = (label: MaturityLabel): string => label.replace('-', ' ');

export const edgeEndpoints = (edges: readonly SystemEdge[]) =>
  new Map(edges.map((edge) => [edge.id, { from: edge.from, to: edge.to }]));

// The drawings need the shape of a part, not its prose; the page keeps the prose.
export const toSchematicNodes = (nodes: readonly SystemNode[]) =>
  nodes.map(({ id, label, kind, stamp }) => ({ id, label, kind, stamp }));

export const toSchematicEdges = (edges: readonly SystemEdge[]) =>
  edges.map(({ id, from, to, label, protocol }) => ({ id, from, to, label, protocol }));
