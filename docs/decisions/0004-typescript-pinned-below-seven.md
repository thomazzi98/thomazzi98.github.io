---
title: TypeScript pinned to 5.9 until the toolchain accepts 7
status: accepted
date: 2026-09-06
---

## Context

TypeScript 7 (the native compiler) is the current release. `@astrojs/check` accepts `^5 || ^6`
and `typescript-eslint` accepts `< 6.1`, so an install with 7 fails peer resolution, and 6.0 is
a bridge release that turns several deprecations into errors.

## Decision

Pin `typescript` to `~5.9` in `package.json`. Revisit when both peers admit 7.

## Consequences

- `astro check` and typed linting keep working without `--legacy-peer-deps`.
- The pin is a deliberate lag, recorded here so it is not mistaken for neglect.
