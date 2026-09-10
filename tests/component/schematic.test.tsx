import { cleanup, render } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { Schematic } from '../../src/islands/schematic/Schematic';
import { SchematicPair, stackedLimit } from '../../src/islands/schematic/SchematicPair';
import { toSchematicEdges, toSchematicNodes } from '../../src/systems/presentation';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const system = defineSystem({
  ...fixtureSystem,
  nodes: fixtureSystem.nodes.map((node) =>
    node.id === 'database' ? { ...node, label: 'PostgreSQL ledger tables', stamp: 'unused' } : node,
  ),
});
const nodes = toSchematicNodes(system.nodes);
const edges = toSchematicEdges(system.edges);

const drawing = (onSelect?: () => void) =>
  render(
    <Schematic
      systemId="fixture"
      title="Ledger architecture"
      description={system.tagline}
      nodes={nodes}
      edges={edges}
      orientation="horizontal"
      packets={[{ edge: 'client-api', progress: 0.5, tone: 'flight' }]}
      onSelect={onSelect}
    />,
  );

afterEach(cleanup);

describe('Schematic', () => {
  it('draws plain graphics when nothing can be selected', () => {
    const { container } = drawing();
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(container.querySelectorAll('[aria-pressed]')).toHaveLength(0);
    expect(container.querySelectorAll('.schematic__hit')).toHaveLength(0);
    const node = container.querySelector('[data-node="client"]');
    expect(node?.getAttribute('role')).toBe('img');
    expect(node?.getAttribute('aria-label')).toBe('1. Client, actor');
    const edge = container.querySelector('[data-edge="client-api"]');
    expect(edge?.getAttribute('role')).toBe('img');
    expect(edge?.getAttribute('aria-label')).toBe('Client to API, POST /entries, HTTPS');
  });

  it('turns nodes and edges into buttons only when a handler is given', () => {
    const { container } = drawing(() => undefined);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(5);
    expect(container.querySelectorAll('.schematic__hit')).toHaveLength(2);
    expect(container.querySelector('[data-node="client"]')?.getAttribute('tabindex')).toBe('0');
    expect(container.querySelector('[data-edge="client-api"]')?.getAttribute('tabindex')).toBe(
      '-1',
    );
  });

  it('is laid out at its natural size and tells a scroller how wide it is', () => {
    const { container } = drawing();
    const svg = container.querySelector('svg');
    const width = svg?.getAttribute('width') ?? '';
    expect(Number(width)).toBeGreaterThan(0);
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${width} ${svg?.getAttribute('height') ?? ''}`);
    expect(svg?.getAttribute('style')).toContain(`--drawing-width: ${width}px`);
  });

  it('gives every node its full label as a title and wraps long labels onto two lines', () => {
    const { container } = drawing();
    const titles = [...container.querySelectorAll('.schematic__node > title')].map(
      (title) => title.textContent,
    );
    expect(titles).toEqual(['Client', 'API', 'PostgreSQL ledger tables']);
    const lines = [
      ...container.querySelectorAll('[data-node="database"] .schematic__label tspan'),
    ].map((line) => line.textContent);
    expect(lines).toEqual(['PostgreSQL ledger', 'tables']);
  });

  it('draws a stamp across a part that is not what its label promises, clear of its label', () => {
    const { container } = drawing();
    const node = container.querySelector('[data-node="database"]');
    const stamp = node?.querySelector('.schematic__stamp');
    expect(stamp?.textContent).toBe('unused');
    expect(stamp?.querySelector('rect')).not.toBeNull();
    const stampY = Number(
      /translate\([\d.]+ ([\d.]+)\)/.exec(stamp?.getAttribute('transform') ?? '')?.[1],
    );
    const labelBaselines = [...(node?.querySelectorAll('.schematic__label tspan') ?? [])].map(
      (line) => Number(line.getAttribute('y')),
    );
    const captionBaseline = Number(node?.querySelector('.schematic__kind')?.getAttribute('y'));
    // The stamp is 16 units tall: its top clears the last label line and its bottom clears the
    // caption's ascenders.
    expect(stampY - 8).toBeGreaterThanOrEqual(Math.max(...labelBaselines) + 3);
    expect(stampY + 8).toBeLessThanOrEqual(captionBaseline - 9);
    expect(container.querySelector('[data-node="database"]')?.getAttribute('aria-label')).toBe(
      '3. PostgreSQL ledger tables, store, unused',
    );
  });

  it('draws a rail when asked, at its natural size, with its own ids', () => {
    const { container } = render(
      <Schematic
        systemId="fixture"
        title="Ledger rail"
        description={system.tagline}
        nodes={nodes}
        edges={edges}
        orientation="rail"
        rows={6}
      />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('schematic--rail')).toBe(true);
    expect(svg?.getAttribute('aria-labelledby')).toBe('fixture-rail-title');
    expect(Number(svg?.getAttribute('width'))).toBeLessThanOrEqual(300);
    const tops = [...container.querySelectorAll('.schematic__frame')].map((frame) =>
      Number(frame.getAttribute('y') ?? frame.getAttribute('d')?.split(',')[1]),
    );
    expect(new Set(tops).size).toBe(nodes.length);
  });

  it('draws protocol tags after the packets so a packet never hides one', () => {
    const { container } = drawing();
    const groups = [...(container.querySelector('svg')?.children ?? [])].map(
      (child) => child.getAttribute('class') ?? child.tagName,
    );
    expect(groups.indexOf('schematic__packets')).toBeLessThan(groups.indexOf('schematic__tags'));
    expect(container.querySelector('.schematic__tags')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('SchematicPair', () => {
  const wideNodes = [...Array(stackedLimit + 1).keys()].map((index) => ({
    id: `part-${String(index)}`,
    label: `Part ${String(index)}`,
    kind: 'process' as const,
  }));

  it('stacks a footprint of up to twelve parts and scrolls a larger one with a visible hint', () => {
    expect(stackedLimit).toBe(12);
    const stacked = render(
      <SchematicPair systemId="pair" title="Ledger" description="" nodes={nodes} edges={edges} />,
    );
    expect(stacked.container.querySelectorAll('svg')).toHaveLength(2);
    expect(stacked.container.querySelector('.schematic-scroll--horizontal svg')).not.toBeNull();
    expect(stacked.container.querySelector('.schematic-scroll--vertical svg')).not.toBeNull();
    const regions = [...stacked.container.querySelectorAll('[role="region"]')];
    expect(regions.map((region) => region.getAttribute('aria-label'))).toEqual([
      'Ledger, wide drawing, scrolls sideways',
      'Ledger, stacked drawing, scrolls sideways',
    ]);
    expect(regions.every((region) => region.getAttribute('tabindex') === '0')).toBe(true);
    expect(stacked.container.querySelectorAll('.schematic-scroll__hint')).toHaveLength(1);
    cleanup();
    const interactive = render(
      <SchematicPair
        systemId="pair"
        title="Ledger"
        description=""
        nodes={nodes}
        edges={edges}
        onSelect={() => undefined}
      />,
    );
    expect(interactive.container.querySelectorAll('[role="region"]')).toHaveLength(0);
    cleanup();
    const scrolled = render(
      <SchematicPair systemId="wide" title="Ledger" description="" nodes={wideNodes} edges={[]} />,
    );
    const scroller = scrolled.container.querySelector('.schematic-scroll');
    expect(scroller?.getAttribute('role')).toBe('region');
    expect(scroller?.getAttribute('aria-label')).toBe('Ledger, scrolls sideways');
    expect(scroller?.getAttribute('tabindex')).toBe('0');
    expect(scrolled.container.querySelectorAll('svg')).toHaveLength(1);
    expect(scrolled.container.querySelector('.schematic-scroll__hint')?.textContent).toBe(
      'Full drawing · scrolls sideways',
    );
  });
});
