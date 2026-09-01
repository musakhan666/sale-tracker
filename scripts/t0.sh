#!/usr/bin/env bash
# T0 — the sprint's machine-acceptance gate.
#
# Answers exactly one question: does the machine accept this code?
# Typecheck only. No behaviour test runs here — that is a separate,
# post-land concern. See the T0 Writer report for why.
#
# Single invocation, no flags: ./scripts/t0.sh

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

# ---------------------------------------------------------------------------
# Baked at generation time. Do not compute at runtime — a moving base would
# make the same tree produce a different verdict on different days.
# ---------------------------------------------------------------------------

# The sprint-base commit this worktree sat on when t0.sh was generated
# (tip of feat/sprint-v1 at generation time). Every implementer worktree
# this sprint is a descendant of this commit.
BASE_COMMIT="1ab5f4ca9856d891c07c4e6c977376b28742355a"

# scripts/t0.sh itself is gate infrastructure, not sprint product code.
# It always differs from BASE_COMMIT (BASE_COMMIT predates its own
# existence) and is frozen/policed separately at collection — never here.
EXEMPT_PATH="scripts/t0.sh"

# Baked scope, from the handed sprint footprint.
SCOPE_PREFIX_1="src/"
SCOPE_PREFIX_2="convex/"

# Session upward amendment: ticket #5 (Convex schema) legitimately adds the
# `convex` package as a project dependency, which necessarily touches the
# repo-root dependency manifests. Widened once, upward only, by the session
# — not by implementer improvisation. Exact-match, not prefixes: this does
# not open the repo root generally.
SCOPE_EXACT_1="package.json"
SCOPE_EXACT_2="package-lock.json"

# Measured on the clean tree at generation time (0 pre-existing errors).
TS_BASELINE=0

TSBUILDINFO="tsconfig.tsbuildinfo"

# ---------------------------------------------------------------------------
# 1. Provision
# ---------------------------------------------------------------------------

if ! NPM_OUTPUT="$(npm install 2>&1)"; then
  printf '%s\n' "$NPM_OUTPUT"
  echo ""
  echo "T0 FAILED — fix the errors above and re-run this exact script."
  exit 1
fi

# ---------------------------------------------------------------------------
# 2/3. Typecheck — strongest available checker, cache-cold, ratcheted.
# ---------------------------------------------------------------------------

rm -f "$TSBUILDINFO"
TS_OUTPUT="$(npx tsc --noEmit --pretty false --noErrorTruncation 2>&1)"
rm -f "$TSBUILDINFO"

TS_ERROR_COUNT="$(printf '%s\n' "$TS_OUTPUT" | grep -c 'error TS' || true)"
TS_ERROR_COUNT="${TS_ERROR_COUNT:-0}"

TS_RED=0
if [ "$TS_ERROR_COUNT" -gt "$TS_BASELINE" ]; then
  TS_RED=1
fi

# ---------------------------------------------------------------------------
# 4. Suppression sweep — added lines only, scanned against BASE_COMMIT plus
#    the working tree (covers committed sprint work and in-progress edits).
# ---------------------------------------------------------------------------

is_exempt_path() {
  [ "$1" = "$EXEMPT_PATH" ]
}

# Prints "lineno:content" for every added line of a file: for tracked
# files, the added lines of `git diff -U0 BASE_COMMIT -- file`; for
# untracked files (new this sprint), the whole file.
scan_added_lines() {
  file="$1"
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    git diff -U0 "$BASE_COMMIT" -- "$file" | awk '
      /^@@/ {
        line = $0
        sub(/^@@ -[0-9,]+ \+/, "", line)
        sub(/ @@.*/, "", line)
        split(line, parts, ",")
        newline = parts[1] + 0
        next
      }
      /^\+\+\+/ { next }
      /^---/ { next }
      /^\+/ {
        print newline ":" substr($0, 2)
        newline++
        next
      }
      /^-/ { next }
    '
  elif [ -f "$file" ]; then
    awk '{ print NR ":" $0 }' "$file"
  fi
}

