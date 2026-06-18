#!/usr/bin/env bash
#
# Baseline-gated typecheck for the Axel Workforce OS monorepo.
#
# Purpose: act as a lightweight CI quality gate that FAILS only when NEW
# TypeScript errors are introduced beyond the known, pre-existing baseline.
# This lets us keep shipping on a branch that still carries endemic errors
# (tracked as tech debt) while guaranteeing no regressions sneak in.
#
# Baselines (update these only when you intentionally fix errors and want the
# new, lower count to become the enforced ceiling):
#   - web (@workspace/axel-workforce-os): must stay clean (0 errors)
#   - api-server (@workspace/api-server): pre-existing endemic TS2769/TS7030 set
#
# Usage: bash scripts/typecheck-baseline.sh
# Exit code: 0 = no new errors (<= baseline); 1 = new errors or libs broken.

set -uo pipefail

API_BASELINE=114
WEB_BASELINE=0

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

count_errors() {
  # $1 = pnpm workspace filter (e.g. @workspace/api-server)
  local out
  out=$(pnpm --filter "$1" run typecheck 2>&1)
  printf '%s\n' "$out" | grep -c "error TS" || true
}

echo "==> Building shared libs (typecheck:libs)…"
if ! pnpm run typecheck:libs; then
  echo "FAIL: shared libs failed to compile. Libs must be error-free; fix them first."
  exit 1
fi

echo "==> Typechecking web (@workspace/axel-workforce-os)…"
WEB_ERRORS=$(count_errors @workspace/axel-workforce-os)
echo "    web errors: ${WEB_ERRORS} (baseline ${WEB_BASELINE})"

echo "==> Typechecking api-server (@workspace/api-server)…"
API_ERRORS=$(count_errors @workspace/api-server)
echo "    api-server errors: ${API_ERRORS} (baseline ${API_BASELINE})"

FAIL=0

if [ "${WEB_ERRORS}" -gt "${WEB_BASELINE}" ]; then
  echo "FAIL: web introduced $(( WEB_ERRORS - WEB_BASELINE )) NEW typecheck error(s) (now ${WEB_ERRORS}, baseline ${WEB_BASELINE})."
  FAIL=1
fi

if [ "${API_ERRORS}" -gt "${API_BASELINE}" ]; then
  echo "FAIL: api-server introduced $(( API_ERRORS - API_BASELINE )) NEW typecheck error(s) (now ${API_ERRORS}, baseline ${API_BASELINE})."
  FAIL=1
fi

if [ "${API_ERRORS}" -lt "${API_BASELINE}" ]; then
  echo "NOTE: api-server errors dropped to ${API_ERRORS} (below baseline ${API_BASELINE}). Lower API_BASELINE in this script to lock in the improvement."
fi

if [ "${FAIL}" -eq 0 ]; then
  echo "PASS: no new typecheck errors beyond baseline."
fi

exit "${FAIL}"
