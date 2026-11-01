# Build log 1.8.2 (1 Nov 2026)

Owner's GO: "GO, all 4 in one go" (15:30 Zürich), step 1 (the scheduled-task link). The owner's try of "Turn on" in 1.8.1 main
(19:30) failed with "create_trigger: no session_id in auth claims, so cannot inherit environment_id from the calling session".
The owner asked not to spend another 4-hour run on a guess; a one-button test page sent the exact 1.8.2 request from a page first
(19:39): accepted with the listed environment, switched off, deleted.

## What 1.8.2 is
- Cause 70: every scheduled task PT creates takes a cloud environment from the service's list when asked, and PT remembers it.
- PT tells the owner to turn on "Automatically approve" for a task it created (the service gives such a task no automatic approval).
- Nothing else changes. Changelog: `cl.182.fixed`.

## Gate and publish
- Full gate in three parts: part A 32 of 32 green; part B check the hunt 10 of 10, check the Pick tests 61 of 61 caught;
  part C click everything alone, 0 problems.
- Published (1 Nov 2026, about 22:25 Zürich): preview `1793568176-3b15` (before `1793554511-e0e7`); main `1793568295-4f03`
  (before `1793554626-3ad8`). Capabilities carried forward.
- Live re-test of the preview: byte for byte the tested build; smoke green.
- Code commit: `9f225da`.
