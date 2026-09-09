import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '../../src/islands/palette/CommandPalette';
import { buildPaletteIndex, parsePaletteIndex } from '../../src/lib/palette-index';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const index = buildPaletteIndex([defineSystem(fixtureSystem)]);

const renderPalette = () => {
  const navigate = vi.fn<(href: string) => void>();
  const rendered = render(<CommandPalette index={index} navigate={navigate} />);
  return { ...rendered, navigate };
};

const trigger = () => screen.getByRole('button', { name: 'Search' });
const input = () => screen.getByRole('combobox', { name: 'Jump to', hidden: true });
const dialog = (container: Element): HTMLDialogElement => {
  const element = container.querySelector<HTMLDialogElement>('dialog.palette');
  if (element === null) {
    throw new Error('the palette dialog was not rendered');
  }
  return element;
};

const respondWith = (body: unknown, succeeded = true) =>
  vi.fn<typeof fetch>(() =>
    Promise.resolve({
      ok: succeeded,
      status: succeeded ? 200 : 500,
      json: () => Promise.resolve(body),
    } as Response),
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CommandPalette', () => {
  it('reads the index from its source the first time it opens, once', async () => {
    const fetchIndex = respondWith(JSON.parse(JSON.stringify(index)));
    vi.stubGlobal('fetch', fetchIndex);
    render(<CommandPalette source="/palette.json" />);
    fireEvent.click(trigger());
    expect(fetchIndex).toHaveBeenCalledWith('/palette.json');
    expect(await screen.findByRole('group', { name: 'Systems' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(trigger());
    expect(fetchIndex).toHaveBeenCalledTimes(1);
  });

  it('says so when the index cannot be read', async () => {
    vi.stubGlobal('fetch', respondWith({}, false));
    render(<CommandPalette />);
    fireEvent.click(trigger());
    expect(await screen.findByText('The index could not be loaded.')).toBeTruthy();
  });

  it('rejects an index of another shape', () => {
    expect(parsePaletteIndex(JSON.parse(JSON.stringify(index)))).toHaveLength(index.length);
    expect(() => parsePaletteIndex([{ kind: 'page', title: 'Home' }])).toThrow(/shape/);
    expect(() => parsePaletteIndex({ entries: [] })).toThrow(/shape/);
  });

  it('opens with Control K and shows the index grouped by kind', () => {
    const { container } = renderPalette();
    expect(dialog(container).open).toBe(false);
    expect(input().getAttribute('aria-expanded')).toBe('false');
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(dialog(container).open).toBe(true);
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(input());
    const listbox = within(screen.getByRole('listbox', { name: 'Results' }));
    expect(listbox.getByRole('group', { name: 'Pages' })).toBeTruthy();
    expect(listbox.getByRole('group', { name: 'Systems' })).toBeTruthy();
    expect(listbox.getAllByRole('option')).toHaveLength(10);
  });

  it('opens when a slash is typed outside an input and toggles closed with the shortcut', () => {
    const { container } = renderPalette();
    fireEvent.keyDown(window, { key: '/' });
    expect(dialog(container).open).toBe(true);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(dialog(container).open).toBe(false);
  });

  it('filters the results as the query changes and says when nothing matches', () => {
    renderPalette();
    fireEvent.click(trigger());
    fireEvent.input(input(), { target: { value: 'postgres' } });
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'PostgreSQLLedger',
      'PostgreSQL is the only storeLedger · durability',
    ]);
    expect(screen.getByRole('status').textContent).toBe('2 results');
    fireEvent.input(input(), { target: { value: 'nothing here' } });
    expect(within(screen.getByRole('listbox')).queryAllByRole('option')).toEqual([]);
    expect(screen.getByRole('status').textContent).toBe('Nothing matches “nothing here”.');
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('moves the active option with the arrow keys and wraps at both ends', () => {
    renderPalette();
    fireEvent.click(trigger());
    fireEvent.input(input(), { target: { value: 'ledger' } });
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.length).toBeGreaterThan(2);
    expect(input().getAttribute('aria-activedescendant')).toBe(options[0]?.id);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().getAttribute('aria-activedescendant')).toBe(options[1]?.id);
    expect(options[1]?.getAttribute('aria-selected')).toBe('true');
    expect(options[0]?.getAttribute('aria-selected')).toBe('false');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input().getAttribute('aria-activedescendant')).toBe(options.at(-1)?.id);
    fireEvent.keyDown(input(), { key: 'End' });
    expect(input().getAttribute('aria-activedescendant')).toBe(options.at(-1)?.id);
    fireEvent.keyDown(input(), { key: 'Home' });
    expect(input().getAttribute('aria-activedescendant')).toBe(options[0]?.id);
  });

  it('navigates to the active entry with Enter and to a clicked entry', () => {
    const { container, navigate } = renderPalette();
    fireEvent.click(trigger());
    fireEvent.input(input(), { target: { value: 'record an entry' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/systems/ledger/#flow-record-entry');
    expect(dialog(container).open).toBe(false);
    fireEvent.click(trigger());
    fireEvent.input(input(), { target: { value: 'decisions' } });
    fireEvent.click(
      within(screen.getByRole('listbox')).getByRole('option', { name: /^Decisions/ }),
    );
    expect(navigate).toHaveBeenLastCalledWith('/decisions/');
  });

  it('closes with Escape and returns focus to the trigger', () => {
    const { container } = renderPalette();
    trigger().focus();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(document.activeElement).toBe(input());
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(dialog(container).open).toBe(false);
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });

  it('closes from its Close button', () => {
    const { container } = renderPalette();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog(container).open).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('has no accessibility violations axe can detect without layout', async () => {
    const { container } = renderPalette();
    fireEvent.click(trigger());
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
