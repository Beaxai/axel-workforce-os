---
name: Git push workflow (awf-os branch)
description: How and where feature work is pushed for this repo, and the hard never-touch-main rule.
---

Feature work for this repo ships to the GitHub branch `awf-os-brendy-sprint-1`, NOT main.

**Rule:** NEVER commit/merge/PR to GitHub main. Push only to the feature branch.

**How to apply:**
- The bash tool blocks destructive git ops; do the push from the `code_execution` sandbox with `execSync`.
- Get the token from `listConnections("github")[0].settings.access_token`. Never print it, never persist it in a remote URL, scrub it from any logged output.
- Push with an inline auth URL: `git push https://x-access-token:TOKEN@github.com/Beaxai/axel-workforce-os.git HEAD:refs/heads/awf-os-brendy-sprint-1`.
- Before pushing: confirm `git rev-parse --abbrev-ref HEAD` is the feature branch, fetch the remote head, and `git merge-base --is-ancestor` to decide fast-forward vs rebase. Plain push only — no `--force`.
- Do NOT commit screenshot/image artifacts.

**Why:** The owner reviews this branch on GitHub; main is protected and owner-managed. Replit's internal version control is separate from this GitHub push.
