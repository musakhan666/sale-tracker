#!/usr/bin/env bash
set -uo pipefail

RED='\033[0;31m'; YELLOW='\033[0;33m'; GREEN='\033[0;32m'
DIM='\033[0;90m'; BOLD='\033[1m'; NC='\033[0m'

BLOCKING=0; WARNING=0; CHECKED=0
IGNORE_FILE=".coding-standards-ignore"

STAGED=$(git diff --cached --name-only --diff-filter=d 2>/dev/null || true)
[ -z "$STAGED" ] && exit 0

staged_content() { git show ":$1" 2>/dev/null || true; }

is_ignored() {
  [ -f "$IGNORE_FILE" ] && grep -q "^$1:$2:" "$IGNORE_FILE"
}

blocking() {
  is_ignored "$1" "$2" && return 0
  echo -e "  ${RED}BLOCK${NC} ${DIM}[$2]${NC} $1"
  echo -e "        $3"
  BLOCKING=$((BLOCKING + 1))
}

warning() {
  is_ignored "$1" "$2" && return 0
  echo -e "  ${YELLOW}WARN${NC}  ${DIM}[$2]${NC} $1"
  echo -e "        $3"
  WARNING=$((WARNING + 1))
}

echo -e "\n${BOLD}Coding Standards Check${NC}\n"

# --- Secrets must never be committed ---
for file in $STAGED; do
  case "$file" in
    .env|.env.*)
      [ "$file" = ".env.example" ] && continue
      blocking "$file" "secrets" "Env file staged — never commit secrets. Unstage and gitignore it."
      ;;
  esac
done

TS_FILES=$(echo "$STAGED" | grep -E '\.(ts|tsx)$' || true)

