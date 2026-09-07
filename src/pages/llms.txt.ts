import type { APIRoute } from 'astro';
import { scenarioIds } from '../bench/scenarios';
import { loadContent } from '../lib/content';
import { identity } from '../lib/identity';
import { renderLlmsText } from '../lib/llms-text';
import { compareByStartDescending } from '../lib/period';
import { selectCaseStudies } from '../lib/projects';
import { statusLabels } from '../lib/status';
import { groupTechnologyNames } from '../lib/technology-groups';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.href ?? '/';
  const { roles, projects, technologies } = await loadContent();

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
    work: selectCaseStudies(projects).map((project) => ({
      title: project.data.title,
      tagline: project.data.tagline,
      url: new URL(`/work/${project.id}/`, siteUrl).href,
      status: statusLabels[project.data.status],
    })),
    roles: [...roles].sort(compareByStartDescending).map((role) => ({
      title: role.data.title,
      company: role.data.company,
      period: role.data.period,
    })),
    technologyGroups: groupTechnologyNames(technologies),
    benches: scenarioIds.map((id) => ({ id, url: new URL(`/bench/${id}.json`, siteUrl).href })),
  });

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
