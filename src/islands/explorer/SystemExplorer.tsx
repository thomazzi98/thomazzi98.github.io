import { useSignal } from '@preact/signals';
import type { TargetedKeyboardEvent, TargetedMouseEvent } from 'preact';
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

const selectionFromHash = (hash: string): Selection | undefined => {
  const match = /^#(node|edge)-(.+)$/.exec(hash);
  if (match === null) {
    return undefined;
  }
  return {
    kind: match[1] === 'edge' ? 'edge' : 'node',
    id: decodeURIComponent(match[2] ?? ''),
  };
};

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
  // Until the island hydrates the drawing is plain graphics and the parts list is plain text, so
  // a reader without JavaScript never meets a control that does nothing.
  const ready = useSignal(false);
  const narrow = useMediaQuery(narrowQuery);
  const dialogReference = useRef<HTMLDialogElement>(null);
  const asideReference = useRef<HTMLElement>(null);
  const keepSelectionOnClose = useRef(false);
  // A button inside the inspector replaces the view that held it, which would drop focus to the
  // body; the flag asks the next render to put focus on the new title instead.
  const focusTitleNext = useRef(false);
  const select = (next: Selection | undefined) => {
    selection.value = next;
  };
  const selectFromInspector = (next: Selection | undefined) => {
    focusTitleNext.current = true;
    select(next);
  };

  useEffect(() => {
    ready.value = true;
    const applyHash = () => {
      const next = selectionFromHash(window.location.hash);
      if (next === undefined) {
        return;
      }
      const exists =
        next.kind === 'node'
          ? nodes.some((node) => node.id === next.id)
          : edges.some((edge) => edge.id === next.id);
      if (exists) {
        selection.value = next;
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => {
      window.removeEventListener('hashchange', applyHash);
    };
    // The parts of a system do not change while the island lives.
  }, []);

  useEffect(() => {
    const dialog = dialogReference.current;
    if (dialog === null) {
      return;
    }
    if (!narrow) {
      // The aside takes over when the viewport widens; the selection survives the hand-over.
      if (dialog.open) {
        keepSelectionOnClose.current = true;
        dialog.close();
      }
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

  useEffect(() => {
    if (!focusTitleNext.current) {
      return;
    }
    focusTitleNext.current = false;
    const host = narrow ? dialogReference.current : asideReference.current;
    host?.querySelector<HTMLElement>('.inspector__title')?.focus();
  }, [selection.value, narrow]);

  const onExplorerKey = (event: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && selection.value !== undefined) {
      select(undefined);
    }
  };

  const onSheetClose = () => {
    if (keepSelectionOnClose.current) {
      keepSelectionOnClose.current = false;
      return;
    }
    select(undefined);
  };

  const onBackdropClick = (event: TargetedMouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogReference.current) {
      select(undefined);
    }
  };

  const inspector = (
    <Inspector
      repository={repository}
      nodes={nodes}
      edges={edges}
      selection={selection.value}
      onSelect={selectFromInspector}
      technologyNames={technologyNames}
    />
  );

  return (
    <div class="explorer" data-selected={selection.value?.kind} onKeyDown={onExplorerKey}>
      <div class="explorer__drawing">
        <SchematicPair
          systemId={systemId}
          title={title}
          description={description}
          nodes={nodes}
          edges={edges}
          selected={selection.value}
          onSelect={ready.value ? select : undefined}
        />
      </div>
      <aside ref={asideReference} class="explorer__inspector" aria-label="Inspector">
        {inspector}
      </aside>
      <dialog
        ref={dialogReference}
        class="explorer__sheet"
        aria-label="Inspector"
        onClose={onSheetClose}
        onClick={onBackdropClick}
      >
        <div class="explorer__sheet-head">
          <span class="kicker">Inspector</span>
          <button
            type="button"
            class="control explorer__close"
            onClick={() => {
              select(undefined);
            }}
          >
            Close
          </button>
        </div>
        <div class="explorer__sheet-body">{inspector}</div>
      </dialog>
      <div class="explorer__parts">
        <p class="kicker">Parts list</p>
        {/* Outside the inspector, because the layout hides the inspector when scripts are off. */}
        <noscript>
          <p class="muted">
            With JavaScript the drawing and this list open an inspector; every part and connection
            is named inside the drawing.
          </p>
        </noscript>
        <PartsList
          nodes={nodes}
          selection={selection.value}
          onSelect={select}
          ready={ready.value}
        />
      </div>
    </div>
  );
};