for file in $TS_FILES; do
  content=$(staged_content "$file")
  CHECKED=$((CHECKED + 1))
  base=$(basename "$file")

  # strip comment-only lines so comments don't trip the greps
  code=$(echo "$content" | grep -vE '^\s*(//|\*|/\*)' || true)

  case "$file" in *.d.ts) ;; *)
    if echo "$code" | grep -qE '(:\s*any\b|as any\b|<any>|Array<any>)'; then
      line=$(echo "$content" | grep -nE '(:\s*any\b|as any\b|<any>)' | head -1 | cut -d: -f1)
      blocking "$file:$line" "any" "Found \`any\` — use \`unknown\` and narrow it"
    fi
  ;; esac

  if echo "$code" | grep -q '@ts-ignore'; then
    blocking "$file" "ts-ignore" "@ts-ignore — use @ts-expect-error with a reason"
  fi

  if echo "$code" | grep -qE '\b(eval|new Function)\s*\('; then
    blocking "$file" "security" "eval/new Function — code injection risk"
  fi

  if echo "$code" | grep -q 'dangerouslySetInnerHTML'; then
    blocking "$file" "xss" "dangerouslySetInnerHTML — sanitise, or render as text"
  fi

  # empty catch block
  if echo "$code" | grep -qE 'catch\s*(\([^)]*\))?\s*\{\s*\}'; then
    blocking "$file" "error-handling" "Empty catch — handle it or return a Result"
  fi

  # secrets in client files
  if echo "$content" | head -3 | grep -q '"use client"'; then
    if echo "$code" | grep -qE 'process\.env\.' && \
       echo "$code" | grep -E 'process\.env\.' | grep -qvE 'process\.env\.NEXT_PUBLIC_'; then
      blocking "$file" "secrets" "process.env in a client file without NEXT_PUBLIC_ — secret would ship to the browser"
    fi
  fi

  # named exports only
  # Convex mandates a default export for these entry points, exactly as Next.js
  # does for page/layout — matched on full path so an unrelated schema.ts elsewhere
  # is still checked.
  case "$file" in
    convex/schema.ts|convex/crons.ts|convex/http.ts|convex/auth.config.ts|convex/_generated/*) base="__framework__" ;;
  esac
  case "$base" in
    __framework__|page.tsx|layout.tsx|loading.tsx|error.tsx|not-found.tsx|global-error.tsx|route.ts|middleware.ts|*.config.ts|*.config.mts) ;;
    *)
      if echo "$code" | grep -qE '^export default '; then
        blocking "$file" "exports" "export default in a non-page file — use a named export"
      fi
    ;;
  esac

  lines=$(echo "$content" | wc -l | tr -d ' ')
  if [ "$lines" -gt 200 ]; then
    warning "$file" "size" "$lines lines — over 200, split by responsibility"
  fi
done

# --- React / JSX only ---
TSX_FILES=$(echo "$STAGED" | grep -E '\.tsx$' || true)

for file in $TSX_FILES; do
  content=$(staged_content "$file")
  code=$(echo "$content" | grep -vE '^\s*(//|\*|/\*)' || true)

  if echo "$code" | grep -qE 'className=.*#[0-9a-fA-F]{3,8}|style=\{\{[^}]*#[0-9a-fA-F]{3,8}'; then
    blocking "$file" "design-tokens" "Hardcoded hex colour — use a theme token from globals.css"
  fi

  if echo "$code" | grep -qE 'className=\{`'; then
    blocking "$file" "tailwind" "Template-literal className — use cn() from @/lib/cn"
  fi

  if echo "$code" | grep -qE '<img[[:space:]]'; then
    blocking "$file" "react" "Raw <img> — use next/image"
  fi

  if echo "$code" | grep -qE 'key=\{(index|i)\}'; then
    warning "$file" "react" "Array index as key — use a stable record id"
  fi

  if echo "$code" | grep -qE '<div[^>]*onClick='; then
    blocking "$file" "a11y" "onClick on a div — use a <button>"
  fi

  if echo "$code" | grep -qE 'console\.(log|debug)'; then
    warning "$file" "quality" "console.log in a component — remove before shipping"
  fi
done

# --- Convex ---
CVX_FILES=$(echo "$STAGED" | grep -E '^convex/.*\.ts$' || true)

for file in $CVX_FILES; do
  content=$(staged_content "$file")
  code=$(echo "$content" | grep -vE '^\s*(//|\*|/\*)' || true)
  case "$file" in convex/schema.ts|convex/_generated/*) continue ;; esac

  if echo "$code" | grep -qE '\.query\(' && echo "$code" | grep -qE '^\s*\.filter\('; then
    blocking "$file" "convex" "db.query().filter() — define an index and use withIndex()"
  fi

  if echo "$code" | grep -qE '\.collect\(\)'; then
    warning "$file" "convex" ".collect() on a query — bound it with .take(n) or paginate"
  fi

  if echo "$code" | grep -qE '^export const .* = mutation\('; then
    if ! echo "$content" | grep -qE 'getUserIdentity|requireAuth|// public:'; then
      blocking "$file" "auth" "Public mutation with no auth guard — add a guard or a '// public:' reason"
    fi
  fi

  if echo "$code" | grep -qE '=\s*(query|mutation|action)\(\{' && ! echo "$code" | grep -q 'args:'; then
    blocking "$file" "convex" "Convex function without args validators"
  fi
done

echo ""
echo -e "${DIM}Checked $CHECKED file(s)${NC}"
if [ "$BLOCKING" -gt 0 ]; then
  echo -e "${RED}${BOLD}BLOCKED${NC} — $BLOCKING blocking issue(s)"
  [ "$WARNING" -gt 0 ] && echo -e "${YELLOW}Also: $WARNING warning(s)${NC}"
  echo -e "${DIM}Rules: ~/.claude/skills/coding-standards/ · override via .coding-standards-ignore${NC}"
  exit 1
elif [ "$WARNING" -gt 0 ]; then
  echo -e "${GREEN}${BOLD}PASSED${NC} with ${YELLOW}$WARNING warning(s)${NC}"
  exit 0
else
  echo -e "${GREEN}${BOLD}PASSED${NC} — all clean"
  exit 0
fi
