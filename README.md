# thomazzi98.github.io

The personal site of Rafael Thomazzi, a backend engineer in Sorocaba, Brazil. Live at
[thomazzi98.github.io](https://thomazzi98.github.io/).

Every case study on the site is a **bench**: a working replay of a production decision, driven
by a deterministic discrete-event simulation that runs in the browser, at build time, and in the
tests. The visitor pulls the lever the case study pulled and watches the consequence before
reading the written decision. The identity is a loom: Sorocaba was the Manchester Paulista of
textile mills, and the work is the weft between fixed systems.

## Layout

```
src/
  bench/
    core/         the engine: seeded random, scheduler, simulation, presentation, demonstrations
    scenarios/    one module per case study: graph, levers, reducer, presenter, scripted run
    render/       layout of the schematic, the client binder, the <bench-frame> element
  components/     Astro components (bench frame and drawing, the cloth, the selvedge)
  content/        typed collections: roles, projects, education, practices, technology registry
  layouts/        the page shell
  lib/            pure helpers: content loading and integrity, periods, projections, text renderers
  pages/          routes, including resume.txt, llms.txt, draft.json and bench/<id>.json
  styles/         design tokens and one stylesheet in cascade layers
docs/decisions/   architecture decision records, rendered on the colophon
scripts/          build-time checks: links, draft markers, the social image, the local server
tests/            Vitest unit tests and Playwright end-to-end tests with axe
```

## The bench engine

`src/bench/core` has no dependencies and no knowledge of the DOM.

- `random.ts` — a seeded generator, so a run repeats for a seed.
- `scheduler.ts` — a binary heap ordered by virtual time, then by insertion.
- `simulation.ts` — `createSimulation(scenario, { seed, levers })` returns an object that can
  `dispatch` an external event, `step` one scheduled event, or `advance` a virtual duration.
  Levers change future behaviour without touching events already queued. Packets in flight are
  tracked so a renderer can interpolate them.
- `presentation.ts` — each scenario presents its state as station tones, meters and a ledger,
  which keeps the renderer generic.
- `demonstration.ts` — a scripted run per scenario, whose transcript is printed for readers
  without JavaScript and served as JSON.

A scenario is one file in `src/bench/scenarios` exporting `scenario`, `definition`, `present`,
`demonstration` and `actionEvent`. The registry in `index.ts` maps ids to code-split loaders. A
case study without a scenario, or a scenario without a case study, fails the build.

The client side is `src/bench/render`: `layout.ts` places stations by their longest solid path
so one graph draws horizontally on desktop and vertically on phones; `bind.ts` advances the
simulation on a 120 ms beat and writes state into markup that the build already rendered;
`bench-frame.ts` is the custom element that loads a scenario on demand and reads the seed from
the URL. Under reduced motion nothing runs until Step is pressed.

## Content

Roles, projects, education and practices are Astro content collections validated with Zod.
Technologies are a registry keyed by id; roles and projects reference ids, never names. A
reference to an unknown id fails the build, and so does a registry entry that nothing cites. A
practice must name the projects that back it.

The resume, `llms.txt`, the stack page and the cloth on the About page are projections of those
files, computed once at build.

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
