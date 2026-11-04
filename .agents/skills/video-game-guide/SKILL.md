---
name: video-game-guide
description: "Use when answering video-game questions (builds, quests)."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [gaming, pokemon, dragon-quest, walkthrough, party-build]
---

# Video Game Guide

Answer gameplay questions (party composition, evolutions, item effects,
quest walkthroughs, spawn locations) with verified data and one clear
recommendation.

## Procedure

1. Verify exact mechanics (evolution method/level, location name, quest
   steps) with `web_search` before answering from memory — game details
   are easy to misremember and the user catches errors.
2. Match reply length to the ask: one-line question gets a one-line answer
   (level, method, location). Expand only when the user asks for a build
   or comparison.
3. End build/team questions with exactly ONE decisive pick, not a menu of
   options. State what to swap, what to keep, and the single next action.
4. When comparing two options for an already-leveled team, weigh current
   levels and type coverage over theoretical best-in-slot — do not recommend
   replacing a high-level invested member with a low-level alternative
   without saying the cost.

## Pitfalls

- Never hedge with two opposite recommendations in one reply (e.g. telling
  the user to both replace and keep the same member) — it reads as having
  no conviction and draws an immediate correction.
- Never state a map/area name from memory when a search result gives the
  precise one — location errors destroy trust for walkthrough answers.
- When image analysis fails twice, stop trying new file variants and ask
  the user to type names + levels — repeated silent retries waste the turn
  with no new information.
- Respond in Vietnamese for gameplay answers unless the user switches
  language first.
