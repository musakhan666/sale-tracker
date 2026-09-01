---
last_reviewed: 2026-09-01
---

# Sale Tracker

## Vision
Anyone following a brand knows a sale is coming before it starts, not after it ends.

## Problem
Shoppers discover sales too late to act on them. Every deals site lists what is
discounted right now; the window that actually lets someone plan a purchase — the
days before a sale opens — is unserved, and the timing that is published elsewhere
is frequently wrong.

## Target users
Deal-conscious shoppers who follow a handful of specific brands.

## Value proposition
The upcoming window, per brand, with timing you can trust. Competing aggregators
optimise for live-deal volume and affiliate breadth; nobody makes the pre-start
period legible, and nobody treats a wrong start time as a defect.

## Principles
- **Accuracy over coverage** — a sale listed with the wrong window is worse than a
  sale not listed at all; when the two conflict, drop the entry. The Timing
  integrity guardrail is where the measurable edge of this lives.
- **Upcoming over live** — the product's job is the future window. Restating today's
  discounts is table stakes served well elsewhere and never the reason to build here.
- **Ranking is never sold** — placement is a function of relevance and timing only.
  A brand cannot buy position, and no listing is ordered by commercial relationship.
- **Every view is an address** — any state a visitor can reach is a URL they can
  share, bookmark, and return to. Nothing meaningful lives only in memory.

## North-star metric
**Pre-start view share** — the proportion of sale views that happen before the sale
begins. It is the one number because it is the only one that separates this product
from a live-deals list: coverage, freshness, and timing accuracy all show up in it,
and a site that fails at foresight cannot move it however much traffic it gets.

## Quality goals
- **Timing integrity** — zero sales rendered with a status that disagrees with their
  own `startsAt`/`endsAt`, measured across every render path.
- **Freshness** — an added or amended sale is visible to the public within 15 minutes
  of ingest.
- **Crawlability** — every brand page and sale page serves complete, indexable
  content without client-side JavaScript.
- **Listing performance** — p75 Largest Contentful Paint under 2.0s on the brand
  listing page, on a 4G connection.
- **Ingest resilience** — one failing source degrades only its own brand; zero
  page-level failures caused by a single upstream error.

## Non-goals
- We will never sell placement, ranking, or inclusion.
- No checkout and no cart — we link out to the brand and never take the transaction.
- No behavioural profiling to personalise the feed; following a brand is an explicit
  act, never inferred.
- No general coupon or promo-code database — sales with windows, nothing else.

## Definition of Done
A change is done when:
- Every acceptance criterion of its tickets passes on the code as it lands.
- `npx tsc --noEmit`, `npx vitest run`, and `./scripts/check-coding-standards.sh`
  all pass on the landing tip.
- New behaviour carries tests; fixed behaviour carries a regression test.
- Any change touching sale-window logic carries boundary tests — the exact start
  instant, the exact end instant, a zero-length window, and DST in both directions.
- No Quality goal above regresses — measured at its stated threshold where a check
  exists, argued where not.
- `.spec/spec.md` reflects the change as landed.
- Any new dependency or externally visible contract change has an `ADR-###`.

Outcome criteria (judged across the sprint, not one PR):
- The sprint's landed change leaves Pre-start view share no worse than its
  pre-sprint reading.
