import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders, passthroughImageService } from 'astro/config';

export default defineConfig({
  site: 'https://thomazzi98.github.io',
  trailingSlash: 'always',
  image: { service: passthroughImageService() },
  integrations: [sitemap()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex-sans',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/ibm-plex-sans-variable.woff2'],
            weight: '100 700',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      options: {
        variants: [
          { src: ['./src/assets/fonts/ibm-plex-mono-400.woff2'], weight: 400, style: 'normal' },
          { src: ['./src/assets/fonts/ibm-plex-mono-500.woff2'], weight: 500, style: 'normal' },
        ],
      },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
