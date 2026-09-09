import type { Flow, SystemEdge, SystemModel, SystemNode } from './schema';

// A board drawing stacks in two lanes on the home page; ten parts is the most that stays legible.
export const boardLimit = 10;

export interface Board {
  readonly system: SystemModel;
  readonly flow: Flow;
  readonly nodes: SystemNode[];
  readonly edges: SystemEdge[];
}

// The parts a flow touches: every node a step names and both ends of every edge it travels.
export const footprintOf = (system: SystemModel, flow: Flow): Set<string> => {
  const touched = new Set<string>();
  const edgeById = new Map(system.edges.map((edge) => [edge.id, edge]));
  for (const step of flow.steps) {
    if (step.node !== undefined) {
      touched.add(step.node);
    }
    if (step.edge === undefined) {
      continue;
    }
    const edge = edgeById.get(step.edge);
    if (edge !== undefined) {
      touched.add(edge.from);
      touched.add(edge.to);
    }
  }
  return touched;
};

export const boardOf = (system: SystemModel): Board | undefined => {
  const flow = system.flows.find((candidate) => candidate.id === system.boardFlow);
  if (flow === undefined) {
    return undefined;
  }
  const footprint = footprintOf(system, flow);
  const nodes = system.nodes.filter((node) => footprint.has(node.id));
  const edges = system.edges.filter((edge) => footprint.has(edge.from) && footprint.has(edge.to));
  return { system, flow, nodes, edges };
};
