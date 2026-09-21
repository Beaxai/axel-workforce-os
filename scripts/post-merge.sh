#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Closed stdin in the merge runner must never trigger interactive installation.
CI=true pnpm install --frozen-lockfile
pnpm run typecheck:libs

# Do not run drizzle push (especially --force) against the shared Development
# database. Its inferred diff can include unrelated branches' data and prompt
# for truncation. Apply required, reviewed migrations explicitly and verify
# them independently; application/workflow startup must not perform DDL.
echo "Post-merge dependencies and shared libraries ready."
echo "Database schema unchanged; any required migrations need explicit review."
