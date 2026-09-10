import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import axe from 'axe-core';
import { renderToString } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import { SystemExplorer } from '../../src/islands/explorer/SystemExplorer';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const system = defineSystem({
  ...fixtureSystem,
  nodes: fixtureSystem.nodes.map((node) =>
    node.id === 'database' ? { ...node, stamp: 'unused' } : node,
  ),
});

const renderExplorer = (subject = system) =>
  render(
    <SystemExplorer
      systemId={subject.id}
      title={`${subject.name} architecture`}
      description={subject.tagline}
      repository={subject.repository}
      nodes={subject.nodes}
      edges={subject.edges}
    />,
  );

const wideSystem = defineSystem({
  ...fixtureSystem,
  nodes: [
    ...fixtureSystem.nodes,
    ...[...Array(10).keys()].map((index) => ({
      id: `worker-${String(index)}`,
      label: `Worker ${String(index)}`,
      kind: 'process' as const,
      purpose: 'Polls.',
      evidence: [{ path: 'src/worker.ts' }],
    })),
  ],
});

const wideDrawing = (container: Element): HTMLElement => {
  const svg = container.querySelector<HTMLElement>('svg.schematic--horizontal');
  if (svg === null) {
    throw new Error('the wide schematic was not rendered');
  }
  return svg;
};

afterEach(cleanup);

