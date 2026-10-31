# Build plan 1.3.0 (started 19 Oct 2026 ~20:15) — Owner's 17 points
Findings: FINDINGS-1.3.md. Research: scratchpad/research13/*.md (language, actions, notes_pin_offline, design_change, diagram_text).

## Owner decisions (19 Oct ~20:10, all recommended options)
- Q1 Buttons: 3 + More. Primary one-click (Confirm / Apply PT's fix) · Edit (type yourself, no AI) · Refine… (note to PT; keeps your text and PT's answer; tick parts on/off; edit inline; refine again) · More: Ask why, Research it, Won't fix (reason), Remove. Add only at list level. Undo instead of confirm.
- Q2 Content language: per project (p.lang), set at creation from the creator's UI language, badge, changeable; viewers in another language get a labelled translation view, the original is never overwritten.
- Q3 German: du.
- Q4 New items: on top marked "New" (highlight, scroll into view, Undo), back to normal place after leaving the step.
- Q5 Help level: Learning · Guided · Pro (one control) + Mini-map on/off. The 5 ways of working stay.
- Q6 Notes: docked right panel, everywhere, pushes the content, resizable, bottom sheet on phones, "Add to note" on selection with a link back.
- Q7 PIN: keep + safe recovery (recovery code once, owner reset, throttle, PBKDF2 + salt, never brick).
- Q8 Delivery: everything as 1.3.0 in the preview first; main only after Owner tries it.

## Work packages
A1 Language: the person (workspace) owns the UI language; a pending picker choice is saved on pick; precedence session > saved > English; remember the last language on the device for the picker; IME-safe Enter; Intl formats (de-CH/en-CH/zh-Hans); p.lang + badge + AI writes in p.lang; translation view; langName de adds du.
A2 Draft safety net: every unbound text box keeps a draft through renders, close and reload (localStorage per workspace); the backdrop closes only when the press started on it and never discards text; Esc keeps the draft; drafts are cleared on successful use.
A3 Network: failed saves stay queued, retry with backoff + jitter, retry on online/visible; status "Not saved yet – N waiting · Retry now"; offline banner; AI failure keeps the prompt (drafts) + Try again.
B1 New item actions (Q1) incl. editable/partial proposal + refine loop.
B2 Status marks: by-you (answered/edited/added), PT assumed, confirmed, new.
B3 Re-check: before/after problem diff banner "N solved · N new · N open" after each change, plus a "Re-check with PT" button.
B4 New items on top (Q4).
B5 Decisions + change my mind: "My decisions" list (p.decisions + key choices), a "Change my mind" box → AI impact list across all items → review per item → apply → "Did it work?" check; "Why is this here?" in More.
B6 Express: needs-you first, confirmed folded, Accept all recommended, keyboard (Enter/E/R).
C1 Notes dock (Q6).
C2 Blueprint labels: collision-free placement, wrap, numbered-marker fallback + legend; audit function + test (3 languages + fuzz).
C3 Help level (Q5) + Learning mode: step purpose "Makes → Used in", one-at-a-time tips, build map.
C4 PIN (Q7).
D: du strings (agent), translations of new strings, tests (e2e13 + all old), independent review, preview publish, hand-over.

## Progress (19 Oct ~22:55)
- All packages A1–C4 built. German switched to du (275 strings + 6 knowledge texts). 214 new strings translated DE/ZH and checked (placeholders, |, ß, Sie, Traditional).
- Found and fixed while testing:
  - assumptions' "Confirm" did nothing in quick mode → Mark validated;
  - Accept all counts only one-click-settleable items;
  - closed rows show the one-click action;
  - bound fields lost the cursor on background renders (fixed in renderInner);
  - marks never downgrade;
  - Won't fix only while it applies;
  - clip lines readable, with links kept separately;
  - recovery code never stored as a draft;
  - Undo for Still correct;
  - quick-mode keys blocked on the lock screen and on focused buttons.
- Tests:
  - e2e13 (12 sections on the real data) 0/0;
  - e2e12 0/0 (updated for the new controls);
  - migrate_real 0/0;
  - live snapshot ok;
  - i18n complete.
- Blueprint: 0 overlaps at 1440/1000/700/420 px × en/de/zh + fuzz.
