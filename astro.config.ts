import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders, passthroughImageService } from 'astro/config';
import rehypeMermaid from 'rehype-mermaid';
import { rehypeDropNestedHeadingIds, rehypeWrapDiagrams } from './src/lib/rehype';

const mermaidConfig = {
  theme: 'neutral',
  look: 'classic',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  flowchart: { htmlLabels: false, curve: 'linear' },
};

export default defineConfig({
  site: 'https://thomazzi98.github.io',
  trailingSlash: 'always',
  image: { service: passthroughImageService() },
  integrations: [sitemap()],
  markdown: {
    processor: unified(),
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
    rehypePlugins: [
      [rehypeMermaid, { strategy: 'inline-svg', mermaidConfig }],
      rehypeWrapDiagrams,
      rehypeDropNestedHeadingIds,
    ],
  },
  fonts: [
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
  vite: { plugins: [tailwindcss()] },
});
