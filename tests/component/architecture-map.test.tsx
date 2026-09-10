import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import axe from 'axe-core';
import { renderToString } from 'preact-render-to-string';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArchitectureMap, type Lens, type MapPanel } from '../../src/islands/map/ArchitectureMap';
import { toSchematicEdges, toSchematicNodes } from '../../src/systems/presentation';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const system = defineSystem(fixtureSystem);

const panel = (systemId: string, name: string): MapPanel => ({
  systemId,
  name,
  href: `/systems/${systemId}/`,
  description: system.tagline,
  nodes: toSchematicNodes(system.nodes),
  edges: toSchematicEdges(system.edges),
});

const panels = [panel('ledger', 'Ledger'), panel('mirror', 'Mirror')];

const lenses: Lens[] = [
  {
    id: 'record-first',
    name: 'Record before answering',
    systems: { ledger: ['api', 'database'], mirror: [] },
  },
  {
    id: 'one-store',
    name: 'One durable store',
    systems: { ledger: ['database'], mirror: ['database'] },
  },
];

// The page renders one block per lens: the description and the lit lines in view, the notes and
// evidence behind a closed summary.
const readings = (
  <>
    <section class="map__reading-block" data-lens-reading="record-first" hidden>
      <p class="map__reading-head">
        <strong>Record before answering</strong>
      </p>
      <div class="map__reading-body">
        <div class="map__description" data-copy-of="#pattern-record-first [data-description]" />
        <dl class="map__lit">
          <div>
            <dt>Ledger</dt>
            <dd>Lit: API, PostgreSQL</dd>
          </div>
          <div>
            <dt>Mirror</dt>
            <dd>No part is lit: this lives in scripts and documents</dd>
          </div>
        </dl>
      </div>
      <div class="map__reading-foot">
        <details class="map__notes">
          <summary>Notes and evidence</summary>
          <dl class="map__notes-list">
            <div>
              <dt>Ledger</dt>
              <dd data-copy-of='#pattern-record-first [data-system="ledger"]' />
            </div>
          </dl>
        </details>
        <a class="kicker map__matrix-link" href="#pattern-record-first">
          lens · in the matrix <span class="sr-only">for Record before answering</span>
        </a>
      </div>
    </section>
    <section class="map__reading-block" data-lens-reading="one-store" hidden>
      <div class="map__description" data-copy-of="#pattern-one-store [data-description]" />
    </section>
  </>
);

// The page prints the notes once, in the matrix; the island borrows them from there.
const matrix = `
  <table>
    <tbody>
      <tr id="pattern-record-first">
        <th><div data-description><p>The row is written before the response leaves.</p></div></th>
        <td data-system="ledger"><span class="badge">present</span><p>The API writes the entry in one transaction.</p><p class="evidence"><a href="https://example.test/ledger/src/api.ts">src/api.ts</a></p></td>
      </tr>
      <tr id="pattern-one-store">
        <th><div data-description><p>Everything durable lives in one place.</p></div></th>
        <td data-system="ledger"><p>One PostgreSQL.</p></td>
      </tr>
    </tbody>
  </table>`;

const mountMatrix = () => {
  const host = document.createElement('div');
  host.id = 'matrix-host';
  host.innerHTML = matrix;
  document.body.append(host);
};

const renderMap = () => {
  mountMatrix();
  return render(<ArchitectureMap panels={panels} lenses={lenses} readings={readings} />);
};

const wideDrawing = (systemId: string): HTMLElement => {
  const svg = document.querySelector<HTMLElement>(
    `svg.schematic--horizontal[data-system="map-${systemId}"]`,
  );
  if (svg === null) {
    throw new Error(`the wide schematic of ${systemId} was not rendered`);
  }
  return svg;
};

const readingRegion = (container: Element): HTMLElement => {
  const region = container.querySelector<HTMLElement>('.map__reading');
  if (region === null) {
    throw new Error('the lens reading region was not rendered');
  }
  return region;
};

