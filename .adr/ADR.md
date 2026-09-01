## ADR-001 — Convex as the backend

> In the context of a greenfield, read-heavy sale tracker whose data changes constantly, facing the need for indexed time-window queries and scheduled work, we decided to use Convex as the sole backend to achieve typed end-to-end queries and built-in scheduling with no migration story, accepting a hosted-platform dependency we cannot self-host.

- **Date:** 2026-09-01
- **Context:** Sales appear, open, and expire on their own, so the backend must run scheduled work as well as serve queries. No code or spec exists yet to constrain the choice.
- **Decision:** Convex is the backend and the only database. Schema, queries, mutations, and cron functions live in `convex/`.
- **Alternatives rejected:**
  - Postgres + Prisma on a managed host — more portable, but scheduling and reactivity become ours to build and operate.
  - Flat files in `src/data/` redeployed on change — every sale edit becomes a code change; fails in the first week of real data.
- **Locks in:** server logic is written as Convex functions; every listing query is index-driven; the status refresh runs as a Convex cron.
- **Makes harder:** self-hosting; migrating to a SQL database later; any query shape Convex's index model does not express.
- **Scope:** backend — cross-cutting
- **Revisit when:** query shape outgrows what Convex indexes express, or self-hosting becomes a requirement.

## ADR-002 — Derived sale status with an indexed mirror

> In the context of sale status changing with the clock rather than with any write, facing the need to both filter by status in an indexed query and render it correctly at any instant, we decided to derive status from one shared pure window function and mirror it into an indexed column maintained by a cron, to achieve indexable filtering without a second source of truth, accepting that the mirror is briefly stale between cron runs.

- **Date:** 2026-09-01
- **Context:** `US-001`, `US-002`, and `US-003` all turn on upcoming / live / ended, but no write event marks a transition — the clock does. An index needs a stored column; a stored column is wrong the moment it is written.
- **Decision:** `convex/lib/window.ts` holds the pure function, taking `now` as an argument; backend and frontend both import it. The `sales.status` column exists only to be indexed and is written solely by a scheduled function. No application logic branches on the stored value; where stored and derived disagree, derived is correct.
- **Alternatives rejected:**
  - Store status as truth and write it on transition — nothing triggers the transition; needs a write per sale per boundary.
  - Compute status per query with no stored column — cannot use an index; forces a table scan that degrades as sales accumulate.
- **Locks in:** every window function takes `now` as an argument with a default; no render path reads the clock during a Server Component render or first client render; boundary tests are mandatory on window logic.
- **Makes harder:** any query needing status accurate to the second at the index level; the cron interval becomes a correctness parameter, not a tuning knob.
- **Scope:** sales — cross-cutting
- **Revisit when:** Convex supports time-range or computed indexes natively, or the cron interval produces a user-visible wrong status.

## ADR-003 — Hand-seeded sale data for v1

> In the context of a v1 whose premise — that a pre-start view of sales is useful — is still unproven, facing a choice between building ingest and testing that premise, we decided to seed brands and sales by hand for v1 to achieve a working product inside one sprint, accepting small coverage and a north-star baseline that may not be representative.

- **Date:** 2026-09-01
- **Context:** The product's core premise is untested. Ingest is the larger engineering effort and only matters if the premise holds.
- **Decision:** v1 ships a hand-maintained seed of brands and sales. No scraper, no affiliate feed, no brand self-submission.
- **Alternatives rejected:**
  - Scrape brand sites and newsletters — consumes most of the sprint, and its failure mode lands directly on the Timing integrity quality goal.
  - Affiliate network feed — live-deal oriented and thin on upcoming; its ranking incentives conflict with the brief's "ranking is never sold" principle.
  - Brand self-submission — cold start: no brands before traffic, no traffic before brands.
- **Locks in:** the seed's shape becomes the de facto contract any later ingest must produce.
- **Makes harder:** coverage claims; establishing a representative north-star baseline this sprint.
- **Scope:** data ingest
- **Revisit when:** the pre-start view shows real usage, or hand-seeding costs more than about an hour a week.
