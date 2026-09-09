import { evidenceLabel, evidenceUrl } from '../../systems/evidence';
import type { Evidence, Repository, SystemEdge, SystemNode } from '../../systems/schema';
import { kindName, protocolName } from '../schematic/protocol';
import type { Selection } from '../schematic/Schematic';

interface InspectorProps {
  readonly repository: Repository;
  readonly nodes: readonly SystemNode[];
  readonly edges: readonly SystemEdge[];
  readonly selection: Selection | undefined;
  readonly onSelect: (selection: Selection | undefined) => void;
  readonly technologyNames?: Readonly<Record<string, string>>;
}

const EvidenceList = ({
  repository,
  evidence,
}: {
  repository: Repository;
  evidence: readonly Evidence[];
}) => (
  <ul class="inspector__evidence">
    {evidence.map((entry) => (
      <li key={`${entry.path}-${String(entry.lines?.[0] ?? 0)}`} class="evidence">
        <a href={evidenceUrl(repository, entry)} rel="noopener">
          {evidenceLabel(entry)}
        </a>
        {entry.note !== undefined && <span> · {entry.note}</span>}
      </li>
    ))}
  </ul>
);

const Field = ({ label, value }: { label: string; value: string | undefined }) => {
  if (value === undefined) {
    return null;
  }
  return (
    <div class="inspector__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
};

export const Inspector = ({
  repository,
  nodes,
  edges,
  selection,
  onSelect,
  technologyNames = {},
}: InspectorProps) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeLabel = (id: string) => nodeById.get(id)?.label ?? id;

  if (selection === undefined) {
    return (
      <div class="inspector inspector--empty">
        <p class="kicker">Inspector</p>
        <p class="muted">
          Select a node or an edge to see what it does, how it talks and where the code is.
        </p>
      </div>
    );
  }

  if (selection.kind === 'edge') {
    const edge = edges.find((candidate) => candidate.id === selection.id);
    if (edge === undefined) {
      return null;
    }
    return (
      <div class="inspector" data-selection="edge">
        <p class="kicker">Edge · {protocolName[edge.protocol]}</p>
        <h3 class="inspector__title">{edge.label}</h3>
        <p class="inspector__route mono">
          <button
            type="button"
            class="inspector__link"
            onClick={() => {
              onSelect({ kind: 'node', id: edge.from });
            }}
          >
            {nodeLabel(edge.from)}
          </button>
          <span aria-hidden="true"> → </span>
          <span class="sr-only"> to </span>
          <button
            type="button"
            class="inspector__link"
            onClick={() => {
              onSelect({ kind: 'node', id: edge.to });
            }}
          >
            {nodeLabel(edge.to)}
          </button>
        </p>
        <dl class="inspector__fields">
          <Field label="Authentication" value={edge.authentication} />
          <Field label="Payload" value={edge.payload} />
          <Field label="On failure" value={edge.failureHandling} />
        </dl>
        <p class="kicker">Evidence</p>
        <EvidenceList repository={repository} evidence={edge.evidence} />
      </div>
    );
  }

  const node = nodeById.get(selection.id);
  if (node === undefined) {
    return null;
  }
  const connections = edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  return (
    <div class="inspector" data-selection="node">
      <p class="kicker">
        {String(nodes.indexOf(node) + 1)} · {kindName[node.kind]}
      </p>
      <h3 class="inspector__title">{node.label}</h3>
      <p>{node.purpose}</p>
      {node.technologies.length > 0 && (
        <p class="inspector__technologies mono">
          {node.technologies.map((id) => technologyNames[id] ?? id).join(' · ')}
        </p>
      )}
      {node.notes.length > 0 && (
        <ul class="inspector__notes">
          {node.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      {connections.length > 0 && (
        <>
          <p class="kicker">Connections</p>
          <ul class="inspector__connections">
            {connections.map((edge) => (
              <li key={edge.id}>
                <button
                  type="button"
                  class="inspector__link"
                  onClick={() => {
                    onSelect({ kind: 'edge', id: edge.id });
                  }}
                >
                  {edge.from === node.id ? '→ ' : '← '}
                  {nodeLabel(edge.from === node.id ? edge.to : edge.from)}{' '}
                  <span class="muted">· {edge.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p class="kicker">Evidence</p>
      <EvidenceList repository={repository} evidence={node.evidence} />
    </div>
  );
};
