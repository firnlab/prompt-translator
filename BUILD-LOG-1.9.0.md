# Build log 1.9.0 (2 Nov 2026)

Owner's GO: "GO, all 4 in one go" (1 Nov 2026, 15:30 Zürich), step 4 = 1.9 (PLAN-1.9.md). One-GO release: build, full gate,
preview publish, live re-test, main publish, releases.json as a PR the owner merges.

## What 1.9.0 is
Built by three parallel builders on separate files, merged here.
1. **Care** (`v190_care.js`, `strings18.js`): the owner's reminders R1 (quarterly export line; read-only viewer outside
   claude.ai), R2 (how customers get AI, server-backed key with a required limit), R3 (AI ceiling from Feb 2027), R5 (push
   switch, off by default), R7 (key renewal from 4 Oct 2027).
2. **Scan** (`v190_scan.js`, `v190_interview.js`, `strings19.js`, `tools/changelog.py`): self-scan with one-tap shortcuts
   (propose only), the 4×4 interview, the generated public changelog, "What changed" per tool version.
3. **Fleet** (`v190_fleet.js`, `strings20.js`): update my tools to the current kit (one card = GO, one tool at a time, two
   green live checks, stop on the first red, other people's tools prepared). The current kit is 1.8.0 (`FL19_BASE`), so live
   tools built with the 1.7 kits show as behind it from now on.
Not in 1.9.0 (1.9.1, PLAN-1.9 waves): sealed twins, independent judge, second-lab reviews.

## Never tried for real (named at publish, per the 1.8.1/1.8.2 lesson)
- Push: a task created with push and the "noteworthy only" rule; whether the service pushes depends on how it reads the run.
- The kit run: rebuild, republish in place, two live checks, rollback to the previous version, on real tools.

## Gate and publish
(filled in after the run)
