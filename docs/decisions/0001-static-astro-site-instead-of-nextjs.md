---
title: A static Astro site instead of Next.js
status: accepted
date: 2026-09-06
---

#### Context

The repository started with a Next.js `.gitignore`, and Next.js is the framework I have shipped
front ends with. The site is static prose, two endpoints that return text, and no server state,
authentication or mutable data.

#### Decision

Build with Astro as a static site. No UI framework, no islands, no client-side JavaScript.
Route transitions use the CSS view-transition rule; the color scheme follows the operating
system through `light-dark()`.

#### Consequences

- Every page is HTML and CSS. The Lighthouse budget asserts zero script bytes, so this stays true.
- Anything interactive would need an island and a justification. A theme toggle is a known
  non-goal: the color scheme follows the operating system.
- The choice is itself a claim on a site about backend work: the heavier tool was not needed.
- Superseded in part by decision 0005: client-side JavaScript returns for the benches, under a
  budget the build enforces.
