# Build log 1.8.1 (1 Nov 2026)

Owner's GO: "GO, all 4 in one go" (15:30 Zürich), order set at 15:33: first the scheduled-task link, then the history rewrite,
then the reminder list, then 1.9. The owner's first try of "Turn on" for the Sunday preparation run in 1.8.0 main failed with
"create_trigger: notifications only applies to triggers that start a new session each fire. Set create_new_session_on_fire=true,
or omit the notifications param".

## What 1.8.1 is
- Cause 69: every scheduled task PT creates (the Sunday preparation run; a second login's runner) asks for a new session per run
  and keeps notifications off; if the service refuses those settings, PT tries once more without them; any other refusal is shown,
  never retried; a preview copy never creates one (`Runner.create` in `core.js`).
- Nothing else changes. Changelog: `cl.181.fixed`.

## Checks
- `e2e180_run.py` (104, real-data copy and made-up bundle), static checks 0/0, strings complete, two planted bugs caught.
- Full gate: see below.

## Gate and publish
- Full gate in three parts (the session's background limit is 2 hours): part A, 32 suites, green (flows 1.5 review flaky once:
  "Execution context was destroyed" under load, logged in the ledger, green on its rerun); part B, check the hunt 10 of 10 and
  check the Pick tests 59 of 59 caught; part C, click everything alone, 0 problems.
- Published (1 Nov 2026, about 18:40 Zürich): preview `1793554511-e0e7` (before `1793541188-7ab4`); main `1793554626-3ad8`
  (before `1793541397-6111`). Capabilities carried forward.
- Live re-test of the preview: byte for byte the tested build; smoke green. (The running test is for the main build: a preview copy
  never runs drills, by design.)
- Code commit: `fb8e8f7`.