ts_scope_files() {
  {
    git diff --name-only "$BASE_COMMIT" -- '*.ts' '*.tsx' 2>/dev/null
    git ls-files --others --exclude-standard -- '*.ts' '*.tsx' 2>/dev/null
  } | sort -u
}

SUPPRESSION_HITS=""
while IFS= read -r path; do
  [ -z "$path" ] && continue
  is_exempt_path "$path" && continue

  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    lineno="${entry%%:*}"
    content="${entry#*:}"

    # @ts-ignore / @ts-expect-error are always written *as* a comment —
    # checked on every added line, comment or not.
    if printf '%s' "$content" | grep -qE '(@ts-ignore|@ts-expect-error)'; then
      SUPPRESSION_HITS="${SUPPRESSION_HITS}${path}:${lineno}:${content}
"
      continue
    fi

    # Grandfather pure-prose comment lines the same way the repo's own
    # standards script does, so "// don't use any here" isn't a false
    # positive — but this only applies to the `any`-shaped patterns below.
    if printf '%s' "$content" | grep -qE '^[[:space:]]*(//|\*|/\*)'; then
      continue
    fi

    if printf '%s' "$content" | grep -qE '(:[[:space:]]*any\b|\bas[[:space:]]+any\b|<any>|Array<any>|,[[:space:]]*any\b)'; then
      SUPPRESSION_HITS="${SUPPRESSION_HITS}${path}:${lineno}:${content}
"
    fi
  done <<EOF
$(scan_added_lines "$path")
EOF
done <<EOF
$(ts_scope_files)
EOF

# ---------------------------------------------------------------------------
# 5. Footprint guard — every touched path (committed since BASE_COMMIT, or
#    still sitting in the working tree) must fall inside the baked scope.
# ---------------------------------------------------------------------------

touched_paths() {
  {
    git diff --name-only "$BASE_COMMIT" 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u
}

FOOTPRINT_HITS=""
while IFS= read -r path; do
  [ -z "$path" ] && continue
  is_exempt_path "$path" && continue
  case "$path" in
    "$SCOPE_PREFIX_1"*|"$SCOPE_PREFIX_2"*) continue ;;
    "$SCOPE_EXACT_1"|"$SCOPE_EXACT_2") continue ;;
    *)
      FOOTPRINT_HITS="${FOOTPRINT_HITS}${path}
"
      ;;
  esac
done <<EOF
$(touched_paths)
EOF

# ---------------------------------------------------------------------------
# 6. Report
# ---------------------------------------------------------------------------

if [ "$TS_RED" -eq 1 ] || [ -n "$SUPPRESSION_HITS" ] || [ -n "$FOOTPRINT_HITS" ]; then
  if [ "$TS_RED" -eq 1 ]; then
    echo "----- root·tsc --noEmit -----"
    printf '%s\n' "$TS_OUTPUT"
    echo ""
    echo "root·tsc: $TS_ERROR_COUNT error(s) — baseline is $TS_BASELINE"
    echo ""
  fi

  if [ -n "$SUPPRESSION_HITS" ]; then
    echo "----- suppression sweep — added lines since $BASE_COMMIT -----"
    printf '%s' "$SUPPRESSION_HITS"
    echo "silencing directive found in added lines above — fix the underlying error instead"
    echo ""
  fi

  if [ -n "$FOOTPRINT_HITS" ]; then
    echo "----- footprint guard — baked scope is src/**, convex/**, package.json, package-lock.json -----"
    printf '%s' "$FOOTPRINT_HITS"
    echo "path(s) above fall outside the sprint's baked scope"
    echo ""
  fi

  echo "T0 FAILED — fix the errors above and re-run this exact script."
  exit 1
fi

echo "T0: PASS (root·tsc $TS_ERROR_COUNT errors)"
exit 0
