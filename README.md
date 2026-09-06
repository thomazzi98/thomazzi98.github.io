# thomazzi98.github.io

The source of [thomazzi98.github.io](https://thomazzi98.github.io/), my portfolio. A static site
with no client-side JavaScript, built from typed content collections, with budgets that fail the
build instead of a dashboard that reports them.

## What is in it

- Case studies written as decision records: constraints, the alternative that was on the table,
  the decision, what it cost, and what happened. Work that never launched says so.
- A technology registry that roles and projects reference by id. A technology no work cites, or
  a reference to an unknown technology, fails the build.
- `/resume.txt` and `/llms.txt`, generated from the same collections as the pages.
- A colophon with the build commit, the enforced budgets and the decision records below.

## Running it

Node 24 or newer.

```bash
npm ci
npm run dev
```

`npm run verify` runs what CI runs before the browser gates: type-check, lint, format check,
unit tests, build, and an internal link check over `dist/`. `npm run test:e2e` runs Playwright
with axe-core against every route in the sitemap, once with JavaScript disabled;
`npx playwright install chromium` first. `npm run lighthouse` asserts the budgets in
`lighthouserc.json` against `dist/`; it fetches Lighthouse CI through `npx` on demand, because
the package pins dependencies with known advisories and does not belong in the tree.

Security software that injects scripts into web pages (some antivirus products do) will fail the
zero-script budget on a developer machine. The gate that matters runs in CI.

`git config core.hooksPath .githooks` installs a pre-commit hook that runs the lint, format and
draft checks, so a commit cannot get ahead of the CI gate.

After changing dependencies, run `npm run lock`. An incremental install on one platform prunes
the other platforms' optional packages from the lockfile, and `npm ci` on the Linux runner
rejects the result; the script regenerates the lockfile from scratch.

## Layout

```
src/content/          roles, projects, education (markdown) and technologies.json
src/content.config.ts collections and Zod schemas
src/lib/              pure functions: integrity check, periods, trace, text rendering
src/pages/            routes, including resume.txt.ts and llms.txt.ts
src/layouts/          the one layout
src/components/       Astro components, no framework
src/styles/           tokens and global styles (Tailwind 4, CSS-first)
scripts/              link checker, static server for tests, OG image renderer
tests/unit/           Vitest
tests/e2e/            Playwright and axe-core
docs/decisions/       architecture decision records
```

## Decisions

- [A static Astro site instead of Next.js](docs/decisions/0001-static-astro-site-instead-of-nextjs.md)
- [Typed content collections with a technology registry](docs/decisions/0002-typed-content-with-a-technology-registry.md)
- [Budgets enforced in CI instead of a self-reported quality panel](docs/decisions/0003-budgets-enforced-in-ci-instead-of-a-quality-panel.md)
- [TypeScript pinned to 5.9 until the toolchain accepts 7](docs/decisions/0004-typescript-pinned-below-seven.md)

## License

Code is under the [MIT License](LICENSE). The content (text under `src/content/`, the resume,
the case studies) is mine and not licensed for reuse. IBM Plex is redistributed under the
[SIL Open Font License](src/assets/fonts/OFL.txt).