describe('SystemExplorer', () => {
  it('renders every node as a named control with its callout number', () => {
    const { container } = renderExplorer();
    const drawing = within(wideDrawing(container));
    expect(drawing.getByRole('button', { name: '1. Client, actor' })).toBeTruthy();
    expect(drawing.getByRole('button', { name: '2. API, process' })).toBeTruthy();
    expect(drawing.getByRole('button', { name: '3. PostgreSQL, store, unused' })).toBeTruthy();
  });

  it('moves focus between nodes with the arrow keys and selects with Enter', () => {
    const { container } = renderExplorer();
    const drawing = within(wideDrawing(container));
    const client = drawing.getByRole('button', { name: '1. Client, actor' });
    const api = drawing.getByRole('button', { name: '2. API, process' });
    expect(client.getAttribute('tabindex')).toBe('0');
    expect(api.getAttribute('tabindex')).toBe('-1');
    fireEvent.keyDown(client, { key: 'ArrowRight' });
    expect(api.getAttribute('tabindex')).toBe('0');
    expect(client.getAttribute('tabindex')).toBe('-1');
    fireEvent.keyDown(api, { key: 'Enter' });
    expect(api.getAttribute('aria-pressed')).toBe('true');
    const inspector = within(screen.getByRole('complementary'));
    expect(inspector.getByText('Accepts requests.')).toBeTruthy();
    expect(inspector.getByRole('link', { name: 'src/api.ts' }).getAttribute('href')).toBe(
      `https://github.com/thomazzi98/ledger/blob/${'a'.repeat(40)}/src/api.ts`,
    );
  });

  it('opens an edge from the inspector and shows its protocol and evidence', () => {
    const { container } = renderExplorer();
    const drawing = within(wideDrawing(container));
    fireEvent.click(drawing.getByRole('button', { name: '2. API, process' }));
    const inspector = within(screen.getByRole('complementary'));
    fireEvent.click(inspector.getByRole('button', { name: /→ PostgreSQL · INSERT entry/ }));
    expect(inspector.getByText('Edge · SQL over a database connection')).toBeTruthy();
    expect(
      inspector.getByRole('link', { name: 'src/repository.ts:5-9' }).getAttribute('href'),
    ).toMatch(/src\/repository\.ts#L5-L9$/);
  });

  it('clears the selection with Escape and toggles it from the parts list', () => {
    const { container } = renderExplorer();
    const drawing = within(wideDrawing(container));
    const client = drawing.getByRole('button', { name: '1. Client, actor' });
    fireEvent.keyDown(client, { key: 'Enter' });
    expect(client.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(client, { key: 'Escape' });
    expect(client.getAttribute('aria-pressed')).toBe('false');
    const partsRow = screen.getByRole('button', { name: /03 PostgreSQL unused store/ });
    fireEvent.click(partsRow);
    expect(partsRow.getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('complementary')).getByText('Keeps the ledger.')).toBeTruthy();
  });

  it('reaches the edges after the last node with the arrow keys and toggles them with Enter', () => {
    const { container } = renderExplorer();
    const drawing = within(wideDrawing(container));
    const database = drawing.getByRole('button', { name: '3. PostgreSQL, store, unused' });
    const request = drawing.getByRole('button', { name: 'Client to API, POST /entries, HTTPS' });
    const insert = drawing.getByRole('button', {
      name: 'API to PostgreSQL, INSERT entry, SQL over a database connection',
    });
    fireEvent.keyDown(database, { key: 'ArrowRight' });
    expect(request.getAttribute('tabindex')).toBe('0');
    expect(database.getAttribute('tabindex')).toBe('-1');
    fireEvent.keyDown(request, { key: 'End' });
    expect(insert.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(insert, { key: 'Enter' });
    expect(insert.getAttribute('aria-pressed')).toBe('true');
    const inspector = within(screen.getByRole('complementary'));
    expect(inspector.getByText('Edge · SQL over a database connection')).toBeTruthy();
    fireEvent.keyDown(insert, { key: ' ' });
    expect(insert.getAttribute('aria-pressed')).toBe('false');
    fireEvent.keyDown(insert, { key: 'Home' });
    expect(drawing.getByRole('button', { name: '1. Client, actor' }).getAttribute('tabindex')).toBe(
      '0',
    );
  });

  it('clears the selection with Escape from inside the inspector', () => {
    const { container } = renderExplorer();
    const drawing = within(wideDrawing(container));
    fireEvent.click(drawing.getByRole('button', { name: '2. API, process' }));
    const inspector = within(screen.getByRole('complementary', { name: 'Inspector' }));
    const connection = inspector.getByRole('button', { name: /→ PostgreSQL · INSERT entry/ });
    fireEvent.keyDown(connection, { key: 'Escape' });
    expect(container.querySelector('.explorer')?.getAttribute('data-selected')).toBeNull();
    expect(inspector.getByRole('heading', { name: 'Inspector' })).toBeTruthy();
  });

  it('shows the stamp of a part in the drawing, the parts list and the inspector', () => {
    const { container } = renderExplorer();
    expect(container.querySelector('[data-node="database"] .schematic__stamp')?.textContent).toBe(
      'unused',
    );
    const partsRow = screen.getByRole('button', { name: /03 PostgreSQL unused store/ });
    expect(partsRow.querySelector('.stamp')?.textContent).toBe('unused');
    fireEvent.click(partsRow);
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(inspector.querySelector('.inspector .stamp')?.textContent).toBe('unused');
  });

  it('selects the part named by the hash when the hash changes', () => {
    const { container } = renderExplorer();
    window.location.hash = '#node-database';
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(container.querySelector('[data-node="database"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
    window.location.hash = '#edge-client-api';
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(container.querySelector('[data-edge="client-api"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
    window.location.hash = '';
  });

  it('keeps the inspector in the page on every viewport and closes the sheet with its control', () => {
    renderExplorer();
    const aside = screen.getByRole('complementary', { name: 'Inspector' });
    expect(aside.hasAttribute('hidden')).toBe(false);
    const sheet = document.querySelector('dialog.explorer__sheet');
    expect(sheet?.querySelector('.explorer__sheet-head .explorer__close')?.textContent).toBe(
      'Close',
    );
    expect(sheet?.querySelector('.explorer__sheet-body .inspector')).not.toBeNull();
  });

  it('scrolls a drawing of more than twelve parts sideways and says so', () => {
    const { container } = renderExplorer(wideSystem);
    const scroller = container.querySelector('.schematic-scroll');
    expect(scroller?.getAttribute('role')).toBe('region');
    expect(scroller?.getAttribute('aria-label')).toBe('Ledger architecture, scrolls sideways');
    expect(container.querySelector('.schematic-scroll__hint')?.textContent).toBe(
      'Full drawing · scrolls sideways',
    );
  });

  it('serves plain graphics and an inert parts list until it hydrates', () => {
    const html = renderToString(
      <SystemExplorer
        systemId={system.id}
        title={`${system.name} architecture`}
        description={system.tagline}
        repository={system.repository}
        nodes={system.nodes}
        edges={system.edges}
      />,
    );
    expect(html).not.toContain('role="button"');
    expect(html).not.toMatch(/<g[^>]*tabindex="0"/);
    expect(html).toContain('role="img"');
    expect(html.match(/class="parts__item"[^>]*disabled/g)).toHaveLength(3);
    const { container } = renderExplorer();
    expect(container.querySelectorAll('.parts__item:disabled')).toHaveLength(0);
    expect(container.querySelectorAll('svg [role="button"]').length).toBeGreaterThan(0);
  });

  it('has no accessibility violations axe can detect without layout', async () => {
    const { container } = renderExplorer();
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
