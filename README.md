# thomazzi98.github.io

The personal site of Rafael Thomazzi, a backend engineer in Sorocaba, Brazil. Live at
[thomazzi98.github.io](https://thomazzi98.github.io/).

The site presents three public systems as engineering rather than as portfolio cards:
[CryptoPay](https://github.com/thomazzi98/cryptopay), the
[WhatsApp Notification Platform](https://github.com/thomazzi98/whatsapp-notification-platform) and
the [Mini Payment Gateway](https://github.com/thomazzi98/mini-payment-gateway). Every page is built
from three instruments:

- **Schematic**: a typed model of a system's parts and connections, laid out and drawn as SVG at
  build. Parts are focusable controls with an inspector; numbered callouts resolve in a parts list.
- **Trace**: a flow replayed on a virtual clock by a deterministic discrete-event kernel, with
  levers that switch the behaviours the code really has. Transcripts are rendered at build, so a
  page reads without JavaScript, and served as JSON.
- **Evidence**: every claim links to a path and line range at a pinned commit of the repository,
  and every code fragment is copied verbatim and compared byte for byte in the test suite.

The activity on the board and the system pages is a simulation of the documented flows, and it
says so wherever it appears. One page is not: `/demo/` creates a real payment through the payment
gateway, which issues it through CryptoPay, confirms it on an authenticated read once the chain has
paid it, and hands the paid event to the WhatsApp Notification Platform. The page talks to the
gateway and nothing else, and reads every step back from the gateway's own record. It needs the
three stacks running where the browser can reach them — `node scripts/demo-stack.mjs up` in the
gateway repository — and takes the gateway's address from `PUBLIC_DEMO_GATEWAY_URL` at build time
(default `http://127.0.0.1:4010`), overridable on the page itself.

## Layout

```
src/
  systems/        the typed model: schema, one <id>.system.ts per system, verbatim fragments,
                  evidence links, source access, the board footprint
  trace/          the deterministic kernel (scheduler, simulation) and the flow runner
  islands/        Preact islands: schematic, explorer and inspector, flow player and ledger,
                  home board, state machine explorer, architecture map, command palette
  components/     Astro shells around the islands: flow stages, code fragments, evidence links
  pages/          the routes: /, /systems/, /systems/<id>/, /architecture/, /decisions/, /about/,
                  /colophon/, plus /systems/<id>.json, /palette.json, resume.txt and llms.txt
  content/        roles, education, practices and the technology registry (Zod collections)
  lib/            the person's identity, content loading and integrity checks, the text
                  projections, the palette index, budgets and build information
  layouts/        the page shell
  styles/         tokens and one stylesheet per surface, in cascade layers
docs/decisions/   the site's own decision records, rendered on the colophon
scripts/          build-time checks and tooling, including the source checkout for CI
tests/            Vitest unit and component tests, Playwright end-to-end tests with axe
vendor/           local checkouts of the three systems (ignored; see below)
```

## The systems model

`src/systems/schema.ts` types a system: repository facts, maturity, stack in context, nodes,
edges, flows with steps and levers, state machines, decisions, fragments, verification layers,
security controls and limitations. `defineSystem` validates the shape and the integrity rules:
edges name existing nodes, steps name existing nodes, edges and lever options, terminal statuses
have no outgoing transitions, the board flow exists.

`tests/unit/systems/sources.test.ts` opens the pinned commit of each repository and checks that
every cited file exists, that every line range is inside the file, that every fragment file under
`src/systems/fragments/<id>/` equals the cited lines, and that the commit count and dates stated
in the model are what `git` reports. The checkouts live under `vendor/`:

```bash
node scripts/checkout-sources.ts                      # clones the pinned repositories (CI)
node scripts/checkout-sources.ts --link E:\workspaces  # links existing local clones instead
```

`SYSTEM_SOURCES_ROOT` points the tests at another directory.

## Development

```bash
npm install
npm run dev
```

`npm run verify` runs what CI runs before a deploy: type check, lint, formatting, the draft
marker check, unit and component tests (which include the evidence checks), the build and the
internal link check. `npm run test:e2e` runs Playwright with axe against every route in the
sitemap on desktop, on a Pixel 7 profile and with JavaScript disabled; it needs
`npx playwright install chromium` first. `npm run og:image` regenerates the social image.

`git config core.hooksPath .githooks` installs a pre-commit hook that runs the cheap part of the
gate (lint, formatting and the draft check) before every commit.

After changing dependencies, run `npm run lock` to regenerate the lockfile with the Linux
optional dependencies CI needs.

Code style is enforced by lint rather than by review: English identifiers, no abbreviations, no
`else`, no nested ternaries, identifiers of three characters or more, comments only for reasoning
the code cannot show.

## Verification

Every push to `main` checks out the pinned sources, runs the verify script, the end-to-end suite
and Lighthouse CI against the built site, and deploys to GitHub Pages only if all of it passes.
Pull requests run the same checks without deploying. The budgets are in `lighthouserc.json`,
measured through `scripts/serve-dist.ts`, which compresses text the way Pages does, and rendered
on the colophon.

## Licences

The site's code is MIT (see `LICENSE`). The fonts are under the SIL Open Font License 1.1; the
copyright lines are in `src/assets/fonts/NOTICE.txt`. The files under `src/systems/fragments/`
are verbatim copies from the three repositories at their pinned commits, by the same author.
