---
title: Senior Backend Developer
company: CI&T
companyGloss: large, publicly listed Brazilian software consultancy
location: Campinas, SP, Brazil
period: { start: '2022-05', end: '2022-11' }
stack:
  [
    nodejs,
    typescript,
    express,
    dynamodb,
    aws-s3,
    aws-lambda,
    aws-sns,
    aws-ses,
    jest,
    mocha,
    openapi,
    solidity,
    hardhat,
    web3js,
    polygon,
    ethereum,
    docker,
  ]
---

A consultancy engagement on blockchain-adjacent backends for a consumer brand. The first
assignment was a library exposing common token reads across several networks; the client
paused it during the Terra/Luna collapse. [CONFIRM] The second was a design-contest backend
with public voting and on-chain minting of the winning entries, delivered to a fixed campaign
date with one other backend engineer.

## Responsibilities

- Build backend services generic enough to add networks and contracts without core changes.
- Wire monitoring and notification flows on AWS Lambda, SNS, SES, S3 and DynamoDB.
- Write Jest and Mocha tests around blockchain integrations; document APIs with OpenAPI.
- Co-own a contest API with a second backend engineer and deliver it on the campaign date.

## Outcomes

- Contest backend delivered with integration and end-to-end tests against LocalStack.
- An ERC-721 contract and a single-purpose signing Lambda that holds the only minting key.
- Multi-network library paused by the client. [CONFIRM: what ran before the pause]
