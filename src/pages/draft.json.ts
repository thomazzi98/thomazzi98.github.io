import type { APIRoute } from 'astro';
import { buildInfo } from '../lib/build-info';
import { weaveCloth } from '../lib/cloth';
import { loadContent } from '../lib/content';

export const GET: APIRoute = async () => {
  const { roles, projects, technologies } = await loadContent();
  const cloth = weaveCloth({ roles, projects, technologies, now: buildInfo.yearMonth });
  const projection = {
    generatedAt: buildInfo.date,
    legend: { 0: 'unwoven', 1: 'used by a role that month', 2: 'used by a case study that month' },
    threads: cloth.threads,
    picks: cloth.picks,
    rows: cloth.cells.map((row) => row.join('')),
    treadles: cloth.treadles,
  };
  return new Response(JSON.stringify(projection, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
