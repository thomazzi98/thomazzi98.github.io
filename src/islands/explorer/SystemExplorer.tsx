import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import type { Repository, SystemEdge, SystemNode } from '../../systems/schema';
import type { Selection } from '../schematic/Schematic';
import { SchematicPair } from '../schematic/SchematicPair';
import { Inspector } from './Inspector';
import { PartsList } from './PartsList';
import { useMediaQuery } from './use-media-query';

export interface SystemExplorerProps {
  readonly systemId: string;
  readonly title: string;
  readonly description: string;
  readonly repository: Repository;
  readonly nodes: readonly SystemNode[];
  readonly edges: readonly SystemEdge[];
  readonly technologyNames?: Readonly<Record<string, string>>;
}

const narrowQuery = '(max-width: 48rem)';

export const SystemExplorer = ({
  systemId,
  title,
  description,
  repository,
  nodes,
  edges,
  technologyNames = {},
}: SystemExplorerProps) => {
  const selection = useSignal<Selection | undefined>(undefined);
  const narrow = useMediaQuery(narrowQuery);
  const dialogReference = useRef<HTMLDialogElement>(null);
  const select = (next: Selection | undefined) => {
    selection.value = next;
  };

  useEffect(() => {
    const match = /^#(node|edge)-(.+)$/.exec(window.location.hash);
    if (match === null) {
      return;
    }
    const kind = match[1] === 'edge' ? 'edge' : 'node';
    const id = decodeURIComponent(match[2] ?? '');
    const exists =
      kind === 'node' ? nodes.some((node) => node.id === id) : edges.some((edge) => edge.id === id);
    if (exists) {
      selection.value = { kind, id };
    }
    // The hash is read once, when the island mounts.
  }, []);

  useEffect(() => {
    const dialog = dialogReference.current;
    if (dialog === null || !narrow) {
      return;
    }
    if (selection.value === undefined) {
      if (dialog.open) {
        dialog.close();
      }
      return;
    }
    if (!dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }, [selection.value, narrow]);

  const inspector = (
    <Inspector
      repository={repository}
      nodes={nodes}
      edges={edges}
      selection={selection.value}
      onSelect={select}
      technologyNames={technologyNames}
    />
  );

  return (
    <div class="explorer" data-selected={selection.value?.kind}>
      <div class="explorer__drawing">
        <SchematicPair
          systemId={systemId}
          title={title}
          description={description}
          nodes={nodes}
          edges={edges}
          selected={selection.value}
          onSelect={select}
        />
      </div>
      <aside class="explorer__inspector" aria-live="polite" hidden={narrow}>
        {inspector}
      </aside>
      <dialog
        ref={dialogReference}
        class="explorer__sheet"
        aria-label="Inspector"
        onClose={() => {
          select(undefined);
        }}
      >
        {narrow && inspector}
        <button
          type="button"
          class="control explorer__close"
          onClick={() => {
            select(undefined);
          }}
        >
          Close
        </button>
      </dialog>
      <div class="explorer__parts">
        <p class="kicker">Parts list</p>
        <PartsList nodes={nodes} selection={selection.value} onSelect={select} />
      </div>
    </div>
  );
};
