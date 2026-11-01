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
(filled in after the run)
