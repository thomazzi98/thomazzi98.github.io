/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['tests/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          pool: 'threads',
          include: ['tests/component/**/*.test.tsx'],
        },
      },
    ],
  },
});
