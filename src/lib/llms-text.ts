import { formatPeriod, type Period } from './period';

export interface LlmsSource {
  name: string;
  positioning: string;
  summary: string;
  location: string;
  availability: string;
  siteUrl: string;
  links: { label: string; url: string }[];
  work: { title: string; tagline: string; url: string; status: string }[];
  roles: { title: string; company: string; period: Period }[];
  technologyGroups: { label: string; names: string[] }[];
}

export const renderLlmsText = (source: LlmsSource): string =>
  [
    `# ${source.name}`,
    '',
    `> ${source.positioning}`,
    '',
    `${source.summary} Based in ${source.location}. ${source.availability}.`,
    '',
    '## Work',
    '',
    ...source.work.map(
      (item) => `- [${item.title}](${item.url}): ${item.tagline} Status: ${item.status}.`,
    ),
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
    ...source.links.map((link) => `- [${link.label}](${link.url})`),
    '',
  ].join('\n');
