import { readFileSync } from 'node:fs';

const sitemapPath = new URL('../../dist/sitemap-0.xml', import.meta.url);

export const readSitemapRoutes = (): string[] => {
  const sitemap = readFileSync(sitemapPath, 'utf-8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? '');
  return locations.map((location) => new URL(location).pathname);
};
