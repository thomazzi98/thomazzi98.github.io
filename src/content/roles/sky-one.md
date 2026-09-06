---
title: Senior Full Stack Developer
company: Sky.One Solutions
companyGloss: Brazilian SaaS company; its Integra.Sky product is an integration platform (iPaaS)
location: Remote, Brazil # CONFIRM
period: { start: '2022-11', end: '2026-01' } # CONFIRM end month
stack:
  [nodejs, typescript, express, mongodb, redis, rabbitmq, aws-ses, aws-sns, jest, openapi, docker]
---

Integra.Sky moves data between customers' ERPs and third-party systems. Flows run on worker
instances and every run writes an execution record. The services are Node.js and TypeScript on
MongoDB, with Redis, RabbitMQ and AWS messaging, deployed to Kubernetes. I owned REST services
from design through release and production support, and wrote the integrations between platform
modules and external systems.

## Responsibilities

- Design, build and operate REST services in Node.js and TypeScript on MongoDB.
- Build the admin service's billing-plan, usage and execution-indicator features.
- Write integrations that move data between platform modules and external systems.
- Handle production issues end to end: reproduce, find the root cause, ship the fix, follow up.
- Review code and support less experienced engineers on the team. [CONFIRM: how formal]

## Outcomes

- Admin indicators and billing read from a reference collection instead of the execution store.
- Reproduction harnesses for customer-facing failures: mutual TLS, a legacy charset consumer.
- [CONFIRM: work between 2024-02 and 2026-01. Nothing local covers it and it is the longest
  stretch of the role.]
