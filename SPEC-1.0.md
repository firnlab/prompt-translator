# Prompt Translator 1.0 — Consolidated Specification

Source: the claude.ai chat "Prompt Translator tool design" (turns 0–38, 18–19 Oct 2026, Europe/Zurich). Every item cites the turn number as `[tN]`.

How to read this file:
- **Decision** = what was agreed. When the user's own words matter, they are quoted.
- Later decisions override earlier ones. Section 27 lists every change of mind.
- **Answer text not in the transcript.** The chat record does not contain the raw answers to the multiple-choice question cards in t23, t25, t27, t31 and t34; only the questions are recorded. For those cards, the decision below is taken from Claude's next message, which restated the answers, or from the clickable prototype built from them (`/home/claude/pt/proto/modes.html`, published as "Mode prototype v1", t31). Items decided this way are marked **(inferred)**. Section 27 (item 23) lists them all so they can be confirmed.
- Existing artifacts:
  - live v1 tool: https://claude.ai/artifact/VjEPcpnocMTPMwHvHdwTZ3, source in `/home/claude/pt/src`, built page `/home/claude/pt/dist/prompt-translator.html`;
  - concept prototype: `/home/claude/pt/proto/modes.html`.
- 1.0 is published **at the same link** as v1, with all existing data kept [t19, t23, t29].

---

## 1. Purpose, scope and ground rules

1.1 **What PT is.** A prompt maker and project manager that builds frontier-level AI systems with Claude. It is an "intent compiler": it pulls out the complete intent, chooses the architecture, writes the prompts and packages, tests them and stays with the project through launch and operation [t0, t5, t7].

1.2 **What it builds.** "All possible scenarios but mainly agents and agent systems" [t2]: apps, tools and artifacts; agents and system prompts; research and analysis; writing and documents.

1.3 **Ways to start.** "All of it" [t2]. That means a guided interview, paste-and-upgrade of existing prompts, and (added later) Check existing work [t15–t19].

1.4 **Project memory.** Full project tracker: status, versions, open questions, next actions, kept between sessions [t2].

1.5 **Meaning of "Translator."** Idea → optimal prompt, not translating between human languages [t2].

1.6 **Where solutions run.** Originally "Claude chat Projects" [t6]. Widened in t30–t31: "when i write tool i always mean anything and everything we did and we will and we can make in the Prompt Translator 1.0". See section 15.

1.7 **Plain language** everywhere [t6].

1.8 **Online only.** No offline mode is required [t6]. ("Works without AI" for viewing, editing and tracking was part of v1 [t9].)

1.9 **Desktop is the priority** ("only desktop") [t6].

1.10 **Users bring real results back** ("yes absolutely") [t6].

1.11 **First real project:** the business-ideas agent. It finds, categorises, ranks and lists high-reward, low-effort business ideas that can be done digitally and as automated as possible [t6].

1.12 **Interview time:** "as long as it takes for this one" [t6].

1.13 **Look and feel:** "futuristic but easy to understand and use, userfriendly and intuitive and consistent" [t10]. Later: "i really like the visuals you already did" and "we do not lose any of the functions we already build" [t30].

1.14 **Scope:** everything in one release ("into 1 stage") [t10].

1.15 **Permissions:** "it can do all it needs to do … everything yes", including storing the user's notes about the tool so Claude can read them later [t10].

1.16 **Quality bar for all changes.** "make all changes/fixes coherent, consistent, clean and matching to the rest of the Prompt Translator 1.0" [t16]. Also: "make it better for me to use so i understand exactly what im doing and claude is doing" [t22].

1.17 **Honesty rule.** PT never claims "100% perfect". What it guarantees [t5, t7, t34]:
- no dimension goes unexamined, and every assumption is visible;
- every requirement has a test, and every real failure becomes a test;
- nothing is copied, released or updated without passing every check;
- every check is recorded and every change is shown first;
- a restore point is saved before every change;
- nothing is deleted except by the user.

1.18 **Research basis.** The user requires online research on every part ("for every single part check online and research for what works and what not") [t6, t16, t22, t30]. Built-in knowledge is dated (knowledge pack) [t7].

1.19 **The user's idea list must all be covered** [t6]:
- clean, clear, consistent, coherent, efficient and effective prompts;
- contradiction, unclear and missing checks;
- never losing the problem out of sight (North Star and drift guard);
- AI compute versus ordinary code versus a mix;
- expert IT project management;
- foresight (bringing things up at the right time);
- learning from top professionals;
- an architecture step with all approaches;
- Zusammenhang, visual mockups, steps to get there, planning so everything works together, and parts built ready to plug into other parts;
- the full-picture list: Volles Bild, Funktion, Benutzung, Aussehen, Anforderungen, Sinn, Ablauf.

---

## 2. Modules carried over from v1 (must all stay in 1.0)

The user said "we do not lose any of the functions we already build" [t30]. v1 contained everything below, because all stages were merged into one release [t10].

2.1 **North Star band and drift guard** on every screen: problem, goal, success measure [t7].

2.2 **Intake and clarifier** [t7]:
- accepts text, bullets, documents, screenshots and sketches;
- shows the clean version beside the original;
- flags contradictions, unclear points and gaps.

2.3 **Gap radar and assumptions ledger** [t5, t7]:
- about 14 dimensions plus the full-picture list;
- each item marked confirmed, assumed or unknown;
- each gap shows the cost of leaving it open.

