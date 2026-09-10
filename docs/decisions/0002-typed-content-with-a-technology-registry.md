---
title: Typed content collections with a technology registry
status: accepted
date: 2026-09-06
---

#### Context

Portfolio sites drift: a skill listed on one page has no project behind it, a project names a
tool no role used, a resume export disagrees with the site. Copy lived in three places on my
previous attempts.

#### Decision

Roles, projects and education are Astro content collections validated by Zod. Technologies are
a registry keyed by id; roles and projects reference ids, never names. A check at build time
fails on a reference to an unknown id and on a registry entry that no role or project cites.
`resume.txt`, `llms.txt`, the stack page and the career trace derive from the same collections.

#### Consequences

- The stack page cannot become a logo wall. Adding a technology means adding the work that
  evidences it, or the build fails.
- Case-study bodies are markdown, so a weaker study can omit a section without a schema fight.
- The registry rule is enforced in `src/lib/integrity.ts` with unit tests rather than in Zod,
  because it needs all four collections at once.
- Amended by decision 0006 on 2026-09-09: the projects collection, the stack page and the career
  trace were retired. Roles, education, practices and technologies remain; the three systems cite
  technologies too, and a practice names the system or the role that backs it.
