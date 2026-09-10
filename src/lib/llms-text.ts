import { formatPeriod, type Period } from './period';

export interface LlmsSystem {
  name: string;
  tagline: string;
  url: string;
  repositoryUrl: string;
  dataUrl: string;
}

export interface LlmsSource {
  name: string;
  positioning: string;
  summary: string;
  location: string;
  availability: string;
  siteUrl: string;
  links: { label: string; url: string }[];
  systems: LlmsSystem[];
  roles: { title: string; company: string; period: Period }[];
  technologyGroups: { label: string; names: string[] }[];
}

const renderSystem = (system: LlmsSystem): string[] => [
  `- [${system.name}](${system.url}): ${system.tagline} Repository: ${system.repositoryUrl}`,
  `  - Machine-readable model and transcripts: ${system.dataUrl}`,
];

export const renderLlmsText = (source: LlmsSource): string =>
  [
    `# ${source.name}`,
    '',
    `> ${source.positioning}`,
    '',
    `${source.summary} Based in ${source.location}. ${source.availability}.`,
    '',
    '## Systems',
    '',
    'Three public repositories presented as engineering: architecture, request and failure flows, state machines, decisions and code, every claim linked to a file and line at a pinned commit.',
    'Each /systems/<id>.json route carries the full model of one system and the default transcript of each of its flows, pinned to one commit of its repository.',
    '',
    ...source.systems.flatMap(renderSystem),
    '',
    '## Roles',
    '',
    ...source.roles.map((role) => `- ${formatPeriod(role.period)}: ${role.title}, ${role.company}`),
    '',
    '## Stack',
    '',
    ...source.technologyGroups.map((group) => `- ${group.label}: ${group.names.join(', ')}`),
    '',
    '## Links',
    '',
    `- [Plain-text resume](${source.siteUrl}resume.txt)`,
    `- [About](${source.siteUrl}about/)`,
    `- [Architecture, what the three systems share](${source.siteUrl}architecture/)`,
    `- [Decisions across the three repositories](${source.siteUrl}decisions/)`,
    `- [Colophon, how this site is built](${source.siteUrl}colophon/)`,
    `- [Search index of every page, part, flow and decision](${source.siteUrl}palette.json)`,
    ...source.links.map((link) => `- [${link.label}](${link.url})`),
    '',
  ].join('\n');
