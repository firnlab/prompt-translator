# Audit: interruptions during the Prompt Translator 1.0 work

Audit run on 19 Oct 2026, around 03:30 Zurich time. It was read-only: nothing was changed or republished.

The whole conversation (turns 0–48) was re-read through the conversation history. The local log was trimmed at compaction, so it could not be used.

Times are Zurich local time.

## Verdict

Five breaks were found. Three match your description: the internet dropped twice, and you sent a wrong prompt and stopped once. Two more stops were also checked.

**None of them changed or lost anything in Prompt Translator 1.0.** Each break fell either on a turn that did nothing, or right after a step that had already finished.

Separately from the breaks, the audit found 8 agreed details that the build is missing or only partly does. They are listed under "Anything that fell through the gaps". They come from the build itself, not from the breaks.

## The incidents

### 1. Wrong prompt, then stopped: turn 20 → 21 → 22 (19:49 → 20:06, 18 Oct)

- **What was sent.** At 19:49 you sent a fragment: "1. onfirmed). 2. Claude shows you the list of planned changes … Afterwards: t".
- **What happened.** My reply (turn 21) is empty: it was stopped before it did anything. At 20:06 you sent the complete message (turn 22).
- **What was in flight.** Nothing. This was still the design phase, and no files, tests, publishes or scheduled tasks were running.
- **Was turn 22 handled in full?** Yes. All its answers appear in turn 23 and in the spec:
  - "1.0 → 1.1 / 2.0" version numbers: SPEC 13.3;
  - "both in the way and shape they work best": SPEC 14A.4;
  - file names project first: SPEC 12.7;
  - "1 yes, 2 yes, 4 yes": SPEC 7.9, 9.5 and 14B.
- **Verdict: nothing lost.**

### 2. Internet drop: turn 31 → 32 → 33 (about 01:2x → 01:33, 19 Oct)

- **What happened.** Turn 31 finished normally: the concept prototype was published with a complete reply. Turn 32 is an empty reply with no tool calls. At 01:33 you sent your next message (turn 33).
- **What was in flight.** Nothing was still running.
  - The one-time "Prompt Translator update test" task had already finished, and its test page RDmtiJSbnEEwze3Hv1dDGC was deleted in turn 31.
  - The prototype (DR78uyUANxHwSVV17f5ogp) was already published.
- **Was turn 33 handled in full?** Yes, in turn 34:
  - "Second owner" everywhere: prototype edit at 01:35, and in 1.0;
  - the full audit (fixes 1–10);
  - the Claude Code route;
  - the questions on additions and tests.
- **Verdict: nothing lost.**

### 3. Internet drop: turn 40 → 41 → 42 (about 02:03 → 02:06, 19 Oct)

- **What happened.** After your "GO" (01:55), turn 40 started a background task that writes the spec, then read the v1 code. It ended normally with "still collecting…". The spec writer then saved SPEC-1.0.md (turn 41, file time 02:03:24). Turn 42 is the "Continue from where you left off" message after the drop.
- **What was in flight.** Only the spec writer, and it finished before the drop.
- **Evidence the spec is complete:**
  - /home/claude/pt/SPEC-1.0.md has 1,200 lines, sections 1–27 in order;
  - it ends on item 27.25, exactly as the saved text in turn 41 does.
- **Did the build start cleanly after the drop?** Yes:
  - the v1 code backup (src_v1_backup/) is dated 02:06:55;
  - the runner task trig_01E9H3fe9ckZJbWPW7HtKuYX was created once, at 02:06:35.
- **Verdict: nothing lost.**

### 4. You stopped it: turn 45 → "go on" (03:08:45 → 03:09, 19 Oct)

- **What happened.** This was during the round of fixes from the independent review.
- **What was in flight.**
  - The last change before the stop finished cleanly at 03:08:27: the "Accept again" button on accepted problems.
  - At the moment of the stop, the work was only reading code (the "job line" and roll-back code).
  - Nothing was half-written.
- **Was the rest of the fix round done after "go on"?** Yes. Every fix from 8 to 19 is in the code:
  - releaseGate, keepRecords, UI.fatal/retry-load, handEdited;
  - bl.nojudge2, acceptedHash;
  - startJob onStart, job-cancel;
  - the runner check that never creates or replaces the runner;
  - beforeCopyExtra, spec.pkglocked, pilotWorse;
  - rawV1 pre-upgrade copy, the 900000 limits, step names, the rd-fix arg.
- **Tests after the change:** the end-to-end test (03:15) and the real-data migration test (03:12) both finished with 0 errors and 0 failures.
- **Verdict: nothing lost.**

### 5. You stopped it before the first build: turn 3 → 4 (05:18, 18 Oct)

- **What happened.** Turn 3 was researching (searches and reading the skill files) and was cut off. You re-sent your answers with "wait dont build it now".
- **What was in flight.** Read-only research. No files had been built yet.
- **Verdict: nothing lost.** Your "don't build yet" was respected: v1 was only built after "go" in turn 12.

## Checks against the current state

