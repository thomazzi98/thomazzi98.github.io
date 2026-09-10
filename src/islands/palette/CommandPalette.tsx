import { useSignal } from '@preact/signals';
import type { TargetedEvent, TargetedKeyboardEvent, TargetedMouseEvent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import {
  paletteKindLabels,
  paletteKinds,
  parsePaletteIndex,
  searchPalette,
  type PaletteEntry,
  type PaletteKind,
} from '../../lib/palette-index';

export interface CommandPaletteProps {
  // Given directly in tests; on the site the index is read from `source` the first time the palette opens.
  readonly index?: readonly PaletteEntry[];
  readonly source?: string;
  readonly limit?: number;
  readonly navigate?: (href: string) => void;
}

type IndexState = 'idle' | 'loading' | 'ready' | 'failed';

interface PlacedEntry {
  readonly entry: PaletteEntry;
  readonly position: number;
}

interface ResultGroup {
  readonly kind: PaletteKind;
  readonly entries: readonly PlacedEntry[];
}

const inputId = 'palette-input';
const listId = 'palette-results';
const labelId = 'palette-label';
const hintId = 'palette-hint';
const optionId = (position: number) => `palette-option-${String(position)}`;
const groupId = (kind: PaletteKind) => `palette-group-${kind}`;

const applePlatform = /Mac|iPhone|iPad|iPod/;

// Focus follows the choice, as it does after a skip link, so the next Tab starts at the target and
// the closing dialog does not pull the page back up to the trigger.
const focusTarget = (element: HTMLElement) => {
  if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }
  element.focus({ preventScroll: true });
};

// A choice on the page already open only moves the hash; the islands listen for hashchange, so a
// repeated choice of the same target must still produce one.
const defaultNavigate = (href: string) => {
  const target = new URL(href, window.location.href);
  if (target.pathname !== window.location.pathname || target.hash === '') {
    window.location.assign(href);
    return;
  }
  const element = document.getElementById(target.hash.slice(1));
  if (window.location.hash === target.hash) {
    window.dispatchEvent(
      new HashChangeEvent('hashchange', { oldURL: target.href, newURL: target.href }),
    );
    if (element !== null && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView();
    }
  }
  window.location.hash = target.hash;
  if (element !== null) {
    focusTarget(element);
  }
};

const groupResults = (results: readonly PaletteEntry[]): ResultGroup[] => {
  let position = 0;
  return paletteKinds.flatMap((kind) => {
    const entries = results
      .filter((entry) => entry.kind === kind)
      .map((entry): PlacedEntry => ({ entry, position: position++ }));
    return entries.length === 0 ? [] : [{ kind, entries }];
  });
};

const wrap = (value: number, count: number) => ((value % count) + count) % count;

const showDialog = (dialog: HTMLDialogElement) => {
  if (dialog.open) {
    return;
  }
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
    return;
  }
  dialog.setAttribute('open', '');
};

