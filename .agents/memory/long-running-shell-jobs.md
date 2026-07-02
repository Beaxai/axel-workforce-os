---
name: Long-running shell jobs & pkill self-match
description: How to run >2min processes (e.g. Playwright demo recorder) in this environment without them being silently killed
---

- Background processes started with `setsid ... & disown` are unreliably reaped between bash tool sessions — a run can die silently mid-way with no log output. **Why:** the sandbox cleans up stray processes; there is no guarantee a detached job survives to the next tool call.
- **How to apply:** for jobs that must finish (video recording, batch scripts), make them fit inside a single foreground bash call (<120s budget) — trim sleeps/slowMo if needed — and redirect output to a file so it survives if the call is killed.
- `pkill -f <pattern>` self-matches the bash tool's own command line and kills the whole command instantly (exit 143 with no output, looks like a timeout). **How to apply:** always break the pattern with a character class, e.g. `pkill -f 'chrome-linu[x]'`.
- Playwright video: the .webm only gets its duration finalized by `context.close()`; a killed run leaves a partial file. Verify with `ffprobe` duration + frame extraction, never trust the run log alone.
