---
title: Legacy charset mock endpoint
tagline: A throwaway endpoint that answers in ISO-8859-1 to prove how a legacy consumer handled non-UTF-8 responses.
kind: also-built
status: internal
period: { start: '2026-01', end: '2026-01' }
role: sky-one
stack: [nodejs, express]
confidentiality: Support tooling for a customer integration. Not published.
evidence:
  - kind: none
---

A legacy consumer mis-handled accented characters. The fastest way to settle whether the platform
or the consumer was at fault was an endpoint that returns the same payload in a controlled
charset, so both sides could be tested against a known answer.
