import type { APIRoute } from 'astro';
import { buildPaletteIndex } from '../lib/palette-index';
import { systems } from '../systems';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildPaletteIndex(systems)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