2.4 **Adaptive interview** [t7]:
- 1–3 questions at a time, the highest-value ones first;
- follows a fixed checklist of dimensions;
- stops on clear criteria (coverage reached plus the user's OK);
- always asks about look and feel;
- offers concrete options with a recommended default.

2.5 **Foresight queue:** concerns brought up at their moment, for example cost, legal and monitoring [t7].

2.6 **Architecture studio** [t6, t7, t9]:
- options: single prompt, fixed workflow, one agent, orchestrator plus workers, and no-build answers;
- compared across reliability, cost, safety, effort, maintainability and what the platform can run;
- compute split per part: code, AI or a mix;
- recommends one option and says what would change its mind.

2.7 **Visual layer** [t7, t9]:
- system map, result mockups, roadmap;
- building blocks with interface contracts (defined inputs and outputs).

2.8 **Compiler / package** [t5, t7]:
- produces system prompt, task prompt, subagent briefs, tool descriptions, CLAUDE.md or skill file, progress and feature-list scaffolding, guardrails, eval set and threat model;
- follows current prompting rules, with a lint pass;
- each block is labelled with where it goes.

2.9 **Model targeting** of the output to where it runs [t5].

2.10 **Red team** [t7]:
- separate calls, so PT never grades its own work;
- lenses: intent, prompt quality, agent failure, security, cost, legal and ethics, maintainability;
- every finding has a severity.

2.11 **Simulator and judge** [t7, t9]:
- normal, edge, adversarial, empty and wrong-language cases, with some held back;
- repeated runs;
- a bias-controlled judge, spot-checked by the user;
- an improve loop, with shorter preferred when results are equal;
- a regression gate.

2.12 **Project lead** [t7]:
- phases with gates;
- version history with diffs, decision log, risk register;
- open questions and next action;
- a failure log that turns into regression tests.

2.13 **Expert lenses and pattern library** [t7, t9]. The expert panel: product manager, solutions architect, security engineer, legal and compliance, UX designer, data engineer, operations and finance.

2.14 **Day-to-day features** [t9]:
- one clear spine;
- cockpit home;
- resume briefing;
- depth dial (Quick, Standard, Deep);
- decision cards;
- confidence labels;
- plain-language "why?";
- command palette and shortcuts;
- usage meter (see 18.6);
- undo and snapshots;
- in-page confirmations.

2.15 **Understanding the problem** [t9]:
- problem framing lab: 5 whys, jobs-to-be-done, reframing;
- day-in-the-life walkthrough;
- assumption map: value, usability, viability, feasibility, go-to-market, legal and ethics;
- pre-mortem;
- Given/When/Then requirements with out-of-scope list and a project constitution;
- devil's advocate.

2.16 **Designing the solution** [t9]:
- "Do we even need to build this?";
- human-effort design;
- data plan, covering Swiss nDSG and EU GDPR;
- running-cost estimate;
- interface contracts;
- live mockups.

2.17 **Consistency engine** [t9]:
- traceability map that flags orphans in both directions;
- whole-project checks;
- launch-readiness score.

2.18 **Packaging** [t9]:
- project setup checklist;
- Skills generator (skill description under 200 characters);
- bilingual review (English prompt with a meaning-true mirror);
- version diffs with reasons;
- hand-off prompts.

2.19 **Launch and operation** [t9]:
- runbook and rollback;
- feedback inbox;
- health view;
- model-update watch.

2.20 **Knowledge and learning** [t9]:
- expert panel;
- structured research bridge with source quality and expiry;
- personal profile, which the user can see and edit;
- cross-project insights.

2.21 **The tool itself** [t9]:
- file and connector input;
- backup, export and import;
- works without AI for viewing;
- feedback on the tool;
- self-test before delivery;
- honesty layer.

2.22 **Finished prompts are written in English**, with a meaning-true mirror in the interface language ("3 yes") [t10, t11].

2.23 **The note function** [t10, t11]. The user asked for "a fully functioning note function where it is logic i would benefit". Agreed design:
- quick capture from any screen (shortcut, type, Enter) into the project inbox;
- anchored notes on any item, which show "changed since your note";
- smart sorting on click, with every move shown and undoable;
- notes inform the AI, with a "not for AI" flag;
- links in both directions;
- optional types: idea, question, concern, decision, to-do, source;
- full-text search with filters;
- simple formatting: headings, checklists, links, screenshots;
- personal notebook, "someday → new project" in one click, archive;
- pinned notes next to the North Star;
- session recap that feeds the resume briefing;
- autosave, version history per note, 30-day trash, Markdown export;
- translation on demand;
- private per workspace.

  In 1.0, "Notes to Claude" becomes **Tool requests** (see 13.1).

---

## 3. Steps, order and grouping (1.0)

3.1 **Final order: 12 steps in 3 groups** [t19, t23, t25, t29]:
- **Define:** 1 Capture · 2 Understand · 3 Interview · 4 Assumptions & risks · 5 Requirements
- **Design & check:** 6 Architecture · 7 Draft · 8 Review · 9 Test
- **Run:** 10 Launch (pilot) · 11 Release · 12 Operate

  For comparison, v1 had 11 steps: Capture … Build, Review, Test, Launch, Operate [t13].

3.2 **How the order was decided.**
- The user: "Review and Test as separate steps. then launch step, then Release step at the end and then operate step where i can post something back from the launched and operating project … to fix it" [t16].
- On what Launch and Release mean: "choose like it is done in professional environments" [t18].
- Claude proposed pilot-then-promote, Langfuse-style staging then production [t17].

3.3 **Prototype step names (latest, t31):**
- Interview is shown as "First questions";
- Draft is shown as "Build brief";
- Operate is shown as "Operate & update".

  This naming choice is open (see section 27).

3.4 **Step 7 Draft:** the tool writes the package (build brief). It can be read but **not copied** [t15, t19, t23].

3.5 **Early checks:** a "Check this step" button at the end of Requirements and of Architecture. Their problems go into the same list as Review. The user answered "8 yes" [t17, t18, t23].

3.6 **Copying is possible only at Launch, once readiness is 100%** [t18, t19, t23]:
- before that it is "completely blocked" (answer "2 completely blocked") [t18];
- there is no "draft, not yet checked" copy option.

3.7 **New change on a live tool:** "New change" in its project. Only the affected steps light up (requirements → architecture → draft → review → test → release), so it is a short cycle, not a restart [t31].

---

## 4. Screen frame and placements

4.1 **Frame on every project screen** [t19]:
- left rail: Cockpit, Notes, Library, Insights, Settings, Projects, and "Improve this tool" at the bottom;
- project header: Undo · Restore points · Guide/Notes · End session [t29];
- North Star band;
- step spine with badges for open problems and "needs update" flags;
- top bar: next best step plus **"Continue to …"**;
- the "may need updating" banner directly under the top bar;
- step content;
- bottom: Continue plus "Back to top".

4.2 **Right panel:** Guide and Notes as two tabs in one panel, so the work area is not squeezed [t19].

4.3 **Section headers** carry Ask · Adjust · Note [t19, t29]. The prototype shows per-item actions Fix · Adjust · Change · Add · Ask [t31] (see 11.3).

4.4 **Continue buttons.** "only appear at the top and bottom of the page", not pinned while scrolling [t16].

4.5 **Back to top.** "also add a button at the bottom to go in one click back to the top again if i scrolled down for large things" [t16]. It sits at the bottom of the page, not floating [t19].

4.6 **Status colours, the same everywhere** [t19]:
- red: open problem;
- amber: waiting for confirmation, or "needs updating";
- green: confirmed or done;
- grey with a shield: accepted risk.

4.7 **Step card** at the top of every step: what the step is for, what's done, what's left, and how long it usually takes [t23]. It is fully open on the first visit, then folded to one line that can be reopened [t23].

4.8 **First-use checklist:** 3–5 steps, which can be dismissed [t17 gap 8, t23, t29].

4.9 **Everything new reuses the existing design** and status colours, in all three languages [t23 item 33].

---

## 5. Start page and Capture

5.1 **Start page** [t15, t16, t23]:
- a large text field that grows as you type ("Describe your idea in your own words. Long is fine.");
- "Start" creates the project, fills Capture with the text, and suggests a project name;
- "Clarify my idea" is **not** run automatically: "for you to click it" [t16, t17].

5.2 **Second way in: "Check existing work"** (see section 20) [t17, t23].

5.3 **Mode choice at the start** (see section 19) [t31].

5.4 **Capture contents:**
- text field;
- "Clarify my idea" button;
- clean version beside the original;
- contradictions, unclear points and gaps [t19].

5.5 **North Star:** after clarifying, the user accepts or edits the proposed North Star [t29].

---

## 6. Understand, Interview, Assumptions, Requirements, Architecture

6.1 **Understand:** five whys, job to be done, reframes, walkthrough, pre-mortem, devil's advocate [t19].

6.2 **Interview layout, top to bottom** [t15, t19]:
1. an **"Answered (n)" list** that can be folded away, each question shown with its answer;
2. the current questions;
3. the coverage radar.

   v1 had the answers at the very bottom, under the radar (a bug).

6.3 **"Change answer"** reopens the question **with its original options**. The change then ripples to later steps through change flags (section 10) [t15, t17, t23].

6.4 **Interview behaviour** carried over from v1 (2.4).

   In Express mode the AI drafts answers, which stay **"assumed" until confirmed** and count as open for readiness [t31 **(inferred)**; prototype: "Drafted answers stay assumed until you confirm them"].

6.5 **Assumptions & risks:** the assumption map, the assumption list and the risk register [t19].

6.6 **Requirements:** requirements in Given/When/Then form, out of scope, principles, then "Check this step" [t19].

6.7 **Architecture** [t19]:
- options table and the user's choice;
- system map;
- human steps, data plan, result mockup;
- "Check this step".

   It also produces a **model-and-effort plan for every AI part** of the built tool, written into the build brief [t31], and says where the tool lives (section 15.3).

6.8 **System map** [t15, t16, t17, t19, t23]:
- reads **top to bottom** ("yes top to bottom") [t16];
- boxes sized to their full text, with no truncation;
- spacing calculated so nothing overlaps;
- connection labels in their own lanes, never on top of boxes;
- zoom, full-screen view, and click a box for details.

---

## 7. Review: the problem lifecycle

7.1 **States:** Open → Waiting for confirmation (Fixed) → Needs your sign-off → Done [t17, t23].
- **Tabs:** Open · Waiting for confirmation · Needs your sign-off · Done · Accepted risks [t19].
- **Done:** fixed problems "move to a 'Done' section i can open", never deleted [t16].

7.2 **The list shows only what is still open** [t15, t17].

7.3 **Who confirms:** never the step that made the fix [t17].

7.4 **Reappearing problems** are **reopened**, not counted as new. Repeat reopens are flagged [t17, t23].

7.5 **Proof a fix worked.** The user chose "all" [t16, t17, t23]:
- a separate reviewer re-checks each fix and shows the text before and after;
- the automatic rule checks run;
- the related tests are re-run;
- the user signs off critical and high problems.

   Every fix gets an **audit record**: what was wrong, what changed, who checked it, when.

7.6 **Help on each problem** [t15, t16, t23]:
- a plain-language explanation of what it means for the agent and why it matters;
- then three choices: **fix automatically · fix together with me · accept the risk with a written reason**.

7.7 **Walk-through and bulk fix.** The user wants both: "one at a time or all open ones, both i can do" [t18]. Buttons: "Walk me through, one at a time" and "Fix all open automatically" [t19].

7.8 **Re-running a review** checks only unresolved problems, plus a quick check that the fixes broke nothing else [t15, t17, t23].

7.9 **Accepted risks** [t19, t22, t23]:
- they count toward 100% only with a written reason and the user's sign-off (answer "1 yes" [t22]);
- each acceptance is tied to the exact version, so if that part changes, the user signs off again;
- the seal reads "Ready, with N accepted risks", never just "Ready";
- each has a re-check date [t17 gap 3].

7.10 **Approval requests** (improvement 5, see 21.2):
- each sign-off shows the goal, what changes, the risk, and how to undo it;
- related sign-offs can be approved together after they have been seen [t25].

---

## 8. Test

8.1 **Test contents:** cases, runs, "Improve from failures", re-run [t19, t29].

8.2 **Two judges** for release decisions, from **different Claude model classes** (answer "9 yes") [t17, t18].
- Where the judges disagree, the user decides [t19].
- Borderline scores also go to the user [t25].

8.3 **Per-category pass rules** (normal, edge, attacks, empty input, other languages) [t25]:
- each category must pass on its own;
- **any security test failure blocks release**, and so does any broken output format.

8.4 **Cost and length guard:** a new version about **20% or more longer or more expensive** per run is flagged as a regression, even when quality improves [t25].

8.5 **Judge reliability** [t25]:
- the user's spot-checks are measured near the pass/fail line;
- the judges' instructions are versioned.

8.6 **Fresh test set:** PT notices new kinds of input in reports that no test covers and offers to add tests for them [t25].

8.7 **Held-back tests** and repeated runs, carried over from v1 [t9].

---

## 9. Quality seal, Launch readiness at a true 100%, and copy blocking

9.1 **Quality seal:** any change after review or testing breaks the seal. Only the changed parts are re-reviewed and their tests re-run before the seal returns. Nothing can be copied that changed after it was checked [t17, t23].

9.2 **The user's requirement** [t18]: "add something so i can bring the launch readiness to truly 100% on the launch page. so all things that are not yet 10/10 or 15/15 have to be able to fix/adjust/change/add/and all else that would make it 100% launch ready". v1 held launch at only 80% [t13].

9.3 **Readiness items, each with what 100% requires and its fix button** [t19]:

| Item | What 100% requires | Fix button |
|---|---|---|
| North Star | Problem, goal and a measurable success measure are filled in | Opens the editor with the missing fields marked; "Suggest" drafts them |
| Full picture | Every dimension confirmed, or "not relevant" with a reason | "Answer the open ones" (interview for the gaps only); "Confirm guesses" |
| Riskiest assumptions | Validated, disproven and handled, or accepted with a reason | Research it · Ask me · Mark validated with evidence · Accept risk |
| High risks | A mitigation exists and is built into the package (linked to a line or test), or the risk is accepted | "Suggest mitigation" adds a draft change, which is then re-checked |
| Early checks | Requirements and Architecture checks done, nothing open | Runs the check |
| Needs-updating flags | None left | "Update affected parts only" |
| Package rules | No rule-check errors or warnings | Fix automatically, or show me |
| Problems | None open or waiting; critical and high ones signed off | Walk me through · Fix all |
| Test coverage | Every requirement has at least one test | "Write the missing tests" |
| Tests | Every test passes in every run, and both judges agree | Improve from failures · Re-run; the user decides on disagreements |
| Traceability | Every requirement linked to lines and tests; every line justified | "Close the gaps" |
| Quality seal | Nothing changed since the last review and test | Re-check what changed |

   The prototype's check list (t31) is: North Star clear · first questions answered and confirmed · assumptions and risks handled · requirements confirmed · every requirement has a test · review findings fixed and re-checked · tests pass (two runs) · build brief complete · second judge agrees · cost within budget. It also has "Fix all remaining (n), one after another" and "Walk me through them one at a time".

9.4 **Setup is separated from readiness.** "Claude Project set up" no longer counts toward readiness, which was circular in v1. The setup checklist comes after copying [t19].

9.5 **"Before you can copy" list** at the top of Launch [t18, t19, t22, t23]:
- gathers everything unfinished from all steps, grouped by step, each with **Fix** or **Go there**;
- the user asked that "anything that has not been fixed or i forgot to do or fix will show up in the logical step before i copy the prompt";
- **these block copying:** problems, flags, failed tests, untested assumptions, open questions, unhandled concerns, skipped interview questions;
- **unsorted notes are shown only and do not block** (answer "2 yes" [t22]);
- copy stays locked until the list is empty.

9.6 **Launch screen order** [t19, t23]:
1. readiness;
2. "Before you can copy";
3. final package / build brief;
4. setup checklist;
5. pilot run.

---

## 10. Changing earlier steps (change flags) and the Update button

10.1 **Option B was chosen** [t16, t17, t23]:
- every item knows what it depends on (the "suspect link" pattern);
- a change marks every downstream item **"may need updating"**;
- **"Update affected parts only"** rewrites just those parts and keeps everything else, including the user's own edits.

10.2 **A restore point is saved before anything changes** [t15, t16].

10.3 **A banner under the top bar** says, for example, "3 items may need updating because you changed R2 [Update]" [t19].

---

## 11. Fix / Adjust / Change / Add / Ask, and the Guide

11.1 **Both kinds of adjusting were wanted** ("9 both") [t16]:
- (a) adjust project content on the spot;
- (b) upgrade PT itself (section 13).

   The user asked "how exactly and where exactly" [t18]; the answer is in t19.

11.2 **Adjust on project content** [t19, t23]:
- **Where:** an Adjust button in the header of every content section and on every single item. That includes the North Star, clarified idea, each dimension, assumption, risk, requirement, architecture option and component, package section, test and fix proposal.
- **How:**
  1. An inline box opens: "What should change?"
  2. The user picks the scope: *only this item* or *this item and everything that depends on it*.
  3. A before/after preview appears, with Accept, Try again or Cancel.
  4. On Accept: restore point, new version, and downstream items flagged.

11.3 **Per-item action set in the prototype** [t31], following the user's "fix/adjust/change/add/and all else" [t18]:
- **Fix:** "What is wrong? Claude proposes a fix, you approve it."
- **Adjust:** "What should be a bit different?"
- **Change:** "What should change? Claude shows what else this touches."
- **Add:** "What is missing?"
- **Ask:** "Ask anything about this item."

    The proposal shows "Updated wording for {id}. Also touches: {parts}. Nothing else changes.", with Accept and Discard.

11.4 **Ask field:** a small ask field inside every section. The answer appears there [t15, t16, t19, t23].

11.5 **Guide panel on every screen** [t15, t16, t17, t19, t23]:
- knows exactly which screen the user is on;
- answers questions and explains what is done and what isn't;
- shows clickable options for next steps;
- **carries out actions** ("Q10 … yes" [t16]), for example "re-run the review on R2" or "make R2 stricter", always with a restore point first;
- before acting, shows what it will do and what it costs;
- never deletes or restores without an on-page confirmation;
- answers from built-in help written for the tool, in all three languages;
- its conversation is kept per project in the project log [t17 gap 10].

---

## 12. Never losing work: autosave, restore points, files

12.1 **Autosave** continues (v1). 1.0 adds a project-wide history, not only package versions [t15].

12.2 **Restore points (option A plus B)** [t16, t17, t23]:
- saved automatically when a step is finished, before every AI change, and on request;
- a **timeline** to restore any point;
- any point can be **previewed** before restoring;
- **restoring creates its own restore point**, so a restore can be undone;
- any point can be downloaded as a file.

12.3 **Retention: "Keep everything"** [t23 **(inferred)**, confirmed in Claude's summary]:
- milestones (step finished, release, named) are kept forever;
- automatic points between milestones are folded away so the timeline stays readable;
- PT warns well before storage is close to full.

12.4 **Deletion** [t30, prototype t31]:
- "only i can delete them, via one click and a confirmation click": Delete, then "Yes, delete for good";
- Claude may **recommend** redundant points with a reason, for example "identical to the next point", "automatic save made redundant by a later milestone", "storage at 80%", or less clutter and faster;
- Claude **never deletes anything by itself**.

12.5 **Storage limits** [t34 fix 5]:
- one page's storage holds at most 25,000 entries of 256 KB each;
- a **storage meter warns at 70%**;
- restore points are grouped per day;
- export to file is available;
- nothing is ever deleted automatically.

12.6 **One file per finished step** ("5 one file per finished step") [t16, t18, t23]:
- each download needs one confirmation click, which the viewer requires and cannot be removed;
- files go to the browser's normal Downloads folder [t17].

12.7 **File naming.** The user wanted names "easy to understand for me to see what it is and what version and what date, so i will never have to do it myself" [t16]. Decided "project first, then date and time, then version and step" [t19, t22]. Example:

    `Business-idea-scout_2026-10-18_19-15_v07_05-Requirements.json`

    - Dates use ISO year-month-day so files sort correctly; the format is the same everywhere [t17].
    - File names can include the workspace name [t17 gap 9].

12.8 **Existing v1 data** (14 storage entries at t19) carries over into 1.0 untouched, with a tested migration [t17 gap 1, t19, t23 item 18].

---

## 13. Upgrading Prompt Translator itself

13.1 **Reporting** [t19, t23]:
- "Improve this tool" at the bottom of the left rail;
- "This should work differently" in the Guide;
- "Report a tool problem here" in every section's menu, which records the screen and step automatically;
- all requests collect in **Notes › Tool requests**, which replaces "Notes to Claude", each labelled with its workspace (Second owner's requests go into the same list).

13.2 **Upgrade flow** [t19, t22, t23]:
1. "Upgrade the tool" (on the Tool requests page and in Settings › About) copies a ready prompt.
2. The user pastes it into a new Claude chat. Claude reads the requests directly from PT's storage.
3. Claude shows **the list of planned changes and the proposed version number, and waits for the user's go**. The user asked for this: "every upgrade also show you a list of what changes before Claude publishes it" [t18].
4. Claude builds, runs the full automated test, and publishes at the same link.
5. Afterwards:
   - a **"What's new"** screen;
   - a dated **change log** grouped into Added, Changed, Fixed and Removed;
   - the requests are marked done;
   - rollback stays available;
   - user data is never touched.

13.3 **Version numbers for PT.** Three numbers [t22, t23 **(inferred)**, stated in Claude's summary]:
- 1.0.1 = fixes only;
- 1.1 = new features that fit the current way of working;
- 2.0 = a big change to how you work;
- the current tool becomes **Prompt Translator 1.0**.

   The user's own wording was "from 1.0 to 1.1 if it's just fixes, or 2.0 if it was a big update with new functions" [t22]; three numbers replaced it.

13.4 **Preview copy** [t23 **(inferred)**]:
- big upgrades go to a separate preview copy with an example project to try first;
- small fixes go straight to the live tool once the change list is approved.

13.5 **Post-update test.** "yes we do this as a test to verify after the update so it worked" [t22]. Running Check existing work on Opportunity Explorer is the first real test after the update (section 20).

---

## 14. Launch (pilot), Release, Operate, live link and runner

### 14A. Live link and how tools get their instructions

14A.1 **Proven.** A scheduled or background run can read and write PT's storage [t19]. A **chat inside a Claude Project can read PT's data** (T3, codeword BLUE-HERON-47) [t37, t38].

14A.2 **First launch** (the latest wording wins):
- t29: paste the package plus one line ("load the newest Released version from PT").
- t31: the build brief makes the built tool store its own copy of its instructions plus the rule "always load the newest released version from PT"; until the first release, it uses its own copy.
- **t38 (latest):** the build paste is **one short line**, for example "Load release Idea Scout v1.0 from Prompt Translator and build it". The chat reads the full brief from PT, so nothing gets cut off or changed by copying.

14A.3 **Later updates:** pressing Release is the update. The live tool or project loads the newest **Released** version on its next run. Candidates never reach the live project before Release [t19, t23, t29, t38].

14A.4 **Fallback copy plus auto-load: "both in the way and shape they work best"** [t22]:
- the project keeps a pasted fallback copy;
- if PT is unreachable, the agent uses that copy;
- PT reminds the user when the copy is several releases old [t19];
- pasting the new text by hand stays available as a backup [t38].

14A.5 **Parts with no automatic update path** (Claude Project instructions and files, skills, memory) [t34 fix 8]:
- PT gives the exact new text in one copy and says where to paste it;
- the user clicks "Done" and PT checks the result.

### 14B. Runner

14B.1 **Runner.** A scheduled task called **"Prompt Translator runner"** only runs when a button in PT is pressed. It appears in the user's Scheduled list and must not be deleted [t29].
- Started from the page through the Claude Code Remote connection (`fire_trigger`); proven by the runner connection test [t23, t28, t29].
- First use asks once for three permissions: Claude access, downloads, and the connection for runs [t29].

14B.2 **Background runs take 1–60 minutes** (one test took 58 minutes, another 5) [t35, t36]:
- PT shows each run as **running** until its report arrives and never marks anything done before then;
- runs continue in the cloud after PT is closed, and results appear on the next open [t23, t29].

14B.3 **Tagging.** Every run and report is tagged with its workspace and may only write there, because of the shared login [t34 fix 3].

### 14C. Launch (pilot)

14C.1 **Launch contents** [t23, t29]:
- readiness to 100% with Fix buttons;
- the "Before you can copy" list;
- copy unlocks;
- setup checklist;
- pilot.

14C.2 **The pilot is the runner** [t29]:
- it tests the candidate for real, with live web search;
- **side by side with the current release** on the same tests once a release exists, with a direct comparison scorecard (improvement 3) [t25];
- a manual first run in the user's own project is optional on the setup checklist.

14C.3 **Build brief (prototype, t31):**
- "Build brief, ready to paste";
- recommended model for the build chat, with a reason;
- "Where it lives";
- the four steps: 1 Copy · 2 New chat · 3 Paste · 4 Enter.

### 14D. Release

14D.1 **Release** [t19, t23, t29]:
- the pilot result is checked by two judges from different model classes;
- the user signs off and presses "Release R1";
- the version becomes R1, R2… (see section 27 on numbering);
- release notes are written automatically;
- rollback is one button;
- the release becomes the official live version and the baseline.

14D.2 **Build report check** [t31 prototype, t34 fix 9]:
- the build chat ends with a report that **lists every part and every check by ID**;
- PT compares it with the spec, so a missing ID shows up as a gap;
- where possible, a background run opens the real tool and checks it rather than trusting the report alone.

   Prototype text: "Report checked: 9 of 9 parts built, 8 of 8 checks passed. Pilot is running…" then "Promote to release v1.0".

### 14E. Operate and health check

14E.1 **Run health check** in Operate:
- a button, "not a weekly 'health check' scheduled task but a button for me" [t18];
- one click, because the page can start the runner (proven); one paste was the fallback [t22, t23];
- the run loads the Released package, runs every test for real with live web search, and writes the report back into PT [t19];
- it tests the package itself, not the project's own memory or connectors [t19, t23].

14E.2 **Health check depth: chosen each time** [t23 **(inferred)**]:
- **Thorough:** every test once, held-back tests twice;
- **Most reliable:** every test three times, uses the most usage.

14E.3 **After a report with problems** [t23 **(inferred)**]:
- PT first only **explains** what it found and proposes fixes, then stops;
- **one click** starts the full cycle: fix → independent confirmation → related tests;
- the cycle stops again for sign-off on critical and high problems;
- the user presses Release, and the project picks it up by itself.

14E.4 **A release that scores worse** than the previous one: PT warns and shows exactly what got worse, with a one-click rollback ready. **Nothing changes until the user decides** [t23 **(inferred)**, t31]. "Prompt Translator asks you before any rollback."

14E.5 **Also in Operate:**
- feedback inbox;
- health chart per release;
- model watch;
- scorecard per release (R1 vs R2 vs R3 on the same tests) [t19, t23].

14E.6 **Health check for all tools:** one button gives a one-line status for every live tool [t34 addition].

14E.7 **Prototype Operate screen** [t31]:
- status line: "Live v{v} · last run · N of N runs ok · % of weekly usage";
- inbox items tagged Reported from the tool / Caught automatically / Research proposal / Your change request;
- each item can be included in or left out of the update;
- "Update plan v{a} → v{b}" with the full change list shown before anything is published.

### 14F. Updating a built tool and verifying the update

14F.1 **Update run steps** [t31]:
1. Save a restore point.
2. Update the brief for the changed parts only.
3. A background run updates the tool in place (same link).
4. Smoke test.
5. Acceptance tests.
6. Inventory audit against the previous version.
7. The second judge reads the result.
8. Write the report.

14F.2 **Post-update verification** [t30, t31]. The user asked that after an update the tool "checks if the update has been done cleanly and checks the whole system and audits it to be 100% all is functionally and there as we intended, nothing lost, no gaps, no fossils, no issues) and the tool tells me so". Agreed checks:
- smoke test: the tool opens, the main paths work, data is still there;
- acceptance tests for every requirement;
- inventory audit of all parts and requirements before and after, flagging anything missing, anything new nobody asked for, and leftovers ("fossils");
- result: a **Verified** or **Not verified** report. It shows "Nothing lost · No gaps · No fossils · No new issues", plus "What's new in v{b}" and "Roll back to v{a}";
- if anything fails, PT stops and offers rollback, asking first.

14F.3 **What can update automatically** [t31, t34, t36]:
- **pages (artifacts):** a background run can republish at the same link (proven);
- **docs and code:** automatic;
- **scheduled tasks:** PT tries an in-place change first. If Claude's safety check blocks it, PT creates the new task, checks it, then deletes the old one, and keeps the old task's history itself. PT tells the user which path it took [t35, t36].

14F.4 **Schedules are set in Zurich time** so they don't shift at the clock change [t34 fix 10].

---

## 15. Built tools: what "tool" means and how they are built

15.1 **Definition.** "when i write tool i always mean anything and everything we did and we will and we can make in the Prompt Translator 1.0" [t30]. What PT can design and build [t31]:

| Kind | Examples | One paste builds it? |
|---|---|---|
| Interactive web apps (artifacts) | Dashboards, boards, trackers, calculators, portals; storage, AI inside, files, multiple users, connected apps | Yes |
| Automations | Scheduled tasks: hourly, daily, weekly or on a button; research, reports, monitoring | Yes |
| Agents and agent teams | One agent, or a lead agent with helpers | Yes |
| Documents and data | Docs, Sheets, Slides, Design, Whiteboard, Tasks, Dashboard types | Yes |
| Skills and plugins | Reusable procedures | Prepared; the user clicks Save |
| Claude Projects | Chat assistants with instructions, knowledge, memory | Partly; the user creates the project |
| Connected work | Gmail, Drive, Slack, Notion, browser automation | Built; the user connects accounts once |
| Software (Claude Code) | Websites, scripts, apps in a repository | One-click route (15.6) |
| Developer platform | API, Agent SDK, managed agents | PT writes the spec |

15.2 **Build style: one paste, many checked steps** [t30, t31 **(inferred)**]. The user asked for "copy, open new claude chat window, paste, enter". Claude plans, builds one part, tests it, then the next, runs a final acceptance test of the whole tool, and writes a **build report** back into PT [t31].
- Brief text: "every part, in order, each with its own check" [prototype].
- One-shot builds fail far more often (about a quarter of full specs pass on the first try).

15.3 **Where tools live:** PT decides the best mix per tool (pages, automations, Claude Project, documents) and explains why in Architecture [t31 **(inferred)**; prototype "Where it lives"].

15.4 **Every built tool sends problems to PT by itself** [t31 **(inferred)**: all three options were recommended, and the prototype shows all three]:
- **Report a problem** button: sends the description, screen, version and recent errors;
- **automatic error capture:** errors and failed AI calls, sent in batches;
- **run records:** each run writes a one-line success or failure;
- every report carries the tool's ID; each built tool has its own inbox; PT's own problems go to Tool requests [t31];
- **mechanism (t34 fix 7):** a built tool keeps its own storage, which PT can't see live. The tool saves the report together with a run record, and PT's **"Check for reports"** button collects them. Scheduled tasks and agents write a short record after each run.

15.5 **Additions accepted at the end** [t34; the answer card is not in the transcript, and the builder's brief states they were accepted]:
- **Golden examples per tool:** fixed inputs with known correct results, re-run after every update.
- **Tool passport:** every built tool gets an About section with version, owner (Owner or Second owner), a Report-a-problem button and a link back to its PT project.
- **Draft-first:** anything that sends or spends only makes drafts in its first runs.
- **Pause button:** one click stops a tool's schedule.
- **Health check for all tools:** one button, one line per live tool.

15.6 **Software / Claude Code route: one click via GitHub PR.** The user: "i also want it one click, how would we do that holistically?" [t33]. The design [t34; chosen per the builder's brief: "Cloud + GitHub PR"]:
- "Build in Claude Code" starts a background coding run (the same button-to-run link);
- the run creates or uses a GitHub repository, works on a separate branch, builds in checked steps, runs tests, opens a **pull request**, and writes its report into PT;
- PT shows the test results, the PR, and the parts list compared to the spec;
- **approving the PR is the release**; each update is a new PR; rollback means undoing that PR;
- bug reports go to PT's inbox and to GitHub;
- **needs GitHub connected once** (not connected at t34);
- hosting, domains, payments and app stores need outside accounts, which PT lists as user steps with a checklist; a simple website can be published from GitHub automatically;
- anything that must run on the user's own computer uses the desktop Claude Code with the same brief (copy and paste, not one click);
- **this route stays switched off until test T4 passes** [t36, t38].

15.7 **Model in the build chat** [t30, t31, t34 fix 6]:
- a prompt can't switch the chat's model, so the brief states which model and effort to pick ("Recommended for the build chat", with a reason);
- inside the build, Claude can delegate to helper models;
- background runs always use the account's default model, so background tasks are designed to work well on it.

---

## 16. Online research

16.1 **Routes** [t10, t11]: "all that's necessary to make it as seamless and clean experience as possible". That covers:
- the built-in dated knowledge pack;
- research handoffs with automatic read-in;
- the desktop-browser route;
- connectors.

16.2 **Automatic research** [t31]. Proven possible because the runner has web search. Where it helps most:
- checking assumptions;
- "does something like this exist?";
- legality and terms of data sources;
- current Claude features during Architecture;
- realistic test data;
- watching for model changes;
- freshness of a live tool's data sources.

   **When it runs: (inferred)** "Automatic at key steps" within a budget. The prototype mentions a "weekly research run" whose findings arrive as research proposals. Confirm.

16.3 **Research rules** [t31]:
- every claim is stored with source, date and confidence;
- primary sources first;
- contradictions are flagged;
- **every link is checked** (deep-research agents invent about 3–13% of citations);
- web content is information, never instructions;
- results expire and are re-checked;
- cost is shown before each run, and a budget applies;
- a run takes a few minutes.

16.4 **Research runs as a background run** (about 2–5 minutes) and results arrive in the inbox. The page cannot open other websites, so PT shows research as **running**, not instant [t34 fix 2].

16.5 **Outside changes** (new Claude features, better models, stale sources) are **proposals only**, never applied without the user: "Proposed only. Nothing changes unless you include it." [t31 **(inferred)**, prototype].

---

## 17. Model and effort selection

17.1 **History.** At first: "can be changed/decided by the user at any step" [t10]. Then the user asked for it to be automatic: "i want it to be automatically choosing the best choice for the task" [t30].

17.2 **Inside PT: automatic with escalation** [t31 **(inferred)**; t34 fix 6: "Inside PT, the choice is automatic"; prototype "Chosen automatically. Moves up one level if a check fails."]:
- **fastest model:** note sorting, translations, quick explanations;
- **balanced:** test writing, drafting, the Guide;
- **most capable, high effort:** interview, architecture, compiled package, reviews, diagnosis, improvements;
- **second judge:** always a different model class;
- a weak or invalid result escalates to the next stronger model;
- every routing decision is logged;
- every AI step shows a chip such as "Opus 5.5 · high, because it designs your architecture";
- **the user can always override.**

17.3 **For built tools:** a model-and-effort plan per AI part in Architecture. Pages can route each call themselves [t31].

17.4 **Limits:** the build chat model is only a recommendation, and background runs use the account default [t34 fix 6].

---

## 18. Budget, cost and usage

18.1 **Cost warning** before any heavy automatic cycle [t17 gap 6, t23 item 14].

18.2 **Budget: warn at a threshold** [t31 **(inferred)**]:
- each automatic job shows its estimated cost;
- a warning appears when a project's month passes the level the user set;
- nothing is blocked.

   The prototype shows "Estimated PT usage this week {n}% · warning at 70%" and a "Cost within budget" readiness check.

18.3 **Usage meter label is "estimated"** [t34 fix 1]. A page can't see the Claude plan usage; PT only estimates its own AI calls and runs. The real number is in Claude's settings.

18.4 **Shared usage limit:** Owner and Second owner share one usage limit [t34 fix 3].

18.5 **Every AI step uses the user's own usage.** Claude asks permission the first time [t7, t13].

18.6 **Light / medium / heavy markers** on AI buttons, kept from v1 [t9, t13].

---

## 19. Visual modes, Guided/Pro, layouts

19.1 **The user's brief** [t30]: explore visuals for intuitive understanding and the least effort ("time, clicks, actions, typing, reading, researching"), including for a non-coder like the second user. Keep all functions and safety, and do not commit before exploring.

19.2 **A clickable concept prototype was built first** [t31] (`/home/claude/pt/proto/modes.html`, example data). The user reviewed it before "go"; Second owner's name was added afterwards [t34].

19.3 **Five switchable working modes per project** [t31: "How I read your '1 and 2'"]:
1. **Steps:** today's pages, one step at a time, full detail;
2. **Blueprint:** the living map of parts, coloured by status (fine, problem, needs update, untested); clicking a part shows everything linked to it in every step, with Adjust and Ask;
3. **Journey:** the 12 steps as a metro line with gates, plus status tiles;
4. **Swimlanes:** who does what (You / AI / Rules / platform), plus the change map of what an update touches;
5. **Express:** describe once, Claude drafts all steps, the user confirms cards in bulk; the gates stay the same.

19.4 **Guided / Pro is a separate switch** that works in every mode, not a sixth mode [t31]. Guided is simple and ideal for Second owner; Pro shows everything.

19.5 **Two layouts** [t31; the builder's brief says "two layouts", and the prototype has both]:
- "Visuals in pages" (current pages with visuals added);
- "Blueprint as home" (the project opens on its map).

   Layout is a setting **(inferred** from the t34 prototype question option "Keep all 5, both layouts — Layout becomes a setting").

19.6 **Mode switching rules** [t31]:
- every mode is a view on the same single project and never keeps its own copy;
- one shared "you are here" marker, so switching lands on the same step and item;
- checks and readiness are identical in every mode, so no mode is a shortcut;
- switching only saves the chosen mode, so nothing can be lost;
- Express drafts stay "assumed" in every mode until confirmed;
- switching from Express first shows the assumed items to confirm.

19.7 **Default mode** [t31 **(inferred)**, prototype]:
- each person sets a default (prototype: Owner Blueprint, Pro, English; Second owner Journey, Guided, Chinese);
- the mode can be changed at project start;
- PT suggests a better-fitting mode at key moments, which the user can ignore.

19.8 **When to use which mode** [t31 suggestions]:

| Step | Suggested mode |
|---|---|
| Capture, Understand | Express |
| Interview to Requirements | Steps |
| Architecture, Build brief | Blueprint |
| Review, Test, Launch | Steps |
| Release | Journey |
| Operate | Swimlanes |

    Switching is safe at any time; the cleanest moment is right after a step's check passes.

19.9 **Visual rules** [t31]:
- no hand-wiring of boxes;
- every visual has a text version;
- no decorative animation;
- not too many views;
- visuals always come from the same data as the text.

19.10 **Not possible:** voice input inside the page [t31].

---

## 20. Check existing work, and Opportunity Explorer

20.1 **"Check existing work" on the start page** [t15, t16, t17, t23]:
- input: paste text **and** upload .md, .txt, .json or PDF files ("both") [t18];
- output, "all three" [t16]:
  - the problem report;
  - a **fixed version** with minimal changes and the same structure;
  - a **full rebuild** through the normal steps;
  - all three scored side by side on the same tests;
- inferred North Star, requirements and architecture are marked "inferred, please confirm" [t15];
- audit rules [t17]:
  1. record current behaviour before changing anything;
  2. never delete a section whose purpose isn't understood;
  3. keep hard rules (legal, safety) apart from style rules.

20.2 **Opportunity Explorer** is the user's existing weekly scheduled task. It already uses the live-link storage route, is written in Simplified Chinese, and overlaps strongly with the business-ideas agent [t19, t27]. It is the **first real test of Check existing work after the update** [t19, t22, t23]. It must stay untouched by tests [t36].

---

## 21. Lists agreed during the chat

### 21.1 The 35-item 1.0 change list [t23]

**A. Steps and workflow**
1. Twelve steps in three groups (3.1).
2. Draft can be read, not copied.
3. Early "Check this step" at Requirements and Architecture, feeding the same problem list.
4. Quality seal broken by any later change; only changed parts re-checked.
5. Launch (pilot): true 100% readiness with a fix button on every item; the "Before you can copy" list (blocking versus shown-only as in 9.5); copying only here; then the setup checklist; then the pilot.
6. Release: two judges from different model classes, sign-off, R1, R2…, release notes, one-button rollback.
7. Operate: Run health check (one click, or one paste as fallback); the report writes itself back; fix cycle; new candidate through pilot and release; feedback inbox, health chart per release, model watch.
8. Live link: pasted fallback copy plus a line to load the newest Released version; candidates never reach the live project before Release.

**B. Problems and quality**

9. Problem stages, Accepted risks tab, reopen rather than new.
10. Proof a fix worked (four checks) plus an audit record.
11. Help per problem (explanation and three choices); one at a time or all at once.
12. Re-run checks only unresolved problems plus a nothing-else-broke check.
13. Accepted risks: reason and sign-off, tied to the exact version, seal reads "Ready, with N accepted risks".
14. Cost warning before heavy automatic cycles.

**C. Never losing work**

15. Change flags plus "Update affected parts only", restore point first.
16. Restore point timeline: milestones forever, automatic points collapsed, restore creates a restore point, preview before restore.
17. One file per finished step, named project first.
18. Existing data moves into 1.0 untouched, migration tested.

**D. Help, adjusting and understanding**

19. Guide panel (shared with Notes): screen-aware, carries out actions with a restore point, built-in help in three languages, conversation kept in the project log.
20. Ask field in every section.
21. Adjust on every section and item, with scope choice and before/after.
22. "What Claude is doing" (section 22).
23. Step card at the top of every step.
24. First-use checklist.

**E. Existing work**

25. Check existing work (section 20).

**F. Upgrading the tool**

26. Reporting from the left rail, the Guide and section menus into Notes › Tool requests, labelled by workspace.
27. Upgrade flow, What's new, change log, rollback.
28. Version numbers for the tool (three numbers), drafts (v1, v2…) and releases (R1, R2…).

**G. Interface**

29. Start page large field; Start fills Capture and suggests a name; the user clicks Clarify.
30. Interview "Answered" list at the top with "Change answer".
31. System map top to bottom, full text, no overlaps, zoom, full screen, click for details.
32. Continue at top and bottom, Back to top at the bottom.
33. Consistent look in all three languages.

**H. Delivery**

34. Extended automated test of every new flow and all three languages before delivery.
35. Clean-up of the runner test and its task. Done at t29.

### 21.2 The 6 improvements, all accepted [t25: "All six improvements are in"]

1. Per-category pass rules; any security or format failure blocks release (8.3).
2. Cost and length guard at 20% or more (8.4).
3. Side-by-side pilot of candidate and current release on the same tests (14C.2).
4. Judge reliability: borderline or disputed scores go to the user; spot-checks near the line; judge instructions versioned (8.2, 8.5).
5. Better and fewer approval requests: goal, change, risk and undo; related sign-offs can be batched (7.10).
6. Fresh test set reminders (8.6).

### 21.3 The eight decisions [t23, restated in t25]

1. Three-number versions.
2. Preview for big upgrades.
3. Explain first, then fix on one click.
4. Ask before rollback.
5. Health check depth chosen each time.
6. Every restore point kept.
7. Full activity log.
8. Step cards open first, then one line.

### 21.4 Final audit fixes 1–10 [t34]

1. Usage meter labelled "estimated"; the real number is in Claude's settings.
2. Research and link checks run as background runs (2–5 minutes) and arrive in the inbox; shown as running, not instant.
3. Shared login: every run and report is tagged with its workspace and may only write there; one shared usage limit.
4. Simultaneous use: a save only goes through if nobody changed the data in between; otherwise PT reloads and shows a notice.
5. "Keep everything" growth: storage meter warns at 70%, restore points grouped per day, export to file, never deleted automatically (limit 25,000 entries of 256 KB).
6. Model choice limits: automatic inside PT, only a recommendation in the build chat, account default for background runs, so background tasks are designed for the default model.
7. Bug reports from built tools: saved with a run record in the tool's own storage, collected by PT's "Check for reports" button; scheduled tasks and agents write a short record after each run.
8. No automatic update path for Project instructions and files, skills and memory: PT gives the exact text in one copy and says where it goes; the user clicks "Done" and PT checks.
9. The build chat is invisible to PT: the report must list every part and check by ID, PT compares it with the spec, and a background run opens and checks the real tool where possible.
10. All schedules in Zurich time.

### 21.5 Additions accepted at the end [t34]

Golden examples per tool; tool passport; draft-first plus pause button; health check for all tools (details in 15.5).

---

## 22. "What Claude is doing": transparency and activity log

22.1 **Before** anything heavy or hard to undo, a short preview: what Claude will read, change and not touch, and the cost [t23].

22.2 **During**, named steps instead of "Thinking…", for example "Checking R3 against the output format (2 of 5)" [t23].

22.3 **After**, a short "what changed" summary [t23].

22.4 **Activity log shows everything** [t23 **(inferred)**, stated in Claude's summary]:
- grouped by step and session;
- filter and search;
- important entries highlighted.

   Small, easily undone actions only show a brief note in the interface [t23].

22.5 **Express mode** wording: "I drafted {n} items across {m} steps in one pass. {a} of them are assumed until you confirm them. Change anything in plain words." [t31 prototype].

---

## 23. Languages, two people and platform facts

23.1 **Interface languages** [t6, t11, t27]:
- English, German and **Simplified Chinese with mainland wording**, switchable live;
- the user: "i dont talk HK chinese but mainland chinese" [t26]; decided Simplified mainland at t27 (Traditional dropped);
- the language menu shows 简体中文;
- every Chinese text is rewritten natively for mainland readers, not converted. That covers menus and buttons, step explanations, the Guide's built-in help, the knowledge base and starter building blocks;
- **AI answers are in Simplified Chinese** whenever the interface is Chinese, including translations of notes and the side-by-side prompt mirror;
- workspaces currently set to Chinese switch to Simplified automatically, with nothing lost;
- **the automated test checks that no Traditional characters or Taiwan-only words remain** (for example 專案, 資料, 使用者, 設定, 程式 become 项目, 数据, 用户, 设置, 程序).

23.2 **German** uses Swiss spelling, **"ss", never "ß"**, and the test checks this [t7, t11, t13].

23.3 **Translation quality** [t6]: "all translations should function and be coherent and clean and consistent … show the real translation with context and meaning in mind so no translated word is sounding off". A shared glossary keeps terms consistent [t7, t11].

23.4 **Two people, one shared login** [t12]:
- the user chose "One shared login";
- each person gets a separate workspace with a switcher and an optional lock (PIN), labelled as separation of work, not security;
- Second owner "has her own projects so give her the space to use all of the tool fully without interfering with my use and work ever" [t6];
- her workspace gets every feature, kept separate [t17 gap 9, t19, t23];
- updates reach her automatically, because it is the same tool [t10].

23.5 **Name.** "for Partner use Second owner everywhere" [t33]:
- 1.0 says Second owner everywhere, in EN, DE and ZH [t34];
- the user is Owner (prototype; tool passport owner "Owner or Second owner") [t34].

23.6 **Simultaneous use:** see 21.4 fix 4.

23.7 **Platform facts used by the design:**
- PT cannot write into a Claude Project directly [t7, t15];
- the page cannot browse the web; background runs can [t7, t31, t34];
- the page cannot use the microphone [t31];
- downloads need one click each [t17];
- PT works only while open, except for background runs [t17, t23].

---

## 24. Test results T1–T4 and earlier link tests

- **Live link test** [t19]: a one-time scheduled run read PT's storage and wrote back within a minute, with no approval needed. **Passed.**
- **Runner connection test** [t23, t28, t29]: a page button (`fire_trigger` via Claude Code Remote) started a background run that wrote into PT's storage. **Passed.** The test page and its task were deleted at t29.
- **Update test** [t31, t35]:
  - creating a page and republishing it at the same link: **passed**;
  - creating and deleting a scheduled task: **passed**;
  - **changing** a scheduled task: blocked by the safety check that time;
  - the run took 58 minutes.
- **T1** (background run writes its report into PT): **passed** within a minute [t35, t36].
- **T2** (background run changes a scheduled task): **passed** on re-test (create, rename, change instructions, switch off, delete). The safety check is inconsistent, so 1.0 tries the change first and falls back to create-new, check, delete-old [t36].
- **T3** (a chat inside a Claude Project reads PT's data): **passed**, codeword BLUE-HERON-47 [t37, t38].
- **T4** (Claude Code route): **open**. GitHub is not connected; the user must connect it under Connectors → GitHub. The code route stays switched off until T4 passes [t34, t36, t38].
- **Rule** [t36]: features that depend on an unpassed test stay switched off until it passes. The user may give "go" before then.
- **Cleanup done:** all throwaway tasks and storage entries were deleted; Opportunity Explorer was untouched [t36, t38].

---

## 25. Delivery requirements for the 1.0 build

1. Build only after the user says "go"; the user repeated this many times [t4, t6, t16, t18, t22, t38].
2. Run an extended automated test that clicks through every flow, including every new one, in all three languages: language completeness, no "ß", no Traditional or Taiwan wording, privacy between workspaces, reload, migration [t11, t17 gap 11, t23 item 34, t27].
3. Do a full dry run with the business-ideas agent, from idea to launch package [t11].
4. Publish at the same link (https://claude.ai/artifact/VjEPcpnocMTPMwHvHdwTZ3) with existing data kept [t23, t29].
5. Create the "Prompt Translator runner" scheduled task, which runs only on button press [t29].
6. Make Prompt Translator 1.0 the version shown, with What's new and a change log from here on [t22, t23].

---

## 26. User-reported bugs and gaps in v1 that must be fixed

The user's original list (t14) is not in the transcript; it was referred to as having at least 39 lines. The items below are taken from Claude's item-by-item analysis of that list [t15] and from later reports.

1. **Build order is backwards** [t15]:
   - the package could be copied in Build before Review and Test changed it, so a prompt with open problems could be copied;
   - applied fixes updated the package silently;
   - no single place said "this is the final version".
2. **"Apply fixes" left problems in the list** [t15]: a problem was only marked fixed when Claude's reply named its exact ID, and there was no confirmation step.
3. **No proof that a problem is really gone** (no independent re-check or audit trail) [t15].
4. **No help when problems are found:** no plain explanation and no guided choices [t15].
5. **Going back to an earlier step:** later steps didn't know about the change; for example, a changed interview answer didn't update requirements [t15].
6. **Saving:** only the package kept versions; earlier steps had no history and there were no restore points [t15].
7. **No way to check existing prompts, projects, agents or agent clusters** (lines 13 and 39 of the user's list) [t15].
8. **No way to re-check a launched project** and get fixes back into it [t15].
9. **No fix/adjust tool at the useful places,** for project content or for the tool itself [t15].
10. **No "ask anything" bar** on screens [t15].
11. **Start page had only a one-line name field** [t15].
12. **Interview hid the answers** at the very bottom below the long radar; answers could only be edited as text, and the options couldn't be picked again [t15].
13. **System map text was covered:** fixed-size boxes cut off long names, and connection labels sat on top of boxes [t15].
14. **"Continue" buttons were missing at the top** [t15].
15. **Launch readiness couldn't reach a true 100%:** items under 10/10 or 15/15 had no fix path [t18]; "Claude Project set up" counted toward readiness while copying had to come first (circular) [t19]; v1 held launch at 80% [t13].
16. **Leftover unfinished items** (forgotten fixes, open questions and so on) didn't surface before copying [t18].
17. **Chinese was Traditional with Taiwan wording;** the user needs mainland Simplified [t26, t27].
18. **Model and effort weren't chosen automatically** [t30].
19. **The usage meter implied real plan usage,** which the page can't see [t34 fix 1].
20. **Simultaneous use by both people could overwrite the shared workspace list** [t34 fix 4].
21. **Upgrading the tool from "Notes to Claude" had no clear flow,** no version number, no What's new and no change log [t19, t22].
22. **The health check was planned as a weekly scheduled task;** the user wants a button [t18].
23. **Restore points:** only the user may delete them, with Claude's recommendations [t30]. This is new functionality, not a v1 bug, but it was listed as a must.

---

## 27. Ambiguities, contradictions and changes of mind (the later decision wins)

1. **Chinese variant:** Traditional Chinese [t10, t11; Taiwan wording used in v1] → **Simplified, mainland** [t27].
2. **Step order:**
   - Claude's t15 option A put Release before Launch;
   - the user put Launch before Release [t16];
   - **final:** pilot-then-promote, 12 steps as in 3.1 [t19, t23].
   - **Naming is still open.** The t19/t23 list says "Interview", "Draft", "Operate"; the latest prototype [t31] says "First questions", "Build brief", "Operate & update". The builder must pick one set and use it consistently. The prototype is the later source.
3. **Copy before Launch:** "draft, not yet checked" label was offered → **completely blocked** [t18].
4. **Health check:** weekly scheduled task [t15] → **a button** [t18] → one click proven [t29]; plus "health check for all tools" [t34].
5. **What the pilot is:** a manual first run in the user's project [t19] → **the runner's real test run, side by side with the current release**; the manual run is optional [t29].
6. **First launch and build paste:**
   - paste package plus one line [t29];
   - the build brief makes the tool store its own copy [t31];
   - **paste one short line; the chat reads the full brief from PT** [t38].
7. **Build report: written back or pasted?**
   - t31 says the build chat "writes a build report back into PT" automatically;
   - the prototype [t31] and t34 fix 9 describe pasting the report into Release;
   - T1 proved background runs can write into PT, and T3 proved Project chats can **read** it; a normal chat writing to PT was not separately tested.
   - Not resolved. Suggested reading: automatic write-back where possible, with pasting as the fallback.
8. **Version numbers of PT:** two numbers in the user's wording [t22] → **three numbers (semver)** [t23].
9. **Version numbers of built tools:**
   - drafts v1, v2… and releases R1, R2… [t17, t19, t23, t29];
   - the prototype [t31] uses "Promote to release v1.0" and "Update plan v{a} → v{b} … minor version", and t38 says "Load release Idea Scout v1.0".
   - Not explicitly resolved. The later wording (v1.0-style release numbers) suggests built tools use semver-style release numbers. Confirm.
10. **Downloads per step:**
    - B, automatic download at every step [t16];
    - then asked again [t17];
    - **one file per finished step** [t18]; each needs one confirmation click.
11. **File-name order:** unanswered at t18 → **project first** [t19, confirmed t22].
12. **Restore-point retention:**
    - cap of 50 recommended [t23] → **keep everything** [t23];
    - plus user-only deletion with Claude's recommendations [t30];
    - plus storage meter at 70% and per-day grouping [t34].
13. **Model and effort choice:** the user decides at any step [t10] → **automatic with escalation, visible chip, always overridable** [t30, t31, t34].
14. **Rollback after a worse release:** automatic rollback was recommended → **ask first** [t23].
15. **Auto-fix after a health check:** "up to your sign-off" was recommended → **explain first, then one click starts the cycle, stopping again for sign-off** [t23].
16. **Activity log:** "key moments" was recommended → **everything, grouped and searchable** [t23].
17. **Upgrade preview:** "preview for big upgrades" (always or never were the alternatives) [t23].
18. **Updating scheduled tasks:** the update test was blocked [t31, t35] → T2 passed → **try in place, otherwise create new, check, delete old** [t36].
19. **Feeding fixes into a launched project:**
    - two pastes per cycle [t15];
    - the user: "no" to Google Drive or Notion, "all over claude, find optimal solutions" [t16];
    - → **Live link, no pasting** [t19, t38].
20. **"Usage meter"** (v1, light/medium/heavy) is kept, and the overall weekly figure is labelled **estimated** [t34].
21. **Desktop only** [t6], but v1 and the prototype were also checked at phone width. Keep desktop as the priority and don't break narrow widths.
22. **Test pass rule:**
    - "every test passes in every run" [t19];
    - prototype "Tests pass (two runs)" [t31];
    - health check depth chosen each time [t23].
    - Not contradictory, but the number of runs in the Test step itself is not fixed. Suggested: at least two.
23. **Answers not shown in the transcript.** These decisions come from Claude's restatement or the prototype and should be confirmed with the user if any doubt remains:
    - t23 (8 decisions) and t25 (all six improvements): restated explicitly by Claude, so reliable;
    - t27 (Simplified mainland): restated explicitly, so reliable;
    - t31: build style, tool home, reporting options, research timing, outside-change handling, model choice, budget, visuals selection, fit, order, modes, Express drafts, default mode, prototype contents;
    - t34: code route, timing of the link tests, additions, prototype changes. The builder's brief states the additions and the GitHub PR route were accepted. The tests were run before "go". The prototype answer is not visible; the brief says five modes, Guided/Pro and two layouts.
24. **Guided/Pro:** a separate switch, not a sixth mode [t31].
25. **The 12-step grouping question** (t19 Q5) was never answered explicitly; it was carried forward unchanged into t23, t25 and t29 without objection.