export const CommandPalette = ({
  index,
  source = '/palette.json',
  limit = 10,
  navigate = defaultNavigate,
}: CommandPaletteProps) => {
  const entries = useSignal<readonly PaletteEntry[]>(index ?? []);
  const indexState = useSignal<IndexState>(index === undefined ? 'idle' : 'ready');
  const open = useSignal(false);
  const query = useSignal('');
  const active = useSignal(0);
  const apple = useSignal(false);
  const dialogReference = useRef<HTMLDialogElement>(null);
  const triggerReference = useRef<HTMLButtonElement>(null);
  const inputReference = useRef<HTMLInputElement>(null);
  // The close event arrives after the navigation a choice starts, so a dismissal is remembered here.
  const returnFocus = useRef(true);

  const groups = groupResults(searchPalette(entries.value, query.value, limit));
  const ordered = groups.flatMap((group) => group.entries);
  const activeEntry = ordered[active.value]?.entry;

  const finishClose = () => {
    open.value = false;
    if (returnFocus.current) {
      triggerReference.current?.focus();
    }
    returnFocus.current = true;
  };

  const closePalette = (dismissed = true) => {
    returnFocus.current = dismissed;
    const dialog = dialogReference.current;
    if (dialog !== null && dialog.open && typeof dialog.close === 'function') {
      dialog.close();
      return;
    }
    dialog?.removeAttribute('open');
    finishClose();
  };

  const loadIndex = () => {
    if (indexState.value !== 'idle') {
      return;
    }
    indexState.value = 'loading';
    void fetch(source)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`${source} answered ${String(response.status)}`);
        }
        const body: unknown = await response.json();
        entries.value = parsePaletteIndex(body);
        indexState.value = 'ready';
      })
      .catch(() => {
        indexState.value = 'failed';
      });
  };

  const openPalette = () => {
    query.value = '';
    active.value = 0;
    open.value = true;
    loadIndex();
  };

  const statusText = () => {
    if (indexState.value === 'loading') {
      return 'Loading the index.';
    }
    if (indexState.value === 'failed') {
      return 'The index could not be loaded.';
    }
    if (ordered.length === 0) {
      return `Nothing matches “${query.value}”.`;
    }
    return <span class="sr-only">{String(ordered.length)} results</span>;
  };

  const togglePalette = () => {
    if (open.value) {
      closePalette();
      return;
    }
    openPalette();
  };

  const goTo = (href: string) => {
    closePalette(false);
    navigate(href);
  };

  useEffect(() => {
    apple.value = applePlatform.test(navigator.userAgent);
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
    // The listener reads the signals at event time, so it is installed once.
  }, []);

  useEffect(() => {
    const dialog = dialogReference.current;
    if (dialog === null || !open.value) {
      return;
    }
    showDialog(dialog);
    inputReference.current?.focus();
  }, [open.value]);

  useEffect(() => {
    const option = document.getElementById(optionId(active.value));
    if (option !== null && typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [active.value, query.value]);

  const onInput = (event: TargetedEvent<HTMLInputElement>) => {
    query.value = event.currentTarget.value;
    active.value = 0;
  };

  const onInputKey = (event: TargetedKeyboardEvent<HTMLInputElement>) => {
    const count = ordered.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (count > 0) {
        active.value = wrap(active.value + (event.key === 'ArrowDown' ? 1 : -1), count);
      }
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      active.value = event.key === 'Home' ? 0 : Math.max(0, count - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeEntry !== undefined) {
        goTo(activeEntry.href);
      }
    }
  };

  const onDialogKey = (event: TargetedKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  };

  const onBackdropClick = (event: TargetedMouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogReference.current) {
      closePalette();
    }
  };

  const activeDescendant =
    open.value && activeEntry !== undefined ? optionId(active.value) : undefined;

  return (
    <>
      <button
        ref={triggerReference}
        type="button"
        class="control palette__trigger"
        aria-haspopup="dialog"
        aria-keyshortcuts={apple.value ? 'Meta+K' : 'Control+K'}
        onClick={togglePalette}
      >
        <span>Search</span>
        <kbd class="palette__keys" aria-hidden="true">
          <kbd>{apple.value ? '⌘' : 'Ctrl'}</kbd>
          <kbd>K</kbd>
        </kbd>
      </button>
      <dialog
        ref={dialogReference}
        class="palette"
        aria-labelledby={labelId}
        onClose={finishClose}
        onKeyDown={onDialogKey}
        onClick={onBackdropClick}
      >
        <div class="palette__frame">
          <form
            class="palette__form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <label id={labelId} for={inputId} class="kicker">
              Jump to
            </label>
            <input
              ref={inputReference}
              id={inputId}
              class="palette__input"
              type="text"
              role="combobox"
              aria-expanded={open.value}
              aria-controls={listId}
              aria-activedescendant={activeDescendant}
              aria-autocomplete="list"
              aria-describedby={hintId}
              autocomplete="off"
              spellcheck={false}
              placeholder="A page, a system, a part, a flow, a decision"
              value={query.value}
              onInput={onInput}
              onKeyDown={onInputKey}
            />
          </form>
          <ul id={listId} class="palette__results" role="listbox" aria-label="Results">
            {groups.map((group) => (
              <li
                key={group.kind}
                class="palette__group"
                role="group"
                aria-labelledby={groupId(group.kind)}
              >
                <span id={groupId(group.kind)} class="palette__kind">
                  {paletteKindLabels[group.kind]}
                </span>
                {group.entries.map(({ entry, position }) => (
                  <div
                    key={`${entry.href}#${entry.title}`}
                    id={optionId(position)}
                    class="palette__option"
                    role="option"
                    aria-selected={position === active.value}
                    onMouseMove={() => {
                      active.value = position;
                    }}
                    onClick={() => {
                      goTo(entry.href);
                    }}
                  >
                    <span class="palette__title">{entry.title}</span>
                    <span class="palette__subtitle">{entry.subtitle}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <p class="palette__status" role="status" data-empty={ordered.length === 0}>
            {statusText()}
          </p>
          <div class="palette__foot">
            <p id={hintId} class="palette__hint">
              Finds pages, the three systems, their parts, flows and decisions. Arrow keys move,
              Enter opens, Escape closes.
            </p>
            <button
              type="button"
              class="control palette__close"
              onClick={() => {
                closePalette();
              }}
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
};
