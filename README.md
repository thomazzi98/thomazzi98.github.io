# thomazzi98.github.io

The personal site of Rafael Thomazzi, a backend engineer in Sorocaba, Brazil. Live at
[thomazzi98.github.io](https://thomazzi98.github.io/).

Astro 7, static output, deployed to GitHub Pages by GitHub Actions.

## Layout

```
src/
  content/        typed collections: roles, projects, education, practices, technology registry
  layouts/        the page shell
  lib/            pure helpers: content loading and integrity, periods, projections, text renderers
  pages/          routes, including resume.txt and llms.txt
  styles/         design tokens and one stylesheet in cascade layers
  trace/kernel/   a deterministic discrete-event kernel: seeded random, scheduler, simulation
docs/decisions/   architecture decision records, rendered on the colophon
scripts/          build-time checks: links, draft markers, the social image, the local server
tests/            Vitest unit tests and Playwright end-to-end tests with axe
```

## Content

Roles, projects, education and practices are Astro content collections validated with Zod.
Technologies are a registry keyed by id; roles and projects reference ids, never names. A
reference to an unknown id fails the build, and so does a registry entry that nothing cites. A
practice must name the projects that back it.

The resume and `llms.txt` are projections of those files, computed once at build.

## Development

```bash
npm install
npm run dev
```

`npm run verify` runs what CI runs before a deploy: type check, lint, formatting, the draft
marker check, unit tests, the build and the internal link check. `npm run test:e2e` runs
Playwright with axe against every route in the sitemap, once with JavaScript disabled, and
needs `npx playwright install chromium` first. `npm run og:image` regenerates the social image.

`git config core.hooksPath .githooks` installs a pre-commit hook that runs the lint, format and
draft checks, so a commit cannot get ahead of the CI gate.

After changing dependencies, run `npm run lock` to regenerate the lockfile with the Linux
optional dependencies CI needs.

## Verification

Every push to `main` runs the verify script, the end-to-end suite and Lighthouse CI against the
built site, and deploys to GitHub Pages only if all of it passes. The budgets are in
`lighthouserc.json` and rendered on the colophon.
