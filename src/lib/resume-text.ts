import { formatPeriod, type Period } from './period';
import { markdownToPlainText, wrapLine } from './text';

export interface ResumeRole {
  title: string;
  company: string;
  companyGloss: string;
  location: string;
  period: Period;
  stack: string[];
  body: string;
}

export interface ResumeSystem {
  name: string;
  tagline: string;
  url: string;
  repositoryUrl: string;
}

export interface ResumeEducation {
  credential: string;
  field: string;
  institution: string;
  institutionGloss: string;
  year: number;
}

export interface ResumeSource {
  name: string;
  headline: string;
  location: string;
  timezone: string;
  availability: string;
  email: string;
  links: string[];
  summary: string;
  roles: ResumeRole[];
  systems: ResumeSystem[];
  education: ResumeEducation[];
  technologyGroups: { label: string; names: string[] }[];
  siteUrl: string;
  generatedOn: string;
}

const WIDTH = 78;

const paragraph = (text: string): string => wrapLine(text, WIDTH).join('\n');

const renderRole = (role: ResumeRole): string =>
  [
    `${formatPeriod(role.period)}  ${role.title}, ${role.company}`,
    paragraph(`${role.companyGloss} · ${role.location}`),
    paragraph(`Stack: ${role.stack.join(', ')}`),
    '',
    markdownToPlainText(role.body, WIDTH),
  ].join('\n');

const renderSystem = (system: ResumeSystem): string =>
  [
    ...wrapLine(`- ${system.name}: ${system.tagline}`, WIDTH, '  '),
    `  ${system.url}`,
    `  ${system.repositoryUrl}`,
  ].join('\n');

const renderEducation = (entry: ResumeEducation): string =>
  paragraph(
    `${String(entry.year)}  ${entry.credential}, ${entry.field} · ${entry.institution} (${entry.institutionGloss})`,
  );

export const renderResumeText = (source: ResumeSource): string => {
  const sections = [
    [
      source.name.toUpperCase(),
      source.headline,
      `${source.location} · ${source.timezone} · ${source.availability}`,
      '',
      source.email,
      ...source.links,
    ].join('\n'),
    ['SUMMARY', paragraph(source.summary)].join('\n'),
    ['EXPERIENCE', '', source.roles.map(renderRole).join('\n\n')].join('\n'),
    [
      'SYSTEMS',
      '',
      paragraph(
        'Public repositories, each presented on the site with its architecture, flows, decisions and code at a pinned commit.',
      ),
      '',
      source.systems.map(renderSystem).join('\n\n'),
    ].join('\n'),
    ['EDUCATION', '', source.education.map(renderEducation).join('\n')].join('\n'),
    [
      'TECHNOLOGIES',
      '',
      source.technologyGroups
        .map((group) => paragraph(`${group.label}: ${group.names.join(', ')}`))
        .join('\n'),
    ].join('\n'),
    paragraph(
      `Generated ${source.generatedOn} from ${source.siteUrl} · machine-readable: ${source.siteUrl}llms.txt`,
    ),
  ];
  return `${sections.join('\n\n')}\n`;
};
