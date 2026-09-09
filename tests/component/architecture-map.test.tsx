import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { ArchitectureMap, type Lens, type MapPanel } from '../../src/islands/map/ArchitectureMap';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const system = defineSystem(fixtureSystem);

const panel = (systemId: string, name: string): MapPanel => ({
  systemId,
  name,
  shortName: name,
  href: `/systems/${systemId}/`,
  description: system.tagline,
  nodes: system.nodes.map(({ id, label, kind }) => ({ id, label, kind })),
  edges: system.edges.map(({ id, from, to, label, protocol }) => ({
    id,
    from,
    to,
    label,
    protocol,
  })),
});

const panels = [panel('ledger', 'Ledger'), panel('mirror', 'Mirror')];

const lenses: Lens[] = [
  {
    id: 'record-first',
    name: 'Record before answering',
    description: 'The row is written before the response leaves.',
    systems: {
      ledger: {
        presence: 'present',
        note: 'The API writes the entry in one transaction.',
        nodes: ['api', 'database'],
        evidence: [{ href: 'https://example.test/ledger/src/api.ts', label: 'src/api.ts' }],
      },
      mirror: {
        presence: 'absent',
        note: 'The mirror only reads.',
        nodes: [],
        evidence: [{ href: 'https://example.test/mirror/README.md', label: 'README.md' }],
      },
    },
  },
];

const wideDrawing = (systemId: string): HTMLElement => {
  const svg = document.querySelector<HTMLElement>(
    `svg.schematic--horizontal[data-system="map-${systemId}"]`,
  );
  if (svg === null) {
    throw new Error(`the wide schematic of ${systemId} was not rendered`);
  }
  return svg;
};

const readingPanel = (container: Element): HTMLElement => {
  const panelElement = container.querySelector<HTMLElement>('.map__reading');
  if (panelElement === null) {
    throw new Error('the lens reading was not rendered');
  }
  return panelElement;
};

const litNodes = (systemId: string): string[] =>
  [...wideDrawing(systemId).querySelectorAll<SVGGElement>('[data-node][data-tone]')].map(
    (node) => node.dataset.node ?? '',
  );

afterEach(cleanup);

describe('ArchitectureMap', () => {
  it('draws every system with nothing lit and no lens selected', () => {
    render(<ArchitectureMap panels={panels} lenses={lenses} />);
    expect(screen.getByRole('radio', { name: 'No lens' })).toHaveProperty('checked', true);
    expect(litNodes('ledger')).toEqual([]);
    expect(litNodes('mirror')).toEqual([]);
    expect(screen.queryByText('The row is written before the response leaves.')).toBeNull();
  });

  it('lights the implementing nodes and shows the reading when a lens is chosen', () => {
    const { container } = render(<ArchitectureMap panels={panels} lenses={lenses} />);
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
    const reading = within(readingPanel(container));
    expect(reading.getByText('The API writes the entry in one transaction.')).toBeTruthy();
    expect(reading.getByText('Lit: API, PostgreSQL')).toBeTruthy();
    expect(reading.getByText('The mirror only reads.')).toBeTruthy();
    expect(reading.getByRole('link', { name: 'src/api.ts' }).getAttribute('href')).toBe(
      'https://example.test/ledger/src/api.ts',
    );
    const badges = reading.getAllByText(/present|absent/);
    expect(badges.map((badge) => badge.getAttribute('data-tone'))).toEqual(['ok', 'neutral']);
  });

  it('returns to the unlit drawings when No lens is chosen again', () => {
    render(<ArchitectureMap panels={panels} lenses={lenses} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    expect(litNodes('ledger')).toEqual(['api', 'database']);
    fireEvent.click(screen.getByRole('radio', { name: 'No lens' }));
    expect(litNodes('ledger')).toEqual([]);
    expect(screen.queryByText('The row is written before the response leaves.')).toBeNull();
  });

  it('keeps the presence matrix out of the island', () => {
    const { container } = render(<ArchitectureMap panels={panels} lenses={lenses} />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('has no accessibility violations axe can detect without layout', async () => {
    const { container } = render(<ArchitectureMap panels={panels} lenses={lenses} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Record before answering' }));
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
