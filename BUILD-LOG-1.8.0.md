# Build log 1.8.0 (1 Nov 2026)

Owner's GO: "GO 1.8" (05:21 Zürich): one-GO release — build, full gate, preview publish, re-test of the live preview, main publish,
releases.json as a PR the owner merges. Promise: 1.8.0 live within 12 hours (by 17:21 Zürich), then further pieces as 1.8.x.
Four parts moved to 1.9 by the owner: second-lab reviews + alternating labs; rebuilding all tools when a kit changes; test-harness
extras (sealed twins, independent judge); self-scan of the owner's use, the 4×4 interview, the public changelog.

## What 1.8.0 is
Everything of PLAN-1.8 except the four 1.9 parts, built by parallel builders on separate files and merged here.

1. **Look** (`v180_look.js`, `styles18.css`, `strings12.js`): style C Friendly Expressive, ink blue, always light (dark only by
   switching in Settings; the move sets light once for every workspace), system font (no download), motion only where it explains,
   put live = quiet tick + Undo, "Claude drafted this · you decide" and "We assume … change" where PT guessed.
2. **Deciding** (`v180_decide.js`, `strings13.js`): ★ on hard questions, your earlier call first, five cards, readiness without a
   made-up measure, mock first, the start switch (kinds of tool first · questions first · fast), the map folded.
3. **Checks, fixing, facts** (`v180_checks.js`, `strings14.js`): check rows per tool (apply / skip / open; a shared tool keeps today's
   behaviour), fix until green with the repeat stop and the cap of 5, tests 3× (5× for a tool that acts outward), facts by type with
   an age budget (price 20 days, platform 45, policy 180, other 90).
4. **Decision rows** (`v180_rows.js`, `strings15.js`): ids `<Branch>.<Stage>.<Step>`, append-only events with a hash chain, tiers,
   undo, the Decisions page.
5. **The cone** (`v180_cone.js`, `strings15.js`): start from one sentence; kinds of tool cut down question by question; the kind
   taken feeds the check rows and every prompt; 1.7 tools get a one-time re-run offer.
6. **Running** (`v180_run.js`, `strings16.js`): the Sunday note, inbox sorting, "tell PT what's wrong", the drill, learn from use,
   the build button.
7. **Health and the move** (`v180_health.js`): Health rows, the day-one screen (the second owner's in Chinese, her own Sunday-note
   time), the move of 1.7 projects with a restore point "Before 1.8" and Undo, PT checking itself.
8. **Kits** (`v180_kits.js`, `strings17.js`): the tool report shape, builds on Opus 5.5 (Fable only as escalation).
9. **1.7.1 inside**: the owner-time baseline (taps and active minutes, Health row) and name independence (cause 59).
   1.7.1 was not published on its own: the machine has two CPUs and two full gates at once were too slow to finish; its
   tests run in this gate.

## Causes found while integrating
60–66 see RELEASE-CHECKS.md (1.8 sections); 67 speed: the check signals were read many times per screen (now once per screen).
Test fixes after the merge: the health test follows the merged cone; flows 1.2 stops the Finish rounds once only the examples loop
is left (the mock always answers with one unclear criterion); the rail keeps project names on one line (hunt 13).

## Gate and publish
- Full gate, part 1 (all but click everything, `GATE_SLOW=1.5 --jobs=2`): 31 suites green; red: hunt (5 Undo, 13 squeeze) and check
  the Pick tests (one planted bug read as missed); the run was then cut by its time limit during the Pick rerun.
- Fixes: cause 68 (queue rows and tool states squeezed at 1024 with the inspector, `styles18.css`); hunt 5 waits for the visit's
  and the click's own automatic steps (test timing, not PT); the kit-timing test and its planted bug now test something real.
- After the fixes: hunt 21/0; check the Pick tests 57 of 57 caught (55 in one run, cut by the session's time limit, the last two
  and the changed one alone); every other suite again (the style change can touch any screen): 31 of 31 green. Check the hunt
  (73 minutes, planted hunt-2 bugs) was green in part 1 and not run again: the change after it is two style rules and test timing.
- Click everything (alone, three levels side by side): green, 0 problems (70 minutes).
- Published (1 Nov 2026, about 15:00 Zürich): preview version `1793541188-7ab4` (before: `1792946526-0c4b`, 1.7.0); main version
  `1793541397-6111` (before: `1792946573-2d87`, 1.7.0). Same capabilities as 1.7.0, carried forward.
- Live re-test of the preview: the published page is byte for byte the tested build; smoke, the 1.8 look test (98) and the 1.7.1
  test (28) pass on the live page.
- Code commit: `a00b175` (the built file is the one from `01754dc`; the commit after it changed tests only).
- Baseline for the next static review: `src_v180_backup/`.
- After the publish, CI (quick-gate, made-up bundle) was red on one Health test check (test only: the 1.8 drill is a check row, see RELEASE-CHECKS); fixed in the test, the CI list run locally on the made-up bundle: green. The published file is unchanged.
