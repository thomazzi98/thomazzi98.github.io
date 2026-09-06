import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, passthroughImageService } from 'astro/config';

export default defineConfig({
  site: 'https://thomazzi98.github.io',
  trailingSlash: 'always',
  image: { service: passthroughImageService() },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
