import type { SystemNode } from '../../systems/schema';
import { kindName } from '../schematic/protocol';
import type { Selection } from '../schematic/Schematic';

interface PartsListProps {
  readonly nodes: readonly SystemNode[];
  readonly selection: Selection | undefined;
  readonly onSelect: (selection: Selection | undefined) => void;
  readonly ready?: boolean;
}

// The number is the part's place in the list, which is also its callout in the wide drawing.
const Part = ({ node, index }: { node: SystemNode; index: number }) => (
  <>
    <span class="parts__number mono">{String(index + 1).padStart(2, '0')}</span>{' '}
    <span class="parts__label">
      {node.label}
      {node.stamp !== undefined && (
        <>
          {' '}
          <span class="stamp parts__stamp">{node.stamp}</span>
        </>
      )}
    </span>{' '}
    <span class="parts__kind kicker">{kindName[node.kind]}</span>
  </>
);

// Until the island runs the rows are plain text, so a reader without JavaScript meets a list,
// not buttons that do nothing.
export const PartsList = ({ nodes, selection, onSelect, ready = true }: PartsListProps) => (
  <ol class="parts">
    {nodes.map((node, index) => {
      const pressed = selection?.kind === 'node' && selection.id === node.id;
      return (
        <li key={node.id} id={`node-${node.id}`} class="parts__row">
          {ready ? (
            <button
              type="button"
              class="parts__item"
              aria-pressed={pressed}
              onClick={() => {
                onSelect(pressed ? undefined : { kind: 'node', id: node.id });
              }}
            >
              <Part node={node} index={index} />
            </button>
          ) : (
            <span class="parts__item">
              <Part node={node} index={index} />
            </span>
          )}
          <p class="parts__purpose muted">{node.purpose}</p>
        </li>
      );
    })}
  </ol>
);
