---
title: A contest backend that mints the winners
tagline: Submissions, moderation and public voting on DynamoDB and S3, with winning entries minted as ERC-721 tokens by a single Lambda that holds the only key.
kind: case-study
status: delivered
period: { start: '2022-07', end: '2022-09' }
role: ciandt
featured: 3
stack:
  [
    nodejs,
    typescript,
    express,
    dynamodb,
    aws-s3,
    aws-lambda,
    jest,
    openapi,
    docker,
    solidity,
    hardhat,
    web3js,
    polygon,
  ]
confidentiality: Client work under CI&T. The brand is not named; the architecture is described without client internals.
evidence:
  - kind: company
    label: CI&T
---

A consumer brand ran a design contest whose winners received their design as a wearable token on
a metaverse platform. The backend had to take file submissions, let moderators shortlist, open
public voting without accounts, and hand finalists to an on-chain mint, all by the campaign date.
I was one of two backend engineers. We delivered it with integration and end-to-end tests against
local AWS emulation, and the minting key never touched the web service.

## Context

The campaign had a fixed launch date and a public vote. The client's AWS footprint was
serverless-friendly, with DynamoDB and S3 rather than a relational database. Two engineers had
to develop locally without sharing AWS accounts.

## Constraints

- Public voting with no login, and bots kept out without hurting real voters.
- Vote counts correct under concurrent traffic.
- DynamoDB and S3 by client decision; no relational database.
- Local development that runs without shared AWS accounts.
- The minting key must never sit in the web backend.

## The alternative on the table

Read-modify-write vote totals in the application. The first version did that and lost updates
under concurrent voting; the fix was an atomic increment expression on the item. An in-process
event emitter fanned out submission processing at first; failures were invisible and the order
untestable inside a request lifecycle, so processing became an explicit use case with its own
tests. A checkbox captcha adds friction to a one-click vote; reCAPTCHA v3 gates server-side with a
score and no interaction. Minting from the API server would have put the key that controls the
collection inside a public-facing service.

## Decision

An Express service organized one use case per folder (submission, confirmation, moderation,
threat status, favorites, finalists, vote, contest status) over DynamoDB and S3, with JWT-protected
admin routes, reCAPTCHA v3 on the vote, email confirmations, structured logging, and integration
and end-to-end tests with Jest against LocalStack. An ERC-721 contract on Polygon with pause,
burn, royalty and enumerable extensions. A single-purpose Lambda that signs and broadcasts mints
with the owner key from its own environment.

## What it cost

- DynamoDB access patterns were designed for the contest's known queries. Ad-hoc reporting needed
  a scan.
- reCAPTCHA v3 thresholds reject some real users on privacy-focused browsers. Accepted for a short
  campaign.
- The signing Lambda polls for the receipt on an interval rather than subscribing. Fine for a
  handful of mints, not for volume.

## Outcome

Delivered to the client on the campaign schedule, with the test suite covering repositories and
use cases end to end. The campaign ran on the client's side after the engagement, so I cannot
point at a public contract address.
