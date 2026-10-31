# Plan 1.3.1 (agreed 19–20 Oct 2026) — NOT STARTED: waits for Owner's GO

Rule from Owner (19 Oct 23:07): only run updates when he says GO; always ask first.

Research: scratchpad/research14/*.md (diagram, navigation, stability, audit_code, interview, flow, change_release, status).

## Decisions (Owner's answers)
- Arrow text: into the receiving box ("Receives: …", 2 lines, full text on hover/tap); lines carry only a short tag.
- Line colour: calm neutral; selected box's lines light up; loops dashed orange; hand-offs to people dotted.
- Progress: one fixed activity tray at the bottom (live text, Cancel, "Done · Show result"); nothing pushes the page.
- Phone blueprint: list view with "sends to →" chips + "Show diagram" (zoomable).
- Change default: "Save and update affected" (preview list with ticks, old → new, "no change needed" allowed, hand-edited items unticked, one Undo); second button "Save only this – mark N items".
- Done items: fold into "Done" immediately BUT never disappear — stay reachable and editable in a logical way (to confirm interpretation: done item collapses in place to a one-line row with Undo; groups into Done on next visit / Tidy up).
- Interview mode: in the SAME round. Only essential text to read; fast to go through many questions; each question offers a full list of all plausible answers (one click), each answer editable before choosing, own answer when none fits; avoid typing-and-confirm.
- Delivery: ONE comprehensive update with everything uncovered since the last update (no separate tiny 1.2.2 main update). Preview first ("1.3.1 Preview N"), main only after approval; main then gets the "New version to try" card + preview naming for future rounds.

## Scope (all in one round)
A. Clean blueprint (orthogonal routing in lanes, edges under boxes, trunks for fan-out, side lane for loops, focus+dim, phone list view, real geometric audit incl. edges).
B. Take me there (one goTo for every badge/count/link, targets for every item kind, 1 of N navigator, Back, counts = list, fix broken links: section chip, note links, Launch go-there, readiness chip, guide 'Continue to Capture' in Architecture, stale toast).
C. Still screen (activity tray, fixed-size stream box, no banners above content, jobs never switch step/scroll, frozen visible order + "N new · Show", anchor-preserving render, keep focus/menus/modal scroll/selection/IME).
D. Status slot beside title + shape/icon + legend + overlap test.
E. Needs you / To check / Done groups, provenance line + before→after + Undo on every item, step summary card, button placement map (row / group header / sticky Continue), banners count + Show only.
F. Change flow (impact count, Save and update affected default, precise dependency links incl. assumptions/risks/components, restore scope choice lost in 1.3.0 Edit/Refine accept).
G. Preview vs main clarity (Preview N naming, coloured frame + fixed banner + [PREVIEW] title, main "New version to try" card driven by a shared version doc).
H. Interview mode (one engine with Quick/Guided as presets, answer ledger as source of truth, impact × uncertainty ordering, ★ with reason, hard-to-undo decisions never preselected, live blueprint solid/dashed, Why is this here?, per-step summary, resume).
I. Earlier check fixes: aiImpact name clash (change map + change request), ~420 leftover strings, Try again button.

## Added 20 Oct ~01:20 after the gap hunt (gaps_code.md ~70 findings, gaps_ux.md 648 screens, gaps_meta.md 20 interactions)
J. Correctness & consistency (high first):
  - Undo per action (not "last whole-project snapshot"); toast Undo bound to its project; persisted or tied to restore points.
  - AI results always written to the live project (liveP everywhere; ~40 tasks keep a stale copy across await).
  - Stable ids: Redo requirements / triage never reuse ids; arch re-run doesn't keep a stale chosen id; manual arch choice flags downstream.
  - One definition of "done" per step (phaseState / STEP_THR / nextBest10 disagree): todo-only steps are not done; Test with 0 runs not green; guide never says Continue while work is open (15/24 screens contradict).
  - Review: default tab must not say "passed" while 66 wait for confirmation; one name per status (Needs updating / Problem / Waiting for confirmation used for the same thing).
  - One count source everywhere (risk 18 vs 6; flags vs items; deleted-item flags).
  - Confirm all really clears assumptions; one confirm-all and one delete implementation (trash leaves orphan flags, no log).
  - Busy/AI runs scoped per project.
  - Interview engine: don't drop queued questions, respect confirmed/N/A dimensions, recommended != confirmed by you (store choice id + own text separately; skip is not a blocker).
  - applyJob errors not swallowed; global error handler.
  - Screen-language strings never written into project content.
  - Duplicate DOM ids (blueprint/express, repeated edit boxes); stable item numbers across screens.
  - Express cards show open work (Test "0 settled" hides 14 open).
K. Layout, readability, access:
  - 1000 px (and 821–1100) steps layout collapses text to 0–27 px wide columns (items 3,700–6,600 px tall) → responsive grid by container width.
  - Rail footer (Commands, Notes, Improve, Lock) 14 screens down → fixed.
  - Contrast: Open ring 1.4–1.6, list dot 1.2–1.4, light chips 2.6–3.9 → ≥3:1 icons, ≥4.5:1 text.
  - Assumption map: 73 points on 13 positions (14 stacked) → jitter/cluster with count + list.
  - Truncated titles in Blueprint/Express (66–100% rows) → 2-line clamp + full on open.
  - Steps-mode assumption rows always open as ~410 px edit forms → closed by default.
  - Tap targets < 24 px at 420; keyboard: skip link, focus outlines visible, tab order without 14-screen jumps.
  - Toasts not over Continue/tray; More menus not clipped in tables; drawer not covering main at 821–1100.
  - Speed: Steps render ~370 ms (spine per-flag lookups) → cache per render.
G (correction): main and preview have SEPARATE databases, so no shared version doc. The main card is driven by a doc in main's own DB written at preview publish. Copies made inside a preview (loader line, brief, passport, report destination) must point to main or be clearly marked preview; the upgrade prompt must say preview first.
L. Safeguards from the 10 patterns: one shared building block per concept; tests of what the person sees (overlap/movement/reach/goto/contrast audits over all screens, 3 widths incl. 1000, 3 languages, light/dark); build refuses duplicate definitions, fossils removed; region rendering; edge-case matrix (0/1/many/long/deleted/offline/two tabs/reload mid-job/browser Back button); provenance for background work + "Since your last visit"; one glossary of verbs; scale test 3× Ricardo; full 12-step walk from an empty project in EN/DE/ZH; export/import between preview and main; small real-AI run on the preview copy (with OK for usage).

## Added 20 Oct ~01:50: why the Watch project couldn't be finished (from Owner's live data, read-only)
Evidence: activity log (254 entries); Fix all ran 23:19–23:26; the separate checker rejected 16 of 19 fixes; afterwards 16 findings are still open (1 critical, 5 high), 63 items are marked "may need updating", 21 assumptions are still unsettled (15 stuck in "testing"), and 4 risks are open. Between 17:02 and 17:07 one assumption was confirmed 15 times and never settled.
M. Fixing that works and shows its work:
  - Fix the right target: every item named in a finding (R29 AND R17; components c5/c6/c8/c11, not the architecture summary). Today earlyRef maps every architecture finding to arch:choice and a finding naming several requirements to the first R only.
  - The checker sees the full before/after of every changed item (today it is cut at 2,500 characters and shows the wrong field, so before and after look identical).
  - Split multi-part findings into a checklist of parts; a fix is checked part by part.
  - Retry loop: a rejected fix is retried once or twice with the checker's note ("what's still off"); after that it goes to you with the reason and three choices (revise with a note, edit yourself, accept as is with a reason). Today Fix all never retries a reopened finding (its "seen" set).
  - Fix all ends by updating the affected items layer by layer (no 63 leftover marks), with a depth cap.
  - Proof: every automatic change marks the item "Changed by PT · reason · before → after · Undo", the same as your own changes; the finding shows "Fixed · confirmed by the checker" in green, or "Partly fixed: 1 of 3 parts" in amber. The run ends with a summary card ("Fixed 12 · Need you 4 · Updated 9 affected · Undo all"), not just a toast and a jump to Launch.
  - Language guard: AI output must be in the project's content language (German leaked into the English Watch project in requirements, risks, sections and the architecture).
  - Confirming an assumption settles it in one click (today untested → testing still counts as assumed).
  - The activity log is in plain words, with links (no "assumption:as-mvf…").
  - Decision (20 Oct ~01:55): "Fix for me": fixes the separate checker confirms are applied and marked (old → new, Undo); fixes it can't confirm come to Owner as proposals with the reason.

## Added 20 Oct ~02:55 after journeys / data / AI-task audits (research14: journeys.md, gaps_data.md, gaps_ai.md; research15/finish.md)
N. One "Finish" flow from every mode: autopilot first (close marks with no real change, merge duplicate findings, sort into Blocking / Should / Later, fix blocking items under the stop rule), then a decision queue (one decision per screen, ★ preselected, Enter = accept, 1/2/3 = alternative, L = later, W = won't fix with reason, "accept all except" for similar items), then one check-and-release screen. Stop rule: only concrete failures block; per lens max 3 blocking + 5 should per pass; max 2 auto fix rounds per item, then it becomes your choice; a round that doesn't reduce blocking items is rolled back; dismissed with a reason = never raised again; changes mark only direct dependents; layers you approved are protected; done = 0 blocking or each overridden with a reason. Target: ~10–15 decisions for Watch, one keystroke each.
O. AI sees what it needs: no 48,000-char cut of the project context (requirements started at char 45,686 in Watch); the package never cut mid-text; fixer sees requirements/risks/architecture; architecture fixes go to the real component, not a field nothing reads; every AI answer validated (empty answers never count as passes; field whitelist on item proposals; judge must answer all criteria); checker doesn't reopen correct fixes because of unrelated rule errors; language from the task's own project.
P. Honest engine and release: trial run and mini-test get the same project knowledge the test cases expect (0/11 and 0% were a measurement flaw, ~400 units); first release not a dead end for Claude-Project tools (person steps can count as built; pilot accept path); health checks test the live release; cost shown before heavy runs (Fix all on Watch would cost ~3,900 units today); automatic background jobs only with consent and within budget.
Q. Stop losing your work: Redo requirements never throws away confirmed/edited items without a review (16:46 lost 39 min); the interview stops when enough is known (7 auto rounds added 30 assumptions + 42 concerns in 30 min); AI concerns are "Later" by default, never 44 hard blockers; migrations never reopen finished work (Ricardo's 66 "waiting" findings); consistency check when answering, validating or choosing (Lightroom vs Doubao, chosen o1 vs designed o3); questions about PT itself answered by the Guide, not run as a project; the Guide sees what's on your screen.
R. One-time data repairs (logged, undoable; content changes only after Owner approves): p.lang for all 7 projects; 15 "testing" → validated; arch.chosen → recommended o3; close the cut-off finding; targets for checker findings and 12 multi-item findings; remove 18 flags from the edit that changed nothing; Ricardo legacy clean-up; offer to re-link tests T1–T12; restore points capped.

## Short checks 20 Oct ~03:00 (quick/q.py, quick/r.py on live-0135)
- Watch, every mode: guide "70 things are left before you can copy", yet the primary buttons say "Continue to Release →" twice; Quick shows "Needs you (89)", banner 63, before-copy 70: three different counts for the same thing.
- 50 of the 70 blockers have no automatic fix (44 are AI concerns), yet the button says "Fix all remaining (70)".
- Fix all with the test AI: 70 → 70, 63 → 63, 16 → 16, no summary, 0 items marked: no visible result at all.
- Journey/Swimlanes: same status-dot overlaps; a label over the legend; Ricardo pages up to 49–56 screens.
- Missing translation key shown raw on a Launch blocker button ("eng.gate.answer") in every language (the i18n check misses keys used inside lookup maps).
- On phones the Notes panel button can't be reached; "End session" opened nothing at 420 px.
- Views outside a project and dialogs: no overlaps, no side scroll at 420.

## Decision 20 Oct ~03:45: ceiling versions of both (Owner: "this is the way i want")
S. Goal as an executable, living contract: goal defined through graded examples (3–5 sample results for real inputs, 👍/👎 + why → criteria; criteria drift, Shankar et al. 2024); every criterion "When [situation], the result [property]", two-expert test, negative cases, split rule-checkable vs judgement, each a test at once; options (2–3) tried on the examples with measured results; every requirement linked to a criterion; tests from criteria; ready = criteria pass in every language + "not checked" list; new failures become criteria with one click; effort sized to the tool.
T. One map with lenses (replaces the mini-map switch): lenses over the one blueprint (Needs you, Changed since last visit, Tested, Risks & assumptions, Who decided, Impact, Cost; max ~6, combinable, default Needs you); linked selection between queue and map; semantic zoom (goal/steps → parts → items); one item's whole thread idea → criterion → requirement → part → section → test → result; Steps/Journey/Swimlanes/Blueprint as arrangements of one map, lenses in all; phone: lenses as list filters.
U. Decisions 20 Oct ~03:50:
  - 6 stages (Goal · Options · Design · Build · Prove · Release & run), today's 12 steps inside as sub-steps; gates per stage; no arrangement can skip a gate.
  - Autonomy default: PT decides what is easy to undo and marks it; hard-to-undo always asks. Every PT decision: "Decided by PT · reason · Change" (Assumed shape, dashed in the map), listed in "To check", in the "Who decided" lens and in My decisions (filter "Decided by PT"); Change = the same one-click answer list → "Save and update affected" review → one Undo; at each stage gate a "PT decided N things for you · check them" batch (accept all except).
  - Examples: photos + files (raw and edited), private ones marked, asked before sending to outside services.
  - Extras in this update: notes → answers/criteria with one click + contradiction check against notes; reuse from earlier tools (copy goal, criteria, examples); time & cost estimate per tool and stage with a stop before the budget is exceeded. Not now: sharing a project with Second owner.
V. Decision 20 Oct ~04:12: tool states = Working copy · Green checkpoint · Live · Publish (only when criteria pass) · Reinstall, built by MERGING existing pieces: Release vN/live + "Update vA→vB" → one Publish; Roll back → Reinstall (working copy kept); quality seal + restore point → green checkpoint (automatic when all criteria pass; "working copy differs from last checkpoint: N changes"); names: "PT x.y.z" only for PT, tool versions v1, v2 only when published, working copy unnumbered, checkpoints dated (package "Draft N" / "Save version" folded into history); release gate = criteria pass + confirmation of hard-to-undo items, pilot acceptable with a reason, person-set-up parts count as built when you confirm; after-publish check tests Live; restore points: never deleted by PT (owner one click + confirm), fewer created (one per run/update), "Clean up old restore points" suggestion for the owner; tools outside a Claude Project: copy line + "installed" confirmation; same model in Second owner's workspace.

## Decisions 20 Oct ~04:15 (final before GO)
- Name: PT 1.4.0 (this plan file name stays; the build is 1.4.0).
- Delivery: NO preview for Owner. On GO: everything built, tested, audited and verified, then published straight to main so he can use it right away. Safety instead of a preview: full backup of all real data first (download + snapshot); all work and the data migration rehearsed on a private copy of the real data (internal test artifact, not handed to him); every check from L passes there; then publish to main; verify the real data after publishing; PT 1.2.1 kept ready to restore in one step if anything is wrong.
- Existing projects (Watch, Ricardo, Untitled, Second owner's 4): PT drafts goal criteria and links from what is already there (cost shown first), everything marked "Decided by PT" in To check.
- Start view when opening a project: queue (Needs you) + map with the Needs you lens; Finish one click away.
- Standing rules unchanged: restore points only deleted by Owner (one click + confirmation); code route off; Opportunity Explorer untouched; runner task kept; German ss; Simplified Chinese; links written with name + version.
