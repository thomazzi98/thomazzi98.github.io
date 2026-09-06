---
title: quake-log
tagline: A Quake 3 Arena log parser that groups kills by match and by cause of death, written as a take-home exercise.
kind: also-built
status: personal
period: { start: '2022-08', end: '2022-08' }
stack: [nodejs, typescript]
evidence:
  - kind: repo
    label: RafaelThomazzi/quake-log
    url: https://github.com/RafaelThomazzi/quake-log
---

The classic parsing exercise: read a server log, split it into matches, count kills per player
and per weapon, and handle the world killing a player as a negative score.
