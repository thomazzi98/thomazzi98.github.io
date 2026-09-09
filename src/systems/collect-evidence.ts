import type { Evidence, SystemModel } from './schema';

export interface CitedEvidence extends Evidence {
  citedBy: string;
}

export const collectEvidence = (system: SystemModel): CitedEvidence[] => {
  const cited: CitedEvidence[] = [];
  const add = (citedBy: string, evidence: readonly Evidence[]) => {
    for (const entry of evidence) {
      cited.push({ ...entry, citedBy });
    }
  };

  add('maturity', system.maturity.evidence);
  for (const entry of system.stack) {
    add(`stack ${entry.technology}`, entry.evidence);
  }
  for (const node of system.nodes) {
    add(`node ${node.id}`, node.evidence);
  }
  for (const edge of system.edges) {
    add(`edge ${edge.id}`, edge.evidence);
  }
  for (const flow of system.flows) {
    add(`flow ${flow.id}`, flow.assertedBy);
    flow.steps.forEach((step, index) => {
      add(`flow ${flow.id} step ${String(index + 1)}`, step.evidence);
    });
  }
  for (const machine of system.stateMachines) {
    add(`state machine ${machine.id}`, machine.evidence);
  }
  for (const decision of system.decisions) {
    add(`decision ${decision.id}`, decision.evidence);
  }
  for (const fragment of system.fragments) {
    add(`fragment ${fragment.id}`, [{ path: fragment.path, lines: fragment.lines }]);
  }
  add('verification', system.verification.evidence);
  for (const layer of system.verification.layers) {
    add(
      `verification layer ${layer.name}`,
      layer.examples.map((example) => ({ path: example.path })),
    );
  }
  for (const control of system.security) {
    add(`security ${control.concern}`, control.evidence);
  }
  for (const limitation of system.limitations) {
    add('limitation', limitation.evidence);
  }
  return cited;
};
