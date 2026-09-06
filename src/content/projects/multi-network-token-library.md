---
title: One interface for token reads across several chains
tagline: A library exposing common token functions across networks, detecting the network from the input and dispatching to a per-network implementation. Paused by the client during the Terra/Luna collapse.
kind: case-study
status: paused-by-client
period: { start: '2022-05', end: '2022-06' } # CONFIRM
role: ciandt
stack:
  [
    nodejs,
    typescript,
    ethereum,
    polygon,
    web3js,
    jest,
    mocha,
    aws-lambda,
    aws-sns,
    aws-ses,
    aws-s3,
    dynamodb,
  ]
confidentiality: Client work under CI&T. Nothing from this project is public.
evidence:
  - kind: none
---

A client monitoring blockchain transactions needed uniform reads such as `totalSupply` and
`balanceOf` across networks that each expose them differently. I built a library that identified
the network from the input and dispatched to that network's implementation, so callers never
dealt with per-chain details. After a few weeks the client paused the project indefinitely, during
the Terra/Luna collapse, and I moved to the design-contest backend.

## Constraints

- New networks and contracts must be added without touching the core.
- Bitcoin has no contracts. "Total supply" means something different there.
- Monitoring ran on AWS Lambda with SNS and SES notifications, and S3 and DynamoDB storage.

## Decision

[CONFIRM: the detection rule (address format, explicit chain id?) and the dispatch mechanism
(a registry of network adapters?). Which networks ran before the pause? If you cannot recall
specifics, this entry becomes one line under "Also built".]

## Outcome

Paused by the client in [CONFIRM: 2022-06]. Tests around the network integrations were in place.
[CONFIRM: what shipped before the pause]
