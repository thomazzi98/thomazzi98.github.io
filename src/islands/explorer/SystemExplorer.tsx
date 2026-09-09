import { useSignal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import type { Repository, SystemEdge, SystemNode } from '../../systems/schema';
import { Schematic, type Selection } from '../schematic/Schematic';
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
}

const narrowQuery = '(max-width: 48rem)';

export const SystemExplorer = ({
  systemId,
  title,
  description,
  repository,
  nodes,
  edges,
}: SystemExplorerProps) => {
  const selection = useSignal<Selection | undefined>(undefined);
  const narrow = useMediaQuery(narrowQuery);
  const dialogReference = useRef<HTMLDialogElement>(null);
  const select = (next: Selection | undefined) => {
    selection.value = next;
  };

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
    />
  );

  return (
    <div class="explorer" data-selected={selection.value?.kind}>
      <div class="explorer__drawing">
        <Schematic
          systemId={systemId}
          title={title}
          description={description}
          nodes={nodes}
          edges={edges}
          orientation="horizontal"
          selected={selection.value}
          onSelect={select}
        />
        <Schematic
          systemId={systemId}
          title={title}
          description={description}
          nodes={nodes}
          edges={edges}
          orientation="vertical"
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
