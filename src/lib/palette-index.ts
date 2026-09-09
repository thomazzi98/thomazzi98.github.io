import type { SystemModel } from '../systems/schema';

export const paletteKinds = ['page', 'system', 'node', 'flow', 'decision'] as const;

export type PaletteKind = (typeof paletteKinds)[number];

export interface PaletteEntry {
  readonly kind: PaletteKind;
  readonly title: string;
  readonly subtitle: string;
  readonly href: string;
  readonly keywords: readonly string[];
}

export const paletteKindLabels: Readonly<Record<PaletteKind, string>> = {
  page: 'Pages',
  system: 'Systems',
  node: 'Parts',
  flow: 'Flows',
  decision: 'Decisions',
};

const staticPages: readonly PaletteEntry[] = [
  {
    kind: 'page',
    title: 'Home',
    subtitle: 'The board: three systems on one clock',
    href: '/',
    keywords: ['home', 'board', 'start', 'thesis'],
  },
  {
    kind: 'page',
    title: 'Systems',
    subtitle: 'Three public repositories, each a case study',
    href: '/systems/',
    keywords: ['systems', 'repositories', 'case studies'],
  },
  {
    kind: 'page',
    title: 'Architecture',
    subtitle: 'What the three systems share',
    href: '/architecture/',
    keywords: ['architecture', 'patterns', 'map', 'shared'],
  },
  {
    kind: 'page',
    title: 'Decisions',
    subtitle: 'Every decision with what it refused and what it costs',
    href: '/decisions/',
    keywords: ['decisions', 'adr', 'trade-offs', 'cost'],
  },
  {
    kind: 'page',
    title: 'About',
    subtitle: 'Roles, education, how I work',
    href: '/about/',
    keywords: ['about', 'career', 'roles', 'resume', 'contact'],
  },
  {
    kind: 'page',
    title: 'Colophon',
    subtitle: 'How this site is built and verified',
    href: '/colophon/',
    keywords: ['colophon', 'site', 'build', 'budgets'],
  },
];

const systemEntries = (system: SystemModel): PaletteEntry[] => {
  const systemHref = `/systems/${system.id}/`;
  const systemKeywords = [system.id, system.shortName, system.repository.name];
  return [
    {
      kind: 'system',
      title: system.name,
      subtitle: system.tagline,
      href: systemHref,
      keywords: [...systemKeywords, system.maturity.label, 'system'],
    },
    ...system.nodes.map((node): PaletteEntry => ({
      kind: 'node',
      title: node.label,
      subtitle: system.name,
      href: `${systemHref}#node-${node.id}`,
      keywords: [node.id, node.kind, ...node.technologies, ...systemKeywords],
    })),
    ...system.flows.map((flow): PaletteEntry => ({
      kind: 'flow',
      title: flow.name,
      subtitle: `${system.name} · ${flow.kind} flow`,
      href: `${systemHref}#flow-${flow.id}`,
      keywords: [flow.id, flow.kind, ...systemKeywords],
    })),
    ...system.decisions.map((decision): PaletteEntry => ({
      kind: 'decision',
      title: decision.title,
      subtitle: `${system.name} · ${decision.themes.join(', ')}`,
      href: `${systemHref}#decision-${decision.id}`,
      keywords: [decision.id, ...decision.themes, ...systemKeywords],
    })),
  ];
};

export const buildPaletteIndex = (systems: readonly SystemModel[]): PaletteEntry[] => [
  ...staticPages,
  ...systems.flatMap(systemEntries),
];

const knownKinds: ReadonlySet<string> = new Set(paletteKinds);

const isPaletteEntry = (value: unknown): value is PaletteEntry => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.kind === 'string' &&
    knownKinds.has(candidate.kind) &&
    typeof candidate.title === 'string' &&
    typeof candidate.subtitle === 'string' &&
    typeof candidate.href === 'string' &&
    Array.isArray(candidate.keywords) &&
    candidate.keywords.every((keyword) => typeof keyword === 'string')
  );
};

// The index arrives over the network, so its shape is checked before it is searched.
export const parsePaletteIndex = (value: unknown): PaletteEntry[] => {
  if (!Array.isArray(value) || !value.every(isPaletteEntry)) {
    throw new Error('The palette index does not have the expected shape.');
  }
  return value;
};

const tokenise = (text: string): string[] => text.toLowerCase().split(/\s+/).filter(Boolean);

const titleWeight = 4;
const subtitleWeight = 2;
const keywordWeight = 1;

const tokenScore = (entry: PaletteEntry, token: string): number => {
  if (entry.title.toLowerCase().includes(token)) {
    return titleWeight;
  }
  if (entry.subtitle.toLowerCase().includes(token)) {
    return subtitleWeight;
  }
  if (entry.keywords.some((keyword) => keyword.toLowerCase().includes(token))) {
    return keywordWeight;
  }
  return 0;
};

const entryScore = (entry: PaletteEntry, tokens: readonly string[]): number => {
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(entry, token);
    if (score === 0) {
      return 0;
    }
    total += score;
  }
  return total;
};

export const searchPalette = (
  entries: readonly PaletteEntry[],
  query: string,
  limit: number,
): PaletteEntry[] => {
  const tokens = tokenise(query);
  if (tokens.length === 0) {
    return entries.slice(0, limit);
  }
  return entries
    .map((entry, position) => ({ entry, position, score: entryScore(entry, tokens) }))
    .filter((scored) => scored.score > 0)
    .sort((first, second) => second.score - first.score || first.position - second.position)
    .slice(0, limit)
    .map((scored) => scored.entry);
};
