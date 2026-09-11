import { describe, expect, it } from 'vitest';
import {
  buildPaletteIndex,
  paletteKinds,
  searchPalette,
  type PaletteEntry,
} from '../../src/lib/palette-index';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from './systems/fixture';

const system = defineSystem(fixtureSystem);
const index = buildPaletteIndex([system]);

const ofKind = (kind: PaletteEntry['kind']) => index.filter((entry) => entry.kind === kind);

describe('buildPaletteIndex', () => {
  it('lists the static pages first, in navigation order', () => {
    expect(index.slice(0, 7).map((entry) => [entry.kind, entry.href])).toEqual([
      ['page', '/'],
      ['page', '/systems/'],
      ['page', '/architecture/'],
      ['page', '/demo/'],
      ['page', '/decisions/'],
      ['page', '/about/'],
      ['page', '/colophon/'],
    ]);
  });

  it('adds one entry per system, node, flow and decision', () => {
    expect(ofKind('system')).toHaveLength(1);
    expect(ofKind('node')).toHaveLength(system.nodes.length);
    expect(ofKind('flow')).toHaveLength(system.flows.length);
    expect(ofKind('decision')).toHaveLength(system.decisions.length);
    expect(index).toHaveLength(
      7 + 1 + system.nodes.length + system.flows.length + system.decisions.length,
    );
  });

  it('points each kind at the place on the system page that shows it', () => {
    expect(ofKind('system')[0]).toMatchObject({
      title: 'Ledger',
      subtitle: 'A fixture system for the model tests.',
      href: '/systems/ledger/',
    });
    expect(ofKind('node').map((entry) => entry.href)).toEqual([
      '/systems/ledger/#node-client',
      '/systems/ledger/#node-api',
      '/systems/ledger/#node-database',
    ]);
    expect(ofKind('node')[1]).toMatchObject({ title: 'API', subtitle: 'Ledger' });
    expect(ofKind('flow')[0]).toMatchObject({
      title: 'Record an entry',
      subtitle: 'Ledger · request flow',
      href: '/systems/ledger/#flow-record-entry',
    });
    expect(ofKind('decision')[0]).toMatchObject({
      title: 'PostgreSQL is the only store',
      subtitle: 'Ledger · durability',
      href: '/systems/ledger/#decision-postgres-only',
    });
  });

  it('carries searchable keywords the visible text does not show', () => {
    expect(ofKind('node')[2]?.keywords).toEqual(expect.arrayContaining(['database', 'store']));
    expect(ofKind('decision')[0]?.keywords).toEqual(
      expect.arrayContaining(['postgres-only', 'durability', 'ledger']),
    );
  });

  it('names the system once per entry, whatever the spelling', () => {
    for (const entry of index) {
      const lowered = entry.keywords.map((keyword) => keyword.toLowerCase());
      expect(new Set(lowered).size, `${entry.href} repeats a keyword`).toBe(lowered.length);
    }
    expect(ofKind('node')[1]?.keywords).toEqual(['api', 'process', 'ledger']);
  });

  it('only produces the kinds the palette groups by', () => {
    for (const entry of index) {
      expect(paletteKinds).toContain(entry.kind);
    }
  });
});

describe('searchPalette', () => {
  it('returns the first entries, in index order, for an empty query', () => {
    expect(searchPalette(index, '   ', 3)).toEqual(index.slice(0, 3));
  });

  it('ranks a title match above a subtitle match above a keyword match', () => {
    const entries: PaletteEntry[] = [
      { kind: 'page', title: 'Other', subtitle: 'Nothing', href: '/c/', keywords: ['queue'] },
      { kind: 'page', title: 'Other', subtitle: 'The queue', href: '/b/', keywords: [] },
      { kind: 'page', title: 'Queue', subtitle: 'Nothing', href: '/a/', keywords: [] },
    ];
    expect(searchPalette(entries, 'queue', 10).map((entry) => entry.href)).toEqual([
      '/a/',
      '/b/',
      '/c/',
    ]);
  });

  it('matches case-insensitively and requires every token to match', () => {
    expect(searchPalette(index, 'POSTGRES', 10).map((entry) => entry.title)).toEqual([
      'PostgreSQL',
      'PostgreSQL is the only store',
    ]);
    expect(searchPalette(index, 'postgres store', 10).map((entry) => entry.title)).toEqual([
      'PostgreSQL is the only store',
      'PostgreSQL',
    ]);
    expect(searchPalette(index, 'postgres nowhere', 10)).toEqual([]);
  });

  it('keeps index order for ties and honours the limit', () => {
    const ledger = searchPalette(index, 'ledger', 100);
    const positions = ledger.map((entry) => index.indexOf(entry));
    const titleMatches = ledger.filter((entry) => entry.title.toLowerCase().includes('ledger'));
    expect(titleMatches.map((entry) => entry.title)).toEqual(['Ledger']);
    expect(positions.slice(1)).toEqual([...positions.slice(1)].sort((one, two) => one - two));
    expect(searchPalette(index, 'ledger', 2)).toHaveLength(2);
  });
});
