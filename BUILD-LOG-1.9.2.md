# Build log 1.9.2 (2 Nov 2026)

Owner's GO: "GO, all 4 in one go" (1 Nov 2026, 15:30 Zürich), step 4 = 1.9 (PLAN-1.9.md). 1.9.2 is the one part of PLAN-1.9 C
that 1.9.0 and 1.9.1 left out: pseudo-localisation as a gate suite. Found after 1.9.1 went live, when PLAN-1.9 was read again
against what shipped; said to the owner in the 1.9.1 report.

## What 1.9.2 is
- `test/pseudo19.py`: the strings swapped for longer pseudo text, PT's screens walked at 1440 px and 390 px; every text from the
  strings, the three-language objects or the data; no raw key; no cut label; no sideways scrolling (RELEASE-CHECKS, 1.9.2).
- What it found (cause 74), fixed: the Firnlab vault's lines in German and Chinese (`strings22.js`, 22 lines); rows of buttons
  that pushed Insights and two stations sideways on a phone; the notes page's fixed filter column on a phone (sideways in English
  too); the cost pill of an AI button. Changelog `cl.192.*`.

## Gate and publish
- Before the gate: the new check's own false alarms fixed one by one (accented letters, project names with " · ", curly quotes,
  names and licences, toasts from before the swap, external link titles); 4 planted bugs added to `check_the_pick.py`, all caught.
- Full gate in four parts (the session's background limit is 2 hours): part A 39 of 39 green (the new "pseudo-localisation" row
  included); part B1 check the Pick tests 111 of 111 caught; part B2 check the hunt 10 of 10; part C click everything alone,
  0 problems. No flaky test.
- Published (2 Nov 2026, about 15:20 Zürich): preview `1793628914-30d1` (before `1793611842-c79f`); main `1793629097-1653`
  (before `1793612057-67af`). Capabilities carried forward.
- Live re-test: preview and main byte for byte the tested builds; smoke, PT outside claude.ai and the pseudo-localisation check
  green on the live preview.
- Code commit: `fb25ede`.
- Note: a new or changed line in the Firnlab vault (the monthly vault workflow) turns the pseudo-localisation check red until its
  German and Chinese are in `strings22.js`. That is on purpose.
