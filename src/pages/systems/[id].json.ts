import type { APIRoute, GetStaticPaths } from 'astro';
import { systems } from '../../systems';
import { defaultLeverValues, runTranscript } from '../../trace/runner';

export const getStaticPaths = (() =>
  systems.map((system) => ({ params: { id: system.id } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const system = systems.find((candidate) => candidate.id === params.id);
  if (system === undefined) {
    return new Response('Not found', { status: 404 });
  }
  const endpoints = new Map(
    system.edges.map((edge) => [edge.id, { from: edge.from, to: edge.to }]),
  );
  const transcripts = Object.fromEntries(
    system.flows.map((flow) => [
      flow.id,
      runTranscript(flow, endpoints, { levers: defaultLeverValues(flow.levers) }),
    ]),
  );
  const body = JSON.stringify({ system, transcripts }, null, 2);
  return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
