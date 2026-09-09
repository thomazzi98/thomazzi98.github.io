import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders, passthroughImageService } from 'astro/config';
import { rehypeDropNestedHeadingIds } from './src/lib/rehype';

export default defineConfig({
  site: 'https://thomazzi98.github.io',
  trailingSlash: 'always',
  image: { service: passthroughImageService() },
  integrations: [preact(), sitemap()],
  markdown: {
    processor: unified(),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
    rehypePlugins: [rehypeHeadingIds, rehypeDropNestedHeadingIds],
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--font-instrument-serif',
      weights: [400],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/instrument-serif-normal.woff2'],
            weight: 400,
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/instrument-serif-italic.woff2'],
            weight: 400,
            style: 'italic',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex-sans',
      weights: ['100 700'],
      styles: ['normal'],
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
      weights: [400, 500],
      styles: ['normal'],
      fallbacks: ['ui-monospace', 'Courier New', 'monospace'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/ibm-plex-mono-400.woff2'], weight: 400, style: 'normal' },
          { src: ['./src/assets/fonts/ibm-plex-mono-500.woff2'], weight: 500, style: 'normal' },
        ],
      },
    },
  ],
});
