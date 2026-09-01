---
version: 1
status: draft
date: 2026-09-01
author: musa
previous: null
---

# Sprint v1 — Upcoming sales, browsable by brand

## Goal

This sprint succeeds iff a visitor can see every tracked brand's upcoming sales ordered by start time, with:
- each sale's status derived from its own `startsAt`/`endsAt` at view time, never read from a stored field
- brand and status filters carried in the URL, so a filtered view survives a refresh and a shared link

## Non-goals

- No following, watchlist, or per-visitor state (`US-007`, `US-008`)
- No notifications or email of any kind
- No automated ingest — sales are seeded by hand this sprint
- No brand-authored content; brands do not log in

## Solution

The site becomes usable for the first time: a visitor lands on a list of sales that have not started yet, narrows it to one brand or one status, sees each start time in their own timezone, and can send anyone the exact view they are looking at.

## User-stories slice

- `US-001` — sprint detail: full slice; default ordering is soonest-opening first
- `US-002` — sprint detail: full slice; upcoming, live, and ended all filterable
- `US-003` — sprint detail: viewer-timezone start time and relative countdown; no reminder or alert
- `US-004` — sprint detail: full slice; brand, status, and sort all live in search params
- `US-005` — sprint detail: full slice
- `US-006` — sprint detail: brand index only; text search over brands is deferred

## Epics

- `epic:foundation` — no `US-###`; the scaffold, schema, and seed scope rows every other epic builds on
- `epic:sale-browsing` — `US-001`, `US-002`, `US-003`, `US-004`; the listing, filters, and time display scope rows
- `epic:brand-pages` — `US-005`, `US-006`; the per-brand page and brand index scope rows

## Scope

| In scope this sprint | Out of scope this sprint |
| --- | --- |
| Next.js + Convex scaffold, Tailwind theme tokens | Automated sale ingest from any external source |
| `brands` and `sales` schema with the indexes the listing needs | Following a brand and the followed-only view (`US-007`, `US-008`) |
| Shared window function deriving upcoming / live / ended | Text search over brands (`US-006` remainder) |
| Hand-seeded dataset covering several brands | Reminders, alerts, or any notification channel |
| Sale listing with brand, status, and sort in the URL | Brand-authored content and brand accounts |
| Per-brand page and brand index | Paid placement or ranking controls |

## Architecture

Greenfield — no `.spec/spec.md` exists yet; this sprint founds it. A Convex backend owns `brands` and `sales` (`ADR-001`), with status materialised into an indexed column purely so the listing query can use an index, while the truth stays a shared pure window function imported by both backend and frontend (`ADR-002`). The dataset is hand-seeded this sprint (`ADR-003`).

## Success metric

North-star (Pre-start view share, defined in `.brief/brief.md`) — this sprint's metric: pre-start view share, establish baseline at the first full week of readings after launch.

## Timebox

1 week.

## Definition of Done

Canonical DoD per `.brief/brief.md#definition-of-done`. Sprint-specific addition: the deployed site serves the brand index, a brand page, and the sale listing from real Convex data rather than fixtures.

## Dependencies & Risks

| Dependency / Risk | Impact | Tracking Issue |
| --- | --- | --- |
| No Convex deployment provisioned yet | Blocks every backend scope row in `epic:foundation` | — |
| Sale data has no source; v1 seeds by hand | Coverage stays small, so the north-star baseline may not be representative | — |
| Sale timing is only as accurate as the hand-entered source | Directly risks the Timing integrity quality goal the Goal's first bullet rests on | — |
