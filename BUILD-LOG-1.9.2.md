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
(filled in after the gate)
