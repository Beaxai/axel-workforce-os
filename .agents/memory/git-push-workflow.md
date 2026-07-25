---
name: Git push workflow (awf-os branch)
description: How and where feature work is pushed for this repo, and the hard never-touch-main rule.
---

Feature work for this repo ships to the GitHub branch `awf-os-brendy-sprint-1`, NOT main.

**Rule:** NEVER commit/merge/PR to GitHub main. Push only to the feature branch.

**How to apply (updated 2026-07-25 — token flow broke):**
- `listConnections("github")` now returns empty; do NOT rely on the raw-token push. Use the git-remote skill's `gitPush` callback instead.
- `gitPush` authenticates ONLY against a remote literally named `origin`. This repo's GitHub remote is named `github`; ensure `origin` exists with the same URL (`git remote add origin https://github.com/Beaxai/axel-workforce-os.git`).
- `gitPush` also refuses if the current branch tracks a non-origin upstream or if you try to publish under a different name. Working recipe: commit on your work branch, `git branch -f awf-os-brendy-sprint-1 HEAD && git checkout awf-os-brendy-sprint-1`, `git fetch origin && git branch --set-upstream-to=origin/awf-os-brendy-sprint-1`, then `await gitPush({})`, then check out the work branch again.
- Plain push only — no `--force`. Confirm remote head is an ancestor (status shows `[ahead N]`, no behind) before pushing.
- Do NOT commit screenshot/image artifacts.

**Why:** The owner reviews this branch on GitHub; main is protected and owner-managed. Replit's internal version control is separate from this GitHub push.
