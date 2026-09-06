import type { APIRoute } from 'astro';
import { buildDateLabel } from '../lib/build-time';
import { loadContent } from '../lib/content';
import { identity } from '../lib/identity';
import { compareByStartDescending } from '../lib/period';
import { selectCaseStudies } from '../lib/projects';
import { renderResumeText } from '../lib/resume-text';
import { groupTechnologyNames } from '../lib/technology-groups';
import { createTechnologyNameLookup } from '../lib/technologies';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.href ?? '/';
  const { roles, projects, education, technologies } = await loadContent();
  const technologyName = createTechnologyNameLookup(technologies);

  const text = renderResumeText({
    name: identity.name,
    headline: identity.headline,
    location: identity.location,
    timezone: identity.timezone,
    availability: identity.availability,
    email: identity.email,
    links: [identity.links.github, identity.links.linkedin],
    summary: identity.summary,
    roles: [...roles].sort(compareByStartDescending).map((role) => ({
      title: role.data.title,
      company: role.data.company,
      companyGloss: role.data.companyGloss,
      location: role.data.location,
      period: role.data.period,
      stack: role.data.stack.map(technologyName),
      body: role.body ?? '',
    })),
    projects: selectCaseStudies(projects).map((project) => ({
      title: project.data.title,
      tagline: project.data.tagline,
      url: new URL(`/work/${project.id}/`, siteUrl).href,
    })),
    education: [...education]
      .sort((first, second) => second.data.year - first.data.year)
      .map((entry) => ({
        credential: entry.data.credential,
        field: entry.data.field,
        institution: entry.data.institution,
        institutionGloss: entry.data.institutionGloss,
        year: entry.data.year,
      })),
    technologyGroups: groupTechnologyNames(technologies),
    siteUrl,
    generatedOn: buildDateLabel,
  });

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
