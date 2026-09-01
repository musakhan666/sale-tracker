# Sale Tracker

A public site for browsing upcoming sales, organised by brand. Read-heavy,
SEO matters, data changes constantly.

**Stack:** Next.js 16 · React 19 · TypeScript strict · Tailwind v4 (CSS-first
`@theme`, no config file) · Convex · Vitest
**Paths:** `@/*` → `src/*`

## Coding standards

All coding rules live in `~/.claude/skills/coding-standards/`. Read its `SKILL.md`
and load rule files on demand. Nothing in this file repeats them.

Enforcement: `scripts/check-coding-standards.sh` runs as a pre-commit hook.
BLOCKING violations stop the commit. Exceptions go in `.coding-standards-ignore`
with a written reason.

## Domain model

Two entities. Everything else hangs off them.

- **Brand** — has a `slug` (the URL identity, stable, never regenerated), a name,
  and zero or more sales.
- **Sale** — belongs to exactly one brand. Has `startsAt` and `endsAt` as epoch ms
  UTC, and a `discountPercent`.

## The rule this project turns on

**Sale status is derived, never stored as truth.**

`upcoming` / `live` / `ended` is a pure function of `startsAt`, `endsAt`, and `now`.
That function lives in `convex/lib/window.ts` and is imported by both the backend
and the frontend. It is never reimplemented, never inlined, never approximated with
a date comparison written on the spot.

The `status` column in the `sales` table exists for one reason: so it can be
indexed. A scheduled Convex function maintains it. Nothing else writes it, and no
application logic branches on it. If the stored value and the derived value
disagree, the derived value is correct and the cron is broken.

**Consequences that follow from this, and are not optional:**

- Every window function takes `now` as an argument with a default. A function that
  reads `Date.now()` internally cannot be tested and is rejected.
- `now` is never computed during a Server Component render — a cached page freezes
  it. Never during first client render either — that is a hydration mismatch.
  Read the clock in an effect after mount, render a skeleton until then.
- Window logic is BLOCKING for test coverage: the exact start instant, the exact end
  instant, a zero-length window, DST in both directions, viewers ahead of and behind
  UTC. See `rules/testing.md`.

## URL is the state

Brand, status, and sort live in search params — not `useState`. A filtered view
must survive a refresh, a back button, a shared link, and a crawler. If you are
syncing state to the URL with an effect, delete the state.

## Design tokens

Defined in `src/app/globals.css` under `@theme`. Not yet chosen — fill this table
when they are, and never use a hex literal in a component.

| Token | Value | Use |
|---|---|---|
| `--color-primary` | TBD | dominant |
| `--color-accent` | TBD | rare, high-emphasis (a live sale) |
| `--color-bg` / `--color-surface` | TBD | tinted toward the brand hue, never `#fff` |
| `--color-text` / `--color-muted` | TBD | never `#000` |
| `--color-border` | TBD | |

## Commands

```bash
npm run dev                        # next dev
npx convex dev                     # backend, run alongside
npx tsc --noEmit                   # typecheck
npx vitest run                     # tests
./scripts/check-coding-standards.sh  # standards (also runs at pre-commit)
```
