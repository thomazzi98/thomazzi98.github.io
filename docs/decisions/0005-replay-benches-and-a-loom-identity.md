---
title: Replay benches as the experience, a loom as the identity
status: accepted
date: 2026-09-07
---

#### Context

The first version of this site was an editorial document: prose pages, a stack table, a
career trace. It was accurate and quick, and it looked like most developer sites. The brief
for the second version asks for an experience that demonstrates backend engineering instead of
describing it, that a visitor discovers rather than reads top to bottom, and that could only be
this person's site.

Five directions were developed independently and scored against originality, memorability,
technical demonstration, usability, performance, professionalism and identity: a request-line
navigation over a system schematic, a scroll-driven request journey, replayable production
decisions, an operator console, and a weaving draft of the career. Replay benches won on
demonstration and pacing; the console and the scroll journey lost as recognisable tropes; the
weaving draft lost on demonstration but was the only direction whose identity came from the
person rather than from the current taste in developer tooling.

#### Decision

Every case study is a bench: a working replay of the decision it describes, driven by a
deterministic discrete-event simulation in `src/bench`. The visitor pulls the lever the case
study pulled (provider health, concurrent writers, the report's data source, where a key lives,
which network answers) and watches the consequence before reading the written decision. The
same engine produces the transcripts served as JSON, the tables shown without JavaScript, and
the step-by-step mode used under reduced motion.

The identity is a loom. Sorocaba, where I studied and started, was the Manchester Paulista of
textile mills, and the work I do is the weft between fixed systems. The palette is unbleached
cotton, indigo, madder and loom iron. Motion is one pick per beat with no easing. The career is
a drawdown of technologies against months. Navigation is a tie-up grid of practices against
the cases that back them.

#### Consequences

- Client-side JavaScript returns, under a per-route budget enforced in CI. Decision 0003's
  zero-script rule is superseded by a size budget, not abandoned.
- A case study without a bench scenario fails the build, and so does a scenario that names an
  unknown project or technology.
- No command bar, no status-line ornament, no second drawing for phones: one layout function
  places stations vertically or horizontally from the same graph.
- Every number on a bench is labelled simulated or measured, and the two are never mixed.
