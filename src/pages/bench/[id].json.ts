import type { APIRoute, GetStaticPaths } from 'astro';
import { transcriptOf } from '../../bench/core/demonstration';
import { loadScenario, scenarioIds } from '../../bench/scenarios';

export const getStaticPaths = (() =>
  scenarioIds.map((id) => ({ params: { id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const id = scenarioIds.find((candidate) => candidate === params.id);
  if (id === undefined) {
    return new Response('Not found', { status: 404 });
  }
  const module = await loadScenario(id);
  const transcript = transcriptOf(module.scenario, module.demonstration);
  return new Response(JSON.stringify(transcript, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
