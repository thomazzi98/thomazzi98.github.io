---
title: A systems laboratory built on three instruments, schematic, trace and evidence
status: accepted
date: 2026-09-09
---

#### Context

The second version of the site replayed employer decisions as benches under a loom identity. By
September 2026 three public repositories existed that show the work directly: CryptoPay, the
WhatsApp Notification Platform and the Pix gateway. The brief for the third version asks for a
site that presents those systems as engineering, with an interactive architecture map, request
and failure flows, the decisions behind them and code as evidence, and that never invents a node,
a number or a claim.

Three directions were prototyped independently and judged by three lenses: an instrument panel
with a shared clock, an engineering drawing sheet with callouts and revision tables, and a ledger
driven by a time scrubber. Two judges chose the instrument panel as the base for its architecture
and legibility on phones; the drawing sheet scored highest on identity but its drawing text was
illegible at 390 px; the ledger had the strongest writing and the only scrubber.

#### Decision

The site is a laboratory for systems that can say what happened. Three primitives recur on every
page and are the design system:

- **Schematic**: a typed node and edge model rendered as SVG at build. Nodes are focusable
  controls that open an inspector; edges carry protocol tags and arrowheads; numbered callouts
  resolve in a parts list that is also the text equivalent. PostgreSQL is drawn as a drum,
  externals dashed, unfinished areas stamped as such.
- **Trace**: a deterministic replay of one flow on a virtual clock, with packets travelling
  edges, a ledger that is rendered statically at build and hydrated, levers that switch real
  behaviours, and Play, Step and a scrubber. Under reduced motion nothing moves until Step.
- **Evidence**: every claim links to a path and line range at a pinned commit; fragments are
  copied from the repository and compared byte for byte in CI.

The identity is graphite first with a paper light theme that follows the system, Instrument
Serif for the human voice and IBM Plex Sans and Mono for the instruments, hairlines instead of
cards, and colour only for meaning: green for committed, amber for waiting and for focus, red for
faults, violet for the outcome nobody knows yet, ivory for a packet in flight.

#### Consequences

- Client-side JavaScript returns as Preact islands under a per-route budget the build enforces.
- A system without evidence for a claim cannot be published: the unit suite reads the pinned
  checkout and fails on a missing file, a wrong line range or a fragment that drifted.
- The repository facts on the site are read from git, never typed.
- Decision 0005 is superseded; the bench engine's kernel survives as the trace kernel.
- No theme toggle: the colour scheme follows the operating system, as decision 0001 chose.
