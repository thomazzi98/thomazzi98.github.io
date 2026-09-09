import type { APIRoute } from 'astro';
import { buildInfo } from '../lib/build-info';
import { loadContent } from '../lib/content';
import { identity } from '../lib/identity';
import { compareByStartDescending } from '../lib/period';
import { renderResumeText } from '../lib/resume-text';
import { groupTechnologyNames } from '../lib/technology-groups';
import { createTechnologyNameLookup } from '../lib/technologies';
import { systems } from '../systems';
import { repositoryUrl } from '../systems/evidence';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.href ?? '/';
  const { roles, education, technologies } = await loadContent();
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
    systems: systems.map((system) => ({
      name: system.name,
      tagline: system.tagline,
      url: new URL(`/systems/${system.id}/`, siteUrl).href,
      repositoryUrl: repositoryUrl(system.repository),
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
    generatedOn: buildInfo.date,
  });

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
