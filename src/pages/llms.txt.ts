import type { APIRoute } from 'astro';
import { loadContent } from '../lib/content';
import { identity } from '../lib/identity';
import { renderLlmsText } from '../lib/llms-text';
import { compareByStartDescending } from '../lib/period';
import { groupTechnologyNames } from '../lib/technology-groups';
import { systems } from '../systems';
import { repositoryUrl } from '../systems/evidence';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.href ?? '/';
  const { roles, technologies } = await loadContent();

  const text = renderLlmsText({
    name: identity.name,
    positioning: identity.positioning,
    summary: identity.summary,
    location: identity.location,
    availability: identity.availability,
    siteUrl,
    links: [
      { label: 'GitHub', url: identity.links.github },
      { label: 'LinkedIn', url: identity.links.linkedin },
    ],
    systems: systems.map((system) => ({
      name: system.name,
      tagline: system.tagline,
      url: new URL(`/systems/${system.id}/`, siteUrl).href,
      repositoryUrl: repositoryUrl(system.repository),
      dataUrl: new URL(`/systems/${system.id}.json`, siteUrl).href,
    })),
    roles: [...roles].sort(compareByStartDescending).map((role) => ({
      title: role.data.title,
      company: role.data.company,
      period: role.data.period,
    })),
    technologyGroups: groupTechnologyNames(technologies),
  });

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