const visibleReadings = (container: Element): string[] =>
  [...readingRegion(container).querySelectorAll<HTMLElement>('[data-lens-reading]')]
    .filter((block) => !block.hidden)
    .map((block) => block.dataset.lensReading ?? '');

const litNodes = (systemId: string): string[] =>
  [...wideDrawing(systemId).querySelectorAll<SVGGElement>('[data-node][data-tone]')].map(
    (node) => node.dataset.node ?? '',
  );

const lensSelect = () => screen.getByRole('combobox', { name: 'Pattern lens' });

afterEach(() => {
  cleanup();
  document.getElementById('matrix-host')?.remove();
});

describe('ArchitectureMap', () => {
  it('renders the lens controls visible before hydration, with the note under noscript', () => {
    const markup = renderToString(
      <ArchitectureMap panels={panels} lenses={lenses} readings={readings} />,
    );
    expect(markup).toMatch(/<fieldset(?![^>]*\bhidden)[^>]*class="map__lenses"/);
    expect(markup).toContain('<select id="architecture-lens-select"');
    expect(markup).toMatch(
      /<\/fieldset>\s*<noscript>[^<]*<p[^>]*>[^<]*needs JavaScript.*<\/noscript>/s,
    );
    expect(markup).toContain('aria-live="polite"');
  });

  it('draws every system with nothing lit, no lens selected and no reading shown', () => {
    const { container } = renderMap();
    expect(screen.getByRole('radio', { name: 'No lens' })).toHaveProperty('checked', true);
    expect(litNodes('ledger')).toEqual([]);
    expect(litNodes('mirror')).toEqual([]);
    expect(visibleReadings(container)).toEqual([]);
  });

  it('keeps the reading between the selector and the drawings', () => {
    const { container } = renderMap();
    const fieldset = container.querySelector('fieldset.map__lenses');
    const region = readingRegion(container);
    const boards = container.querySelector('.map__boards');
    if (fieldset === null || boards === null) {
      throw new Error('the map did not render its selector and boards');
    }
    expect(
      fieldset.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(region.compareDocumentPosition(boards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('lights the implementing nodes and reveals one reading when a lens is chosen', () => {
    const { container } = renderMap();
    const lensRadio = screen.getByRole('radio', { name: 'Record before answering' });
    fireEvent.click(lensRadio);
    expect(lensRadio).toHaveProperty('checked', true);
    expect(container.querySelector('.map')?.getAttribute('data-lens')).toBe('record-first');
    expect(litNodes('ledger')).toEqual(['api', 'database']);
    expect(litNodes('mirror')).toEqual([]);
    for (const nodeId of ['api', 'database']) {
      expect(
        wideDrawing('ledger').querySelector(`[data-node="${nodeId}"]`)?.getAttribute('data-tone'),
      ).toBe('ok');
    }
    expect(visibleReadings(container)).toEqual(['record-first']);
    const reading = within(readingRegion(container));
    expect(reading.getByText('The row is written before the response leaves.')).toBeTruthy();
    expect(reading.getByText('The API writes the entry in one transaction.')).toBeTruthy();
    expect(reading.getByRole('link', { name: 'src/api.ts' }).getAttribute('href')).toBe(
      'https://example.test/ledger/src/api.ts',
    );
    expect(document.querySelectorAll('#matrix-host td[data-system="ledger"] p')).toHaveLength(3);
    expect(screen.getByText('2 of 3 parts lit')).toBeTruthy();
    expect(screen.getByText('No part lit of 3')).toBeTruthy();
  });

  it('keeps the revealed reading compact: description and lit lines shown, notes closed', () => {
    const { container } = renderMap();
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    const block = container.querySelector<HTMLElement>('[data-lens-reading="record-first"]');
    if (block === null) {
      throw new Error('the reading block was not rendered');
    }
    const notes = block.querySelector<HTMLDetailsElement>('details.map__notes');
    if (notes === null) {
      throw new Error('the reading did not render its notes');
    }
    const shown = within(block);
    expect(block.hidden).toBe(false);
    expect(notes.open).toBe(false);
    expect(shown.getByText('The row is written before the response leaves.')).toBeTruthy();
    expect(shown.getByText('Lit: API, PostgreSQL')).toBeTruthy();
    expect(shown.getByText('No part is lit: this lives in scripts and documents')).toBeTruthy();
    expect(shown.getByText('Notes and evidence').tagName).toBe('SUMMARY');
    // The note and its evidence are borrowed into the closed notes, not printed above them.
    const note = shown.getByText('The API writes the entry in one transaction.');
    expect(notes.contains(note)).toBe(true);
    expect(notes.contains(shown.getByRole('link', { name: 'src/api.ts', hidden: true }))).toBe(
      true,
    );
    expect(block.querySelector('.map__reading-body details')).toBeNull();
    expect(
      shown.getByRole('link', { name: 'lens · in the matrix for Record before answering' }),
    ).toBeTruthy();
  });

  it('swaps the reading and the lit parts when another lens is chosen, borrowing once', () => {
    const { container } = renderMap();
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    fireEvent.click(screen.getByRole('radio', { name: 'One durable store' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    fireEvent.click(screen.getByRole('radio', { name: 'One durable store' }));
    expect(visibleReadings(container)).toEqual(['one-store']);
    expect(
      within(readingRegion(container)).getAllByText('Everything durable lives in one place.'),
    ).toHaveLength(1);
    expect(litNodes('ledger')).toEqual(['database']);
    expect(litNodes('mirror')).toEqual(['database']);
  });

  it('scrolls a reading that is not wholly below the selector to sit right under it', () => {
    const { container } = renderMap();
    const fieldset = container.querySelector<HTMLElement>('fieldset.map__lenses');
    const block = container.querySelector<HTMLElement>('[data-lens-reading="record-first"]');
    if (fieldset === null || block === null) {
      throw new Error('the map did not render its selector and readings');
    }
    const scrollIntoView = vi.fn();
    block.scrollIntoView = scrollIntoView;
    fieldset.getBoundingClientRect = () => ({ top: 0, bottom: 120 }) as DOMRect;
    Object.defineProperty(fieldset, 'offsetHeight', { value: 120 });
    // Wholly visible under the selector: nothing moves.
    block.getBoundingClientRect = () => ({ top: 140, bottom: 500 }) as DOMRect;
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    expect(scrollIntoView).not.toHaveBeenCalled();
    // Its head is hidden under the selector: it comes back to the top, not the nearest edge.
    fireEvent.click(screen.getByRole('radio', { name: 'No lens' }));
    block.getBoundingClientRect = () => ({ top: -300, bottom: 1400 }) as DOMRect;
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(block.style.scrollMarginTop).toBe('120px');
  });

  it('drives the same lens from the select that phones show', () => {
    const { container } = renderMap();
    fireEvent.change(lensSelect(), { target: { value: 'one-store' } });
    expect(screen.getByRole('radio', { name: 'One durable store' })).toHaveProperty(
      'checked',
      true,
    );
    expect(litNodes('mirror')).toEqual(['database']);
    expect(visibleReadings(container)).toEqual(['one-store']);
    fireEvent.click(screen.getByRole('radio', { name: 'No lens' }));
    expect(lensSelect()).toHaveProperty('value', '');
  });

  it('returns to the unlit drawings when No lens is chosen again', () => {
    const { container } = renderMap();
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    expect(litNodes('ledger')).toEqual(['api', 'database']);
    fireEvent.click(screen.getByRole('radio', { name: 'No lens' }));
    expect(litNodes('ledger')).toEqual([]);
    expect(visibleReadings(container)).toEqual([]);
    expect(screen.getAllByText('3 parts · 2 connections')).toHaveLength(2);
  });

  it('keeps the presence matrix out of the island', () => {
    const { container } = renderMap();
    expect(container.querySelector('table')).toBeNull();
  });

  it('has no accessibility violations axe can detect without layout', async () => {
    const { container } = renderMap();
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
