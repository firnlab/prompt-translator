# Findings for 1.3 (19 Oct 2026, from Owner's list at 19:45)

Reproduced on a copy of the real data (live-1116), build 1.2.1.

1. Language on the picker: `boot-lang` sets LANG for the lock screen only; `openWorkspace` then loads `WS.settings.lang` ("en") and `applySettings` overrides it. Reproduced: Deutsch → Owner → English.
2. View / Layout:
   - Guided: coaching box instead of the next-step bar, hides ids, mode descriptions, usage chip and part chips, bigger confirm buttons.
   - Pro: compact, ids, part chips.
   - Layout "Visuals in pages": normal. "Blueprint as home": a mini blueprint beside every mode except Blueprint.
   - Overlap: "Blueprint as home" vs the Blueprint mode; Guided vs Journey (both are guidance); Guided/Pro sits in two places (mode bar + Settings).
3. Blueprint text: the box text fits. The arrow labels are placed at the curve midpoint, with nowrap, z-index above the boxes, and no collision check. Side arrows and fan-outs put labels on boxes and on each other (seen: "rule constants and template" over the Golden-listing box, "copy-ready German title…" over Batch export, three labels colliding under Standards pack).
4. Notes: only a drawer inside a project (`UI.drawer`) and the Alt+N capture overlay. Not available on the Cockpit, Library or Settings, and there is no clip-from-selection.
5. Item tools (Fix/Adjust/Change/Add/Ask):
   - All five do the same thing (`aiItemEdit` with a different verb).
   - Fix requires text (`it.need`) even when a finding has a suggested fix.
   - The proposal offers Accept / Try again (re-runs the same text) / Cancel. The request text and the proposal can't be edited, there's no refine, and no partial accept.
6. No per-item "you changed this" record: only the activity log. Confirmed-by-default and edited-by-you look the same (Q1…Qn).
7. Lost text, a general cause:
   - `render()` rebuilds the whole DOM. About 20 text boxes are not bound to state (it-in, xp-in, pr-in, cap-in, ask-sec-in, nn-text, an-text, dr-new, guide-in, rep-in, fb-paste, tr-in, tfb-text, res-paste, ns-*, cm-in, start-in, ex-in, cr-in), so any background render (save state, job progress, version check) wipes them.
   - The overlay closes on a click whose target is the backdrop, including a text selection drag that ends outside the box.
8. New items are pushed to the end of every list (requirements, tests, assumptions, risks, findings), with no scroll-into-view or highlight.
9. Express page: about 13,000 px tall, 263 items in one list.
10. Change-my-mind:
    - Change + "downstream" scope flags touched items (`markDownstream`, `flag`).
    - There is no decision list, no "remove X everywhere", no preview of everything affected, and no "did it work" check.
11. Re-check after edits: none (flags clear per item only).
12. PIN:
    - sha256(wsId:pin), 4+ digits, no attempt limit, no recovery.
    - Since D9 each person has their own login, so a PIN only separates workspaces inside one login.
13. Network:
    - A failed save goes to a localStorage backup plus an error chip, and is not retried until the next edit.
    - No offline banner and no online-event retry.
    - An AI call fails with a toast and its input may be lost (same render cause as 7).
    - beforeunload is present.
