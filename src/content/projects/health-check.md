---
title: health-check
tagline: A small availability monitor that stores snapshots locally and sends an SMS through SNS when a service stops answering.
kind: also-built
status: personal
period: { start: '2023-02', end: '2023-02' }
stack: [nodejs, typescript, express, aws-sns]
evidence:
  - kind: repo
    label: RafaelThomazzi/health-check
    url: https://github.com/RafaelThomazzi/health-check
---

Written in my first months at Sky.One to watch a handful of endpoints from outside the platform.
It polls on a schedule, keeps a local history of responses, and pages by SMS on the first failure.
