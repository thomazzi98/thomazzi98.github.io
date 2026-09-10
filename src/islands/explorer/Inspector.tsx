import { Fragment } from 'preact';
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

// A path may break after any of its slashes, never inside a file name.
const BreakablePath = ({ text }: { text: string }) => (
  <>
    {text.split('/').map((piece, index) => (
      <Fragment key={`${String(index)}-${piece}`}>
        {index > 0 && (
          <>
            /<wbr />
          </>
        )}
        {piece}
      </Fragment>
    ))}
  </>
);

const EvidenceList = ({
  repository,
  evidence,
}: {
  repository: Repository;
  evidence: readonly Evidence[];
}) => (
  <ul class="inspector__evidence">
    {evidence.map((entry) => (
      <li key={`${evidenceLabel(entry)}${entry.note ?? ''}`} class="evidence">
        <a href={evidenceUrl(repository, entry)} rel="noopener">
          <BreakablePath text={evidenceLabel(entry)} />
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

// The title line is the one live region of the inspector, so a selection announces its number,
// kind and name and nothing more; the title takes focus when a button inside the inspector
// replaced the view that held it.
const Head = ({ kicker, title }: { kicker: string; title: string }) => (
  <div class="inspector__head" aria-live="polite">
    <p class="kicker">{kicker}</p>
    <h3 class="inspector__title" tabIndex={-1}>
      {title}
    </h3>
  </div>
);

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
        <Head kicker="Inspector" title="Nothing selected" />
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
        <Head kicker={`Edge · ${protocolName[edge.protocol]}`} title={edge.label} />
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
      <Head
        kicker={`${String(nodes.indexOf(node) + 1)} · ${kindName[node.kind]}`}
        title={node.label}
      />
      {node.stamp !== undefined && (
        <p>
          <span class="stamp">{node.stamp}</span>
        </p>
      )}
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
