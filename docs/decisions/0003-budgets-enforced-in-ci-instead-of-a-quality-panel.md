---
title: Budgets enforced in CI instead of a self-reported quality panel
status: accepted
date: 2026-09-06
---

#### Context

The first plan for the colophon was a panel of measured numbers: Lighthouse scores, bytes per
route, test count, coverage. Producing it needed a second build pass so the numbers could be
embedded, and every number was one a static Astro site gets by default.

#### Decision

Enforce budgets instead of publishing measurements. `lighthouserc.json` fails the build below
0.95 performance or 0.98 on accessibility, best practices and SEO, on any script bytes, or on a
document over 60 KB. Playwright with axe runs every route from the sitemap. The colophon links
the workflow and the latest run; the footer shows the commit and build date.

#### Consequences

- The verifiable claim is "these budgets exist and the build fails without them", which a reader
  confirms by opening one file.
- No coverage number or test count is published anywhere.
- Security software that injects scripts into pages will fail the script budget on a developer
  machine. CI runs on a clean runner, which is where the gate matters.
- Superseded in part by decision 0005, then by 0006: the script budget is a size, no longer
  zero, and the document budget is a matrix; `lighthouserc.json` is the source of truth.
