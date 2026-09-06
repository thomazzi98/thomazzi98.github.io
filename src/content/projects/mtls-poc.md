---
title: Mutual-TLS reproduction harness
tagline: A Docker Compose setup with its own certificate authority to reproduce a customer's mutual-TLS failure on a laptop before touching the integration.
kind: also-built
status: internal
period: { start: '2025-12', end: '2025-12' }
role: sky-one
stack: [nodejs, typescript, express, docker]
confidentiality: Built for a customer integration on the platform worker. Not published.
evidence:
  - kind: none
---

A customer's endpoint required client certificates and the worker's calls were failing. Rather
than changing the integration blind, I built a harness that generates a CA, a server certificate
and a client certificate, runs a server that demands the client certificate, and lets the exact
worker flow be exercised locally until the failure reproduced.
