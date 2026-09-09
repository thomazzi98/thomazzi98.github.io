import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { SystemExplorer } from '../../src/islands/explorer/SystemExplorer';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const system = defineSystem(fixtureSystem);

const renderExplorer = () =>
  render(
    <SystemExplorer
      systemId={system.id}
      title={`${system.name} architecture`}
      description={system.tagline}
      repository={system.repository}
      nodes={system.nodes}
      edges={system.edges}
    />,
  );

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
    expect(drawing.getByRole('button', { name: '3. PostgreSQL, store' })).toBeTruthy();
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
    const partsRow = screen.getByRole('button', { name: /03 PostgreSQL store/ });
    fireEvent.click(partsRow);
    expect(partsRow.getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('complementary')).getByText('Keeps the ledger.')).toBeTruthy();
  });

  it('has no accessibility violations axe can detect without layout', async () => {
    const { container } = renderExplorer();
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
