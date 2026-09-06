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

export interface ResumeProject {
  title: string;
  tagline: string;
  url: string;
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
  projects: ResumeProject[];
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
      [source.email, ...source.links].join(' · '),
    ].join('\n'),
    ['SUMMARY', paragraph(source.summary)].join('\n'),
    ['EXPERIENCE', '', source.roles.map(renderRole).join('\n\n')].join('\n'),
    [
      'SELECTED WORK',
      '',
      source.projects
        .flatMap((project) =>
          wrapLine(`- ${project.title}: ${project.tagline} ${project.url}`, WIDTH, '  '),
        )
        .join('\n'),
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