- **Source files:**
  - `node --check` passes for all 17 src/*.js files;
  - `python3 build.py` works, and the rebuild is byte-identical to the built file that was published.
- **Published page is the tested build.**
  - The live page https://claude.ai/artifact/VjEPcpnocMTPMwHvHdwTZ3 (version 1792372558-2559) contains dist/prompt-translator.html exactly, inside the page wrapper.
  - The body text compares equal, and sha256 of dist is 3ef8b095….
- **Translations** (test/i18n_check10.js):
  - every text exists in all 3 languages, and the placeholders match;
  - no "ß";
  - the knowledge texts are complete;
  - the only "missing" key, brief.s, is a false alarm: it is built from parts in the code;
  - a scan of all sources for Traditional Chinese found 0 Traditional characters.
- **The two translation tasks that ran during the build** finished completely:
  - the conversion to Simplified mainland Chinese;
  - the DE/ZH translation of strings2.js (all texts complete, files parse).
- **Scheduled tasks.** The list, including completed one-time tasks, shows exactly two:
  - "Prompt Translator runner" trig_01E9H3fe9ckZJbWPW7HtKuYX, which appears once;
  - "Opportunity Explorer: weekly discovery" trig_01QoaJrEReBgg2BnQZ8pZpm3, with updated_at 16 Oct, so it was not touched. Its next run is today at 07:47.

  All test tasks are gone:
  - live-link test;
  - runner test trig_01XW1neCosv8TfeV9N7aPMXh, deleted in turn 29;
  - update test and its "PT update test task";
  - the three test tasks deleted in turn 36.
- **Artifacts.** There are 9 artifacts and no duplicates:
  - Opportunity Explorer (FSnhkTvcEKX4aDQxFXPquF) was last updated 17 Oct, before this work began, so it is untouched;
  - the test page RDmtiJSbnEEwze3Hv1dDGC is deleted;
  - Runner Connection Test (RyxytwahQmLG7pFGgqS4qu) and Prompt Translator Modes (DR78uyUANxHwSVV17f5ogp) still exist, waiting for your decision.
- **Prompt Translator storage.** It holds only your data: meta, the workspace, 2 projects and 6 notes. Every test document was deleted:
  - livelink-probe and livelink-reply;
  - runner-test;
  - update-test;
  - linktest-t1, t2 and t3.

## Anything that fell through the gaps

These items are agreed in SPEC-1.0.md but missing or only partly done in the published 1.0. None was caused by the breaks above, and the independent review did not catch them.

1. **Cost and length guard (SPEC 8.4).** A draft 20% or more longer or more expensive should count as a regression before release.
   - **Today:** a "{n}% longer" chip appears only in the Test step's candidate comparison (views_phases.js:344).
   - **Missing:** neither readiness nor the release check uses it.
2. **Borderline judge scores go to you (SPEC 8.2).** Only judge disagreements go to you (judge-decide). Judges give pass/fail with no score, so there is no "borderline" case.
3. **Judge reliability (SPEC 8.5).** Your spot-checks are shown as an agreement rate, but they are not measured near the pass/fail line. The judges' instructions have no version number.
4. **Fresh test set (SPEC 8.6).** Nothing notices new kinds of input in reports that no test covers. No code was found for it.
5. **Sign-offs approved together (SPEC 7.10).** Each critical or high problem is signed off one by one; there is no button to approve several together. The sign-off card shows the explanation, before/after and the audit, but not an explicit "goal · what changes · risk · how to undo" summary.
6. **Fallback-copy reminder (SPEC 14A.4).** Nothing warns you when the copy pasted into a Claude Project is several releases old.
7. **Checking the real built tool (SPEC 14D.2).** "Where possible, a background run opens the real tool and checks it" is not done. The build report is compared with the spec, and the pilot tests the package, not the built tool itself.
8. **Budget rule (SPEC 18.2).** The spec says: a warning when a project's month passes your level, and nothing blocked. The code instead:
   - uses one weekly figure for the whole workspace;
   - at 100% asks for a confirmation before starting a background run (tasks2.js, startJob).

   This is a mild stop, not a block, but it differs from the spec.

Two smaller inconsistencies:

- **Your default view.** BUILD-PLAN.md line 13 ends with "use prototype: Owner Blueprint/Pro/EN". The code uses Steps (app.js lines 135 and 181: `defaultMode:"steps"`). The final reply already asked you to confirm this; it is listed below too.
- **Older plan wording.** The spec still says releases are "R1, R2…" (14D.1). The build uses v1.0, v1.0.1, v1.1, which is the later decision from the prototype (t31) and section 27. This is a stale line in the spec, not a code problem.

## Decisions that were inferred and should be confirmed

The chat record does not contain your raw answers to some question cards (t23, t25, t27, t31, t34). For those, the decisions were taken from Claude's restatement or from the prototype (SPEC line 8 and item 27.23). Please confirm, or change, any of these:

- **Restore points:** keep everything; old automatic points are folded away (12.3).
- **Version numbers:** three numbers, 1.0.1 / 1.1 / 2.0 (13.3).
- **Preview copy:** big upgrades go to a preview copy first; small fixes go straight live after you approve the change list (13.4).
- **Health check depth:** chosen each time, Thorough or Most reliable (14E.2).
- **After a health check with problems:** PT explains first, one click starts the fix cycle, then it stops for your sign-off (14E.3).
- **A worse release:** PT warns and asks before any roll-back (14E.4).
- **Activity log:** shows everything, grouped and searchable (22.4).
- **Build style:** one paste, built in many checked steps (15.2).
- **Where tools live:** PT decides per tool (15.3).
- **Built tools report problems by themselves:** problem button, automatic error capture and run records (15.4).
- **Research:** automatic at key steps, within a budget (16.2).
- **Outside changes:** proposals only, never applied (16.5).
- **Models:** chosen automatically, moving up a level if a check fails (17.2).
- **Budget:** a warning at a threshold, nothing blocked (18.2; see gap 8).
- **Layouts:** "Visuals in pages" and "Blueprint as home" are a setting (19).
- **Default view:** Owner Blueprint, Pro, English, as in the prototype; the build uses Steps. Second owner: Journey, Guided, Chinese (19.7).
- **Express drafts:** stay "assumed" until confirmed (6, line 322).
- **The 12-step grouping** (Define · Design & check · Run): never answered explicitly, and carried forward without objection (27.25).
