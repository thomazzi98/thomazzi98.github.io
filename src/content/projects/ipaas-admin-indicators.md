---
title: Reporting on an integration platform without reading the execution store
tagline: Billing, usage and live execution indicators served from a slim reference collection instead of the collection every worker writes on every run.
kind: case-study
status: in-production
period: { start: '2023-09', end: '2024-01' }
role: sky-one
featured: 1
stack: [nodejs, typescript, express, mongodb, redis, jest, openapi, docker]
confidentiality: The source is private. Described from memory and my own commit history; no code is reproduced.
evidence:
  - kind: company
    label: Sky.One · Integra.Sky
---

The admin service of Integra.Sky had to answer operator and billing questions across every
customer space: how many executions are running now, how many succeeded or failed per space this
month, how much billable data each space moved, which plan applies. It answered them against the
execution store, the collection every worker writes on every run. I moved every one of those reads
onto a slim `execution-reference` collection, and the service served billing plans, usage and
running-execution indicators from it when I left in 2026-01.

## Context

Customer flows run on worker instances, and every run writes an execution document with its
payload, logs and component trail. Operators and billing needed aggregate answers over those
runs: counts by status, grouped by space, filtered by integration and flow, plus bytes moved and
duration for invoicing. Reading the execution collection for this put reporting load on the same
replica set the workers write to.

## Constraints

- Every worker writes to the execution collection on every run. Admin queries must not compete
  with those writes.
- Counts must be groupable by space and filterable by status, integration and flow, with
  pagination and sorting.
- Billing needs bytes moved and duration per execution, not the payload.
- The service had to keep the platform's existing shape (Express, MongoDB, Redis, dependency
  injection, one use case per folder) so other engineers could keep working in it.
- No downtime and no migration of the execution store.

## The alternative on the table

Aggregate directly over the execution collection with better indexes. Indexes help the reads,
but the aggregation still scans documents that carry payloads and logs, and the cost lands on the
replica set the workers depend on. A nightly copy into a reporting database was the other
option. "Running now" and "failed in the last hour" are operational questions that a day-old copy
cannot answer, and a second datastore is an operational surface the team did not have capacity
to own.

## Decision

Serve indicators, counts and usage from a slim `execution-reference` collection: one document per
execution carrying only space, integration, flow (id and name, denormalized), status, instance,
timestamps, billable bytes, duration and the last component. Admin use cases read only this
collection through a repository interface, with one shared query handler for filtering,
pagination and sorting.

## What it cost

- Two writes per execution instead of one, and the reference can lag the execution.
- Denormalized names go stale if a flow or space is renamed. Accepted, because reports are
  historical and renames are rare.
- Another collection to index and retain.

## Outcome

Billing plans, per-space usage, instance data and running-execution indicators were served by
this service from the reference collection until I left in 2026-01. I did not keep a
before-and-after measurement of the load taken off the execution replica set.
