# PT release checks (internal, for every update)

Run before every publish of main: `python3 test/release_gate.py` (all, ~60 min) or `--quick` while building (~25 min).
The gate runs: build · static checks · check the checks · strings · unit · flows · hunt (checks 1–21) · hunt 2 (checks 22–31) · layout · migrations · old flows · click everything.
Everything runs on copies of the data (scratchpad/backup-141 or a fresh backup) with the mock runtime. Real artifacts are never touched.
Main is published only after the gate is GREEN **and** Owner says GO.

## Design card: filled in BEFORE building anything (PT itself)

Every new PT feature or change starts with this card, shown to Owner in the change list he approves with GO.
Designing a cause out at this point costs minutes; finding it after a release costs a bug, a fix round and a re-test.

1. **What changes** for the person (one or two sentences, no code words).
2. **Causes it touches**: go through the 50 rows below and list every cause the change could bring back (new screen → 4, 5, 6, 7, 12, 26, 28, 30, 31, 36; new AI step → 2, 3, 8, 11, 13, 17, 20, 34; new stored field → 15, 24, 27, 32; and so on).
3. **How the design keeps each one out**, using the shared building blocks, never a local copy:
   runAI (ground rule, validate) · contentLang(p) · buildPrompt({proj}) · liveP after await · snapshot / actOpen / actGroup · youOpen / queueCounts / queueOf · nextId / uid · clampHTML · esc · menuFloat · boxHostNow / nearField · REF_IDS / data-anchor / goRef · refLabel · normalizeProject defaults · step() migrations · Store.
4. **Which check proves it**: an existing check, or a new check plus a planted bug in check_the_checks.py / check_the_hunts.py.
5. **Tools built in PT**: if the change affects how PT designs tools, which of the 29 failure-proof rules (src/v142_proof.js) it touches.

A change without a filled card is not built.

## Failure-proof rules for the tools PT builds (src/v142_proof.js)

The causes that apply to tools, not only to PT, are built into PT's own design steps, so every tool is designed against them while changing the design is still cheap:
- **Design**: the architecture step gets the rules that apply to this tool and must say, rule by rule, how the design keeps each failure out. The Design step shows a "Failure-proof by design" panel; a missing rule is open work ("Design them in").
- **Package**: the package is compiled with the rules and the designed protections, and must do them, not mention them.
- **Tests**: every rule a test can show gets at least one test (mode = rule id); missing ones are open work ("Write the tests").
- **Review**: a "Failure-proof" lens checks the package rule by rule.
- The 29 rules (1.7.0 adds: lean — the lowest credit cost that passes the tool's own tests; canary — a planted secret stops the tool, reader and actor never one part. 1.6.0 adds, for rebuilt products: nothing copied; for pages: permissions asked late · data where decided · no secret in the page; for scheduled tools: proof of life; for companies: zero autonomous spend; for web apps: money decided server-side; for media: capped and traceable): right language · outside text is never an order · AI results checked · nothing cut silently · failures visible · asks before acting · every repeat has a limit · stable identity · sources and dates · one truth per number · storage limits · only what each part needs · done is checked · safe to run again · as little data out as possible · a readable record · model and platform changes · screens that behave · honest tests.
- A new cause found in a tool → a new rule in PROOF_MODES (with strings in three languages), so every future tool gets it.

## Firnlab kits (1.6.0): rules they are built on (src/v160_kits.js)
- A kit is PT's knowledge and insistence for one kind of tool: official facts (dated, checked on the maker's pages) that the design and compile prompts get, decisions the person makes, steps the build brief adds with their checks, failure-proof rules.
- **PT recommends, the person decides** (24 Oct 2026): every kit decision is a queue item with options; the recommendation is starred with its reason; the rule behind the recommendation is deterministic code (`kitStorageRec`), never an AI guess.
- A kit decision waits in the one queue (`kitQueue`), so the Pick deck, the counts and Finish all show it; it blocks only once a package exists. Answering is one Undo step and one decision line; changing it marks the sections built on it.
- Workspace defaults decided once by the owner (`KIT_DEFAULTS`: pages start private, AI inside a page only where the job needs it, sources to `firnlab/tools/<slug>/`); a settings panel may change them later.
- The brief stays deterministic: kit steps come from the decisions, never from the AI; the report carries the live version id of every page as its restore point (`p.tool.versions`).
- Kit 1 covers pages (artifacts); kit 2 scheduled tools (engine: included scheduled task or Managed Agent with its cost named; results: page / issue / e-mail draft / sheet; watchdog for daily tools; PT's own radar = the weekly knowledge check, proposals only). Kit 6 covers AI companies (src/v160_company.js): a pasted master record goes through the background runner (long text, never into the chat prompt), rules become must-requirements with the record's ids, roles become linked employee tools (`p.kit.company`), founder questions block, contradictions are open questions; the founder gate is a page row + GitHub issue, Telegram only notifies; every agent a Managed Agent; the record per company (PT recommends, the founder decides). Kit 3 web apps (src/v160_webapp.js: hosting, payments, backend, login per app; build-or-use card against external builders; kit 3 wins over kit 1 when the home is a repository/web app). Kit 5 media (src/v160_media.js: images/video, voice, designed output per tool; private vs public line decides open models; hard cap CHF 10 per tool per month). Kit 4 phone apps (src/v160_phone.js: web app vs native via Expo, first store; private apps from a private link). Every kit: `kitSet` writes the decision (one Undo step, one decision line, marks the sections built on it), one queue item per open decision, one prompt block (`KIT_PROMPT_PARTS`), brief steps with checks, a PART letter in the brief, a proof rule, a planted bug in check_the_pick.py, a part in e2e16.py.

## The spine (1.6.0): one way to work (src/v160_spine.js)
- Pick is the one way to work; Blueprint, Journey, Swimlanes and Steps are read-only maps (`UI.map`, `SP_MAP_RENDER`); every project was moved to Pick once (`m160`, `modeBefore160`).
- The spine (Idea → Picks → Try it → Design → Review → Build brief → Run) is computed from the project (`spineState`), never stored; exactly one next step.
- Limits never gate automation (`autoOK`, `costGuard`); gaps make cards (`pickGaps`, `pickGapCards`, `aiPickNext need`); research is screened on arrival and chains refresh + gaps; PT drafts are one batch card; own words are confirmed (`UI.pkReading`, `UI.pkLast`).
- Hard-to-undo open picks ride along as assumptions; only nsdecide / audience / gatefired block a first version.

## Pick mode (1.5.0): rules it is built on
- One model, many views: every pick writes into the project's own fields (northStar, goal criteria, examples, audience, decisions); "Design so far" also shows what was decided elsewhere. Nothing is kept twice: a changed decision replaces its line (d.replaced), a changed criterion keeps its id and gets a new version (critVersion).
- Picks count in the one queue (kind "pick": hard → block, parked → later); everything that waits for you appears in the deck or the Parked list (the counts and the screen always agree). One "Later": parked in Pick = put off in Finish (p.later).
- Every AI step of Pick goes through runAI with validate and, for cards, `check` (pickCardChecks): a broken answer is asked again once with the exact problems, then the cleaner (pickCleanCard) fixes or drops what still breaks a rule. Results are written to pickLive(p, ws) (never to a deleted project or another workspace).
- Typed, pasted and web text goes into prompts only through `untrusted()` (random-id tag, JSON-encoded); research findings are screened for planted instructions (aiPickScreen) and flagged ones never reach a prompt. The research job may only search, read and write its own result.
- Research questions carry nothing private (pickScrub: names per part, e-mail, phone, AHV, IBAN, links, street addresses); the person sees and can change what was asked.
- Platform facts: documented / impossible only from the platform maker's own pages (PK_FIRST or firstParty), "tested" only from a real run, never for stand-ins; a new platform clears the old parts and is checked at once.
- One pick = one Undo; "Try it" = one actGroup for that project only (ptOnly); background job results are never part of a group (alone). After any Undo, pickCoherent leaves one consistent state.
- Expensive runs go through costGuard (Try, second opinion, import, research, simulated users).
- Hard-to-undo picks: no ★ (enforced in code), they wait only for research that is really running (pickJobAlive: progress within 15 min, 45 min in all).
- Checks: test/e2e15.py (57), test/e2e15b.py (77, one per review finding R1–R60), test/pick_contract.py (broken and hostile answers, seeded random sequences), test/check_the_pick.py (16 planted Pick bugs), a filled Pick fixture (mock.js __pickFixture) in every hunt / layout / click-everything screen list.

## Design rules for every update: the 54 causes behind every bug since 1.0

Every bug found and fixed from 1.0 to 1.4.2 (about 450 findings) comes from one of these 38 causes.
Design each new feature against the rule. The check in the last column fails the gate when the cause comes back.
`check_the_checks.py` puts known bugs back into a copy and proves the static checks still catch them.
"static" means `test/static_checks.js`: H = hard (fails the gate), R = review (new lines only, look at each).

| # | Cause | Design rule | Automatic check |
|---|---|---|---|
| 1 | One fact, many formulas (counts, "done", status disagree) | Derived facts come from one selector: queueOf, queueCounts, youOpen, blockingItems, stepInfo. Views never filter item lists for counts. Never store a derived "done"; a step with a blocker in the queue is never "done" (stepInfo asks the queue). | static H `count` (own open-work formula); hunt 17 (done = no blocker); hunt2 26 (Finish button = steps = totals) |
| 2 | AI does not see what it needs (context cut) | Never cut AI input silently. The context builder keeps the targets whole and names what it left out; `trunc` marks every long cut with "[… n more characters not shown]". | static H `cut` (trunc keeps the marker), R `cut`; hunt 18 |
| 3 | AI answer not checked | Every runAI with JSON passes `validate:`. Fields go through a whitelist. Empty never overwrites filled. Verdicts use `=== true`. | static R `validate`, R `verdict`; hunt 18 (empty / junk / wrong shapes) |
| 4 | Boxes overlap, clip or cover | Menus and popovers open in the top layer (menuFloat). Status goes in a grid slot, never `position:absolute` over text. No raw z-index. | static H `layout` (menuFloat), R `overlap` (new absolute / fixed / z-index); hunt 11; layout141 |
| 5 | "Go to" lands nowhere | Every place an item is shown has an id from REF_IDS or `data-anchor`. Only goRef navigates. | hunt 14 (every kind × every mode); static R `goto` |
| 6 | A render destroys typed text, cursor or open panels | Every box is bound to state or a draft. The render keeps focus, cursor, scroll and every panel you opened (detailsReopen; menus excepted). | hunt 16 (typing survives a render, cursor kept) |
| 7 | The screen moves without you | Background work never scrolls, changes the step or reorders a visible list. Progress lives in the tray and status bar. | static R `move` (scroll / setPhase after an await); hunt2 23 (renders, save state, going online move nothing) |
| 8 | Wrong language in content | Content language = `contentLang(p)` of the task's own project. `buildPrompt` gets `proj:`, or says `userLang:"viewer"`. | static H `lang` (`contentLang()` without p; buildPrompt without proj); hunt2 27 (screen ≠ project language) |
| 9 | "Who did it" recorded wrongly | Every change goes through one recorder with `by: you / PT`. An accepted suggestion stays "suggested by PT". | hunt 5 + 6 (each action is one Undo) |
| 10 | Open work buried | Each step shows Needs you / To check / Done from the queue. One main button. | hunt 17; hunt2 26 |
| 11 | Stale copy after a wait | After each await, re-read the project (liveP) and write only into the task's own project. | static R `stale`; hunt2 28 (switch project mid-answer) |
| 12 | A click does nothing, or no way to "done" | Every button changes something you can see, or it is not shown. Every blocker has a resolving action. | hunt 1 (handlers exist); hunt2 24 (every visible button has a visible effect); monkey141 |
| 13 | Endless AI loops, runaway cost | Every generator has a cap and a stop rule. Big runs ask first (cost guard). | static R `loop` (AI loop without a named cap) |
| 14 | Built not as agreed | Decisions are written down verbatim. Nothing is built or published without GO. Every changelog line has a test. | release gate + GO (manual) |
| 15 | Ids reused or taken from position | Ids come from a counter that only goes up (nextId / uid), never from length + 1 or the AI. | static H `ids`; hunt 21; hunt2 29 (unique ids) |
| 16 | A change marks too much or too little | One link graph and one change engine; only direct dependents, only on a real change. | unit14 §4 |
| 17 | Undo takes back the wrong thing | Every change is one action (snapshot / actOpen); several steps are one actGroup. | static R `undo`; hunt 5 + 6 |
| 18 | One feature built twice, the later one wins | Delete the old version instead of overriding it. One name, one definition. | build.py (duplicate functions); static H `names` (duplicate string keys, top-level names), H `wrappers` |
| 19 | Strings and locale | Text only through t(key) in 3 languages; ss, du, Simplified Chinese; words matched with boundaries. | static H `strings`, R `du`, `plural`, `regex`; i18n14; hunt 9 |
| 20 | Measuring the harness instead of the tool | A measurement runs the tool's prompt exactly as it will run (PT adds nothing: `ok:rule`) and says "not measurable yet" when it cannot. | static H `rule` (every AI call outside runAI must say why) |
| 21 | Silent failure | No empty catch without a reason (`ok:catch`). Saves retry and say "Not saved yet · Retry". | static R `catch`; hunt 19 (failed load writes nothing); hunt2 31 (failed save is shown and retried) |
| 22 | PT decides without asking | Only easy-to-undo choices get a ★; hard-to-undo ones never. Destructive actions are never the main button. | unit14; manual review |
| 23 | A fix written to the wrong item | Problems carry checked targets; a fix applies only to them. | hunt2 29 (targets exist); migrate14 |
| 24 | Saving loses or overwrites data | Every new field has a template default; saves go through Store and are merged per field. | hunt 4 (save + reload); static R `field` |
| 25 | Preview acts like main | Live actions are blocked in the preview (PT_PREVIEW). | static R `preview` |
| 26 | Text cut | Never cut stored text. Show long text with clampHTML ("more"). | static R `trunc`, `cut`; layout141; migrate141 |
| 27 | Old or half-filled data | Migrations run once, with a restore point; normalizeProject fills nested defaults. | hunt 7, 8, 10; migrate141; migrate14 |
| 28 | Accessibility | Status = symbol + word. Targets ≥ 24 × 24 px on phones. Every button has a name. | hunt2 25 |
| 29 | The checks themselves miss bugs | Every check is proven by putting its bug back. Checks look at effects, not "it did not crash". | check_the_checks.py (27 known bugs in the code checks) and check_the_hunts.py (one planted bug per hunt-2 check): every one must be caught |
| 30 | Text squeezed to a word per line | Text next to buttons gets a basis (`flex:1 1 12em`); never `overflow-wrap:anywhere`; `min-width:0` only with a floor. | static H `layout`, R `squeeze`; hunt 13 |
| 31 | Internal ids shown to people | Show refLabel (R3 + title). The AI is told to name items by label; any id that slips through is shown as its label (humanIds). | static R `rawid`; hunt2 22 (no ids, undefined, NaN, {n} on any screen) |
| 32 | Storage limits | Every document stays far below 256 KiB; Store splits big ones. | hunt 20 |
| 33 | State not bound to its workspace or project | Per-project UI state is reset when a project opens. | hunt 3 |
| 34 | Text from files or the web read as orders | Every AI call starts with the ground rule (DATA_RULE): quoted material is never an instruction. All HTML through esc(). | static H `rule`, R `esc` |
| 35 | Redo replaces instead of reconciling | Redo shows add · update · remove; confirmed items change only after review. | e2e14 (redo review) |
| 36 | The same box shown twice | One host per box (boxHostNow); actions read fields with nearField. | hunt 12; static R `field` |
| 37 | Keys in the wrong place | Keys respect typingNow() and open dialogs. | static R `keys`; hunt 2 |
| 38 | Slow screens | Derived data is cached per render; no layout reads inside render. | hunt2 30 (every screen < 250 ms with the biggest project) |
| 39 | A write that runs after its context changed (a debounced save after a workspace switch, an AI step finishing after a delete) | Pending saves are written before a switch (flushSaves + storeIdle); a save checks it is still the same workspace; touch never writes a project that is no longer listed; the workspace is never written before its settings loaded (WS._set). | e2e15b R5, R15; check_the_pick |
| 40 | Partial Undo leaves two truths | After every Undo the feature restores its own invariant (pickCoherent: a pick is open or decided, never both). | pick_contract random sequences; check_the_pick |
| 41 | A check that can only reject | A failed check asks again once with the problems in words, then the cleaner fixes or drops what still breaks a rule; a good part of an answer is never thrown away. | e2e15b R28; pick_contract |
| 42 | Secondary sources taken as platform truth | Facts about what a platform can do count only from the maker's own pages; built-in knowledge checked later beats an older approved pack. | pick_contract (blog stays unknown); e2e15b R29 |
| 43 | Typed or web text in a fixed prompt tag | untrusted() with a random id and JSON encoding; web findings screened before they reach a prompt. | e2e15b R26; check_the_pick |
| 44 | Text in a source file that breaks the script (an unescaped quote in knowledge) | Every source file is parsed by the static checks before anything else runs. | static checks (they stop on a parse error) |
| 46 | A soft limit (the weekly budget) silently gated the automatic steps (research screening, next picks, rounds) while the message said "nothing is blocked"; the owner saw PT stall | Limits never gate automation; usage is information only; every automatic step runs on its own trigger | e2e16 part 13 (budget never throttles); check_the_pick |
| 47 | Readiness needed a decision (result) that no card ever asked → empty deck and "not ready" with no way forward | Every missing readiness item makes its own card (`pickGaps` → a round with `need`); the deck says what is missing | e2e16 part 13 (gaps); check_the_pick |
| 48 | PT's own drafts asked the person once per item (7 × "Keep it") | One card per batch of PT drafts in the deck; items only when unclear | e2e16 part 13 (batch); check_the_pick |
| 49 | Typed words vanished with the card and nothing showed what was recorded | The card shows PT reading the words and keeps the text; a strip shows what was recorded with Undo and Change; a failed read says so | e2e16 part 13 (own words); check_the_pick |
| 50 | Automatic steps (trial cases, trial run, engine suggestion, mini-test) wrote into the project without an action of their own — Undo could never take them back; the budget gate had kept them off in every test since 1.4, so nothing saw it | Every automatic step opens its own action (`snapshot`) before its first write; hunt 5 undoes everything a click set off and waits until PT has been idle for half a second | hunt 5 |
| 51 | A view switch (Karte · Bauplan) lived in the status line at the bottom and swapped the body under another screen; it did nothing visible and sat in the wrong place | A view is never a toggle under another view: the Bauplan is the body of the Design page; the mode bar is gone; every station is a page with the same three blocks | e2e17 parts 1–3 (pages render, Bauplan content on the Design page, no mode bar) |
| 52 | Seven kit decisions appeared at once on an old project, before the design existed | Kit decisions wait for the design station; the deck shows one at a time; the Design page lists them all | e2e17 part 5 |
| 53 | "Fix automatically" ended with a count; nothing showed what changed | The done screen lists every change before→after with "that's what I meant" / "change it" and what PT suggests next | e2e17 part 6 |
| 54 | Facts (prices, legal lines, platform rules) carried no date; an old fact read like a fresh one | Every fact block, kit option and prompt names its check date; older than 90 days is flagged on screen, in prompts and briefs | e2e17 part 8; check_the_checks (planted: a stale date not flagged) |
| 45 | A decision written before its Undo step opens (the field is created, then the step starts) splits into two steps; a decision kept under `tool` (outside the diff) cannot be undone at all | Open the action before the first write; decisions live in diffed fields (`kit`, not `tool`); one planted bug per new decision | e2e16 (one decision line, one Undo step); check_the_pick |

## Bug classes found in 1.4.1 and the check that now catches each

| Bug class (seen in 1.4.1) | Caught by |
|---|---|
| String missing in a language, placeholders differ, ß, Traditional Chinese, "1 rules", formal "Sie" | static_checks 1 (hard + review), i18n14, hunt 9 |
| Button/handler named in markup but never defined | static_checks 2, hunt 1 |
| Wrapper around a function or action that no longer exists | static_checks 3 |
| User text cut with "…" instead of shown in full / "more" | static_checks 4a (new lines), layout141 |
| Value into HTML without esc() | static_checks 4b |
| Global key works while typing, or while a dialog / page / palette is open | static_checks 4c, hunt 2 |
| AI result applied without a PT action → Undo hits the wrong thing or only part | static_checks 4d, hunt 5 |
| Several AI steps (batches, "do all") → Undo takes back only the last | hunt 5 (use `actGroup(fn)` for multi-step) |
| Undo toast after nothing changed / for an old action | static_checks 4e, hunt 6 |
| New project field lost on reload or not restored by Undo | static_checks 4f (review), hunt 4 + 5 |
| Word regex without boundaries ("iframe" → "rame", 当前 → 前) | static_checks 4g |
| UI state (panel, filter, selection, editor) leaks into another project | hunt 3 |
| Screen crashes on old / half-filled / empty data | hunt 7 + 8 (normalizeProject merges nested defaults) |
| One-time migration runs twice or changes things a second time | hunt 10, migrate141, migrate14 |
| Layout: sideways scroll, button under the status bar, clipped text | layout141 |
| Any button on any screen at any level throws or breaks the screen | monkey141 (click everything) |
| Old flows broken by new UI | e2e14, e2e13, e2e12_on14, smoke14 |
| A menu near the end of a list or panel is cut off (1.4.2) | hunt 11; static 3b (menus must use menuFloat, the top layer) |
| The same box shown twice (list + inspector), so PT reads the empty copy (1.4.2) | hunt 12 (no duplicate ids, incl. a box opened from the inspector); static 4h (read fields with nearField) |
| Text or buttons squeezed to one word or letter per line (1.4.2) | hunt 13 at 1440 / 1024 + inspector / 390; static 3b (overflow-wrap:anywhere banned) |
| "Go to" / "Go through" lands nowhere in some modes (1.4.2) | hunt 14 (every kind of open item × every mode); static 4j |
| "You are here" shows progress instead of where you are (1.4.2) | hunt 15; static 4i |

## 1.7.0: the cover and the seven pages (src/v170_pages.js), honesty (v170_honest.js), more (v170_more.js), build (v170_build.js), vault (v170_vault.js)
- Seven stations = seven pages (idea · picks · try · design · review · build · run), each with *what PT did · what you decide · next*; one cover above them (summary, open questions, the filled track, the quality spider, one next step, the inbox link). The first three pages share the Pick screen; the steps behind every page are its "all details". A step ref opens its page with the details open; an item ref lands in view (or the inspector). The mode bar is gone; the old views stay reachable for items and the older tests (`modeBefore160`).
- Honesty as code: `FACT_DAYS = 90`; `factChip`, `factsBlock` (Check page), `honestyPromptBlock` in every design/package prompt, kit options carry their date. Source ledger per domain (`WS.settings.sources`), filled by the screening, shown on the Check page, a bad domain marked on its findings.
- Cost card (`costPlan`, PART L, rule `lean`, always on) and security card (`secPlan`, PART M, rule `canary`): the seven credit rules and the four security layers made concrete per part; a part that reads outside content and acts outward is flagged to be split.
- Attack drill (`aiRedTeam`, task `redteam`): six judged cases of five kinds against the package; undefended ones are queue items (`rt`) with "fix as requirement" / "accept the risk"; due weekly when live.
- Tappable mock (task `mock`): sandboxed iframe (`allow-scripts`), "yes, that's it" / "no, like this" are decisions; the design pass (`designPass`) chains picks → first version → design → review and stops at hard decisions; learn from use (`learnGroups`) turns repeated failures and new input kinds into queue items; PT health is a Settings tab; kit defaults (sharing, AI, repo, media cap) are editable.
- Build page: `buildIssue` (GitHub issue labelled build with the brief; the Action template is `vault/claude-build.yml`), laptop tasks (`personSteps`, `laptopTaskText` with the gate rules; REA guardrails), PART N (devices), PART O (vault tools). Company: free infrastructure until launch, no Telegram anywhere.
- The vault: `vault/vault.json` (25 tools chosen by the owner), `tools/vault_mirror.py` + `vault.yml` (monthly: pin, checksum, licence check, release assets, `vault/lock.json`); `VAULT` is injected at build time.
- Checks: e2e17 (86), `tests parse` (every test script compiles with warnings as errors), the quick gate on GitHub runs e2e15/16/17 and the Pick contract on made-up data (`test/fixtures/synthetic.json`, built by `tools/make_synthetic.py`). Proof rules: 29.

## Review items
`static_checks.js` lists "review" items only for lines that are new since the last release (baseline = highest `src_vNNN_backup`).
Look at each; fix it, or mark the line `// ok:<check>` when it is fine.

## Layout rules (1.4.2)
- Menus are `<details>` with a `.menu` child: they open in the top layer through menuFloat(); never position a menu with overflow tricks.
- Never `overflow-wrap:anywhere`. Rows wrap; buttons and chips keep their natural width; text next to them keeps a readable minimum.
- Narrow areas are handled by container queries on the main area and the inspector (two columns become one), not by window width alone.
- An item's edit/ask/refine box is shown in one place only (boxHostNow); actions read fields with nearField(el, …).
- Every place an item is shown needs an id from REF_IDS (ir-<ref> by default) or data-anchor="<ref> …"; goRef falls back to the full step, then the inspector.

## For a new feature, add to the checks
- Read the 50 design rules above first; the review items in `static_checks.js` point at the rule a new line may break.
- A new bug class → a rule in the table, a check, and a mutation in `check_the_checks.py` that proves the check catches it.
- New AI action → it must open its action after the result (`snapshot(p, label)`); several steps → `actGroup`.
- New project field → default in the project template (normalizeProject fills it, also nested), add it to DIFF_SKIP only if it is volatile.
- New key → respect `typingNow()` and `UI.modal || UI.palette || UI.capture`.
- New UI state on `UI.*` that belongs to one project → reset it in the openProject wrapper (v141_levels.js) and add it to hunt 3.
- New migration → `step()` blocks, a restore point, marker so it runs once; add it to hunt 10.

## After each release
1. `cp -r src src_vNNN_backup` (new baseline for the next diff, e.g. src_v142_backup). check_the_checks.py uses the newest one.
2. Fresh data backup for the tests if the data changed a lot.
3. Note version ids (main + preview, the one before for restore) in BUILD-LOG and in `releases.json` (the release workflow tags and releases from it).


## Inbox triage (1 Nov 2026)
- `test/triage_test.py` (quick gate): secret-in-issue (three token kinds removed, owner's issues too), stranger issue (untrusted), hostile issue (markers flagged, text kept as data), duplicate (near-identical titles, never itself), unclear kind; includes its own planted bug (removing the GitHub-token pattern must let the token through).
- Cause 55: an issue on a public repository can carry a pasted key or instructions aimed at an agent → triage removes keys at once and never interpolates issue text into a workflow or writes it to the public log.
- Cause 56 (1 Nov 2026): a pull request opened by a workflow with its own token starts no other workflow, so required checks never report and the PR stays blocked. Every workflow that opens a PR also starts `quick-gate.yml` on that branch with `workflow_dispatch` (the documented exception).
- Cause 57 (1 Nov 2026): the vault lock file copied the first line of a licence, which carried a contact e-mail address; the data guard (correctly) blocked the PR. The mirror now masks e-mail addresses in licence heads; the ALLOWED list stays untouched.
- Cause 58 (1 Nov 2026): a second vault run on the same day failed because the release tag and the PR branch already existed. Releases now get -2, -3 … (earlier ones are kept, never overwritten) and the branch carries the time.

## 1.7.1 (1 Nov 2026)
- `test/e2e171.py` (full gate and quick gate on made-up data): a real tap counts once (button, choice, sent form); PT's own programmatic clicks and typing are not taps; typing makes the minute active, each minute once; per-project counts; the day document sits at `<workspace>/metrics-<day>/<tab id>` (one writer per document) and holds only numbers, dates and PT's action names, never typed text; the Health tab shows the row in three languages; the empty second workspace is found by place and named on its card; any earlier `keep…` flag still counts; Keep hides the card; kit sharing sees other workspace names.
- Cause 59 (1 Nov 2026): replacing the two first names with "Owner" / "Second owner" for the public repository also changed code that found or named a workspace by a person's name (the empty-workspace card looked for a name no workspace had; the keep flag got a new name, so a kept card would have come back; new first workspaces were called "Owner"). Rule: no person's name in code — workspaces are found by place or id, names come from the data. Static check `person` (hard) with a planted bug in `check_the_checks.py`.

## 1.8 look (1 Nov 2026)
- `test/e2e180_look.py` (real-data copy and made-up bundle): light by default (new workspace, the screen before a workspace opens, the one-time "system" → "light" step, an explicit "dark" kept, "system" still choosable and following the device); WCAG AA contrast of text, links, chips, status pills, labels and controls in light and dark (a sample of every variant plus a scan of the Cockpit, cover, picks, review, run and Health screens; the scan proves itself on a planted faint text); pills and one big main button; no web font requested; status = glyph + word; two-tone navigation icons with their word at 1440 and 1024 px; the Live line and PT's real rollback behind it (never a fake Undo); "Claude drafted this · you decide" and "We assume … — change" in three languages; no hover lifts or glows; reduced motion fades only; Health sparklines; no sideways scroll at 1440 / 1024 / 390 px in three languages (planted wide box found); 44 px targets on a phone (planted small button found); no page errors.
- `test/static_checks.js`: the CSS rules (no `overflow-wrap:anywhere`; review of new absolute/fixed positions, raw z-index, squeezing and fixed-height cuts) also read `src/styles18.css`.
- Cause 60 (1 Nov 2026, found while restyling): two unrelated `.chk` rules collided since 1.0 (a check card and a checkbox label), so every checkbox with its words was drawn as a bordered card with the box above the words. Rule: a class name means one thing; `label.chk` is a plain row. Checked in `e2e180_look.py`.
- Cause 61 (1 Nov 2026, found while restyling): the PT health tiles of 1.7 used classes (`pt-tiles`, `pt-tile`) that had no style, and the usage number was shown unrounded ("2528.000000000001"). Rule: a new class gets its style in the same change; numbers on screen are rounded where they are made. Checked in `e2e180_look.py`.

## 1.8 checks, fixing and facts (src/v180_checks.js, 1 Nov 2026)
- `test/e2e180_checks.py` (quick gate; real-data copy and `test/fixtures/synthetic.json`): quality areas ticked per tool, all preselected, stored with the project, floors for tools others use; check rows for private tools (every lens and gate that applies is a row you tap, never applied or skipped by PT, no tap for all, honest assessment both ways, your earlier choice as the next ★, early pruning); a check runs only once applied and the review seal counts the applied lenses; fix until green (repeat stop with before → after, cap 5 with the residual risk, whole passes in Fix automatically, one restore point); tests 3× / 5× outward, pass only when every run passes; facts by type (20 / 45 / 180 / 90 days), past budget not used and said so (prompts, kit options, research, Check page); Undo, save + reload, old projects, three languages, no page errors.
- Planted bugs in `check_the_pick.py` (row applied without a tap, outward tool tested 3×, repeated fix tried again, no residual risk at the cap, one 90-day rule again) must turn e2e180_checks red; `check_the_pick.py --only=<text>` runs a part of them.
- Cause 62 (1 Nov 2026): `check_the_pick.py` counted a test as green only on "failed: 0"; e2e17 prints "N ok, 0 failed", so every planted bug aimed at e2e17 read as caught even when e2e17 stayed green. The runner now reads both forms; new suites print "ok: N failed: M page errors: E".
- Cause 63 (1 Nov 2026): one constant for a rule that is decided per tool or per type (TRIALS = 3 for every tool, FACT_DAYS = 90 for every fact) → the rule is a function every caller goes through (`chkTrials(p)`, `factStale(d, type)`); the queue, the stage gate, the cost estimate and the run read the same function.
- Cause 64 (1 Nov 2026, found while building 1.8): a `//` comment inserted in the middle of a line swallowed three statements (`sum.fixed += …`); the file still parsed, so the parse check stayed green. `static_checks.js` now fails on statements after a `//` comment (opt out with `ok:comment`); planted in `check_the_checks.py`.

## 1.8 deciding (src/v180_decide.js, strings13.js)
- ★ on hard decisions too (pickCleanCard keeps the AI's ★, the prompt asks for a first-person suggestion); a hard pick is never pre-selected and never taken by itself: `pickStarable`, the design pass and Enter skip it, and `pickAnswer(…, {assumed: true})` refuses it (three layers).
- Your call first on money / who sees it / where data lives (pick targets money · audience · data, hard picks with those words; queue kinds kit-storage · kit-record · kit-backend · kit-host · kit-pay · kit-login · kit-rebuild · audience): no ★ anywhere (card, cover rows, Finish) before the owner's own answer (`pick.call`, its own Undo step); then the ★ with "I'd pick … : reason"; both answers and whether they agreed are kept in `pick.calls` (and `e.call` on the decision); the overview counts the agreement. `PK8_QO` = the options with their ★ before it is hidden (tests read the ★ there).
- 5 cards per round (`aiPickNext` without `need`); gap rounds keep asking for exactly what is missing. Readiness = idea · result · no hard pick · platform; the measure is still asked (`<measure_not_decided>` in the pick context) and shown as optional.
- Start (1.8): Start switch per idea (`pick.start`: fast / questions) → three questions before any research (`from: "start"` decisions) → research + risk check (`pick-risk`) → a quick technical try when the risk is technical (job kind `spike`, ≤ 2 h, only tries) → the mock (drawn from idea + answers + research + the try) → "yes" / "not like this" / skip is the first decision (`pick.mfMock`) → the first round. Only projects whose owner presses Start in 1.8 enter it (`pick.mf`); older projects are untouched.
- An existing product: the price is read on the maker's page by the research job (`pickres`, mode `price`) before the four routes show; the routes carry the price and its date; no runner → the routes show at once with "price not checked: …". The Bauplan on the Design page is folded (`UI.pk8Map`, screen state) until one click opens it.
- Checks: `test/e2e180_decide.py` (real data and made-up data), updated e2e15/15b/16/17 and the Pick contract; check_the_pick: seven planted 1.8 bugs (★ before your call, measure required again, picks before the mock, technical risk without the try, three cards a round, routes before the price, Bauplan open) plus "a hard ★ taken by 'take all ★'" (replaces "a hard pick gets a ★", which is now the decided behaviour).
- Cause 65 (1.8 deciding, 1 Nov 2026): the 1.7 mock prompt asked `projectContext` for parts named `ns`, `req`, `arch`, which do not exist, so the mock was drawn without the project (only the requirements in the body). The mock now names the real parts; e2e180 checks that the idea and the decisions reach the mock prompt.

## 1.8 running (1 Nov 2026, src/v180_run.js)
- `test/e2e180_run.py` (real-data copy and made-up bundle, fake clock via Playwright `clock.set_system_time`): Zürich time (Sunday 14:00, winter and summer time, the day the clocks change); the Sunday note is built once when PT is open on/after Sunday 14:00 (not on Saturday), stored per login under `<workspace>/sunday/<date>`, kept with every past note, and holds what changed per tool, the block-tier rows that wait (their only reminder), declined decisions whose condition came true with the reason, drill results (clean = one line, finding = block card), what the inbox closed by itself (reopenable) and your time; it is cut at ten minutes of reading (the rest folded, nothing dropped) and skipping it changes nothing; the Sunday preparation run is never created by itself, one click creates it (Sunday 12:41 Zürich, `initiation: human_request`, a text that publishes, deletes and reschedules nothing) and one click pauses it; the second login is not offered it; inbox: kind, reporter, tool + version, duplicates / already fixed / noise close themselves (reopenable), a stranger's real report waits and is never included, text aimed at an AI is flagged, trust learns from Reopen / Not real and resets; the report shape v1 is stored and its status goes back ("received" → "planned for vX" → "fixed in vX"), also through the collect run's `statusBack`; report text reaches an AI step only under the ground rule; a live tool's due drill runs by itself on opening, its findings are block rows and hard queue cards PT never takes (also not in "all like this"); a drill from the Sunday run is applied once; a repeated failure makes PT prepare the next version with its change list (no update run, nothing live); the Build page opens the GitHub issue first (exact text, `@claude build`) with the cloud build second; laptop tasks stop only before a payment and always report in three lines (three languages); no page errors.
- Report shape v1 (shared with the tools PT builds): `{v: 1, id, kind: "bug"|"idea"|"question", tool: "<PT project id>", toolVersion, text, by: "owner"|"second"|"user"|"stranger"|"agent", at, status: "received"}` in the tool's own collection `reports` (PT's own: `<workspace>/reports/<id>`); PT writes back `status: "received"|"planned"|"fixed"|"closed"`, `fixedIn`, `statusAt`.
- Cause 66 (1 Nov 2026, integrating 1.8): a template string evaluated while v180_run.js loads read a `const` of the later file v180_kits.js; `typeof` does not protect a const before its line runs, so PT stopped at boot. Cross-file values are read through functions at call time. Caught by every flow test (no first screen).

## 1.8 the cone (src/v180_cone.js, strings15.js `cone.*`)
- Start switch per idea: kinds of tool first (the cone, default for a new tool) · questions first · fast (straight to the mock, as before). The cone is the stage `cone` of the 1.8 start (`pk8Stage`); when a kind is taken the start goes on (research, risk, mock first, picks); "skip" goes straight to the mock.
- One sentence → 6–8 families of a tagged catalogue (37 shapes, TREE-1.8 directions A–L; AI task `cone`, checked: known families only, at most 8, never padded; spans that are not in the sentence become "we assume"; no AI → the sentence's own words, said so). Cards: sketch, what you get, for whom, AI or not, cost, time, acts outward, checks ("n to tap" / "n, all on").
- One question at a time: who it is for first (me / others / customers / me and others / not sure), then the biggest expected cut, until one or two kinds are left or no question tells them apart; pre-filled from the sentence (words underlined) or an earlier decision; your choice on your last tool as ★ ("you chose this last time"), still asked. Every answer has a reversibility badge with a number. "Me and others" / "not sure": private first, portability on, nothing defaulted away (hatched).
- The gallery shrinks ("n of 37 shapes cut"); cut cards fold into "Removed (n)" (`.fold18`, a fade with reduced motion), greyed and tappable (why + "change that answer"). PT's ★ only after every card was in view (≥ 1.2 s) or on tap, hedged, first person.
- D pick then verify: who it is for + only the questions that could rule the pick out; an answer that rules it out says so and drops the pick. E say the ending (AI task `cone-say`): the nearest kind or a new kind marked unverified.
- The kind taken: `p.cone.ending` (with the checks it brings) joins `chkSignals` / `chkOutward` (an outward kind tests 5×); the answers and the kind are rows `cone:<aud|out|where|when|ending>` (ROW_SOURCES) and reach every prompt as `<kind_of_tool>`.
- 1.7 tools: the offer (cover, Pick page, `coneOffer(p)` for Health's day-one screen), re-run once (`coneRerun(p)`), "no thanks" once (`coneDismiss(p)`); an answer that differs from an earlier decision (`p.audience`) waits for keep / replace.
- Checks: `test/e2e180_cone.py` (real data and made-up data; quick gate on the made-up data); updated e2e15, e2e15b and e2e180_decide (their new tools choose "fast" to test the mock-first start); check_the_pick: ten planted cone bugs (`--only=e2e180_cone`).

## 1.8.0 integration (1 Nov 2026)
- Cause 67 (speed): the check rows, the queue, the run count (3 or 5) and the cost line each read the whole tool text again (`chkOutText`, a long regex), many times per screen; with the biggest project some screens took more than 250 ms on a loaded machine (hunt 2, check 30). Now `chkOutText`, `chkOutward` and `chkSignals` are kept for one screen (`CHK_MEMO`, a WeakMap made at the start of `renderInner` and dropped at its end; outside a screen nothing is kept, so a change is seen at once). Check: `e2e180_checks.py` section 9 counts the reads per screen.
- Cause 68 (squeeze): the 1.8 look turned the status icon into a word (a pill, about 90 px). In the narrow step column (1024 px with the inspector) a queue row then left about 44 px for its text (one word per line), and the three tool states in Release got about 76 px each. Now a queue row puts its buttons on the next line when the text would get less than 12em, and the tool states go two per line when the column is narrow (`styles18.css`). Check: hunt 13 (it found it).
- Hunt 5 (Undo) read a half-finished chain: after a click PT's automatic steps start 300 / 600 / 900 ms after the step before, and a research job may still be on its way; the hunt took "idle for half a second" as the end, then blamed Undo for the step that came after (engine `suggestAt`, a research inbox item). With 1.8's slower screens this happened in two gate runs. Now the hunt waits for 1.2 s of quiet and for the jobs the click started (at most about 11 s). Run alone with a longer wait the same check is green, and nothing is called after the Undo.
- Check the Pick tests, "kit decisions come all at once before the design": since 1.8 the planted-bug runner reads e2e17's "N ok, 0 failed" line correctly, and this planted bug turned out to have read as caught only because that line was not understood. Every kit also needs a design (`kitApplies` and the kit 2–5 checks want components), so with the 1.7 wait-for-the-design wrapper removed nothing changed for the test's new project (no kit applied to it at all). Now the test's new project already has a page as its home (every kit would apply) and the planted bug removes both guards; caught.
- CI (quick-gate, the made-up bundle) found what the local gate (real-data copy) could not: the Health test's security check took a drill as due for any live tool, but in 1.8 a private tool's drill is a check row, listed only when the tool takes in outside text and due only once applied. The real data's tool was shared (today's behaviour), the made-up one private and reading nothing. PT is right; the test now gives its tool web input, applies the row and checks the drill is on before it expects "act". Lesson: before a publish also run the quick-gate list on `test/fixtures/synthetic.json` (it was red on this branch since the merge and not looked at).
- The health test expected "no cone offer" because the cone was not merged yet; with the cone in 1.8.0 it now checks that the cone is connected, that switching it off hides every offer, and that her first day offers it once.
- 1.7.1 was not published on its own: it is all inside 1.8.0 and its tests run in the 1.8.0 gate (the machine has two CPUs; two gates at once made both too slow to finish).

## 1.8.1 (1 Nov 2026)
- Cause 69 (a platform rule PT did not know): the scheduled-task service refuses `notifications` on a task that does not start a new session on every run ("create_trigger: notifications only applies to triggers that start a new session each fire. Set create_new_session_on_fire=true, or omit the notifications param"). PT sent `notifications: {}` when it created a task (the Sunday preparation run, a second login's runner), so turning the Sunday run on failed for the owner on the first try. Mock tests could not see it: the mock accepted any input. Now every creation goes through `Runner.create`: it asks for a new session per run (right for PT's runs), tries once more without `notifications` and the flag only when the service refuses those settings, shows any other refusal as it is, and never runs in a preview copy. The mock now applies the service's rule. Checks: `e2e180_run.py` section 5 (first call, fallback, other refusal, second login's runner); two planted bugs in `check_the_pick.py`.
- Lesson: a connector call PT has never made for real is unverified until the owner's first try; name it as such at publish (1.8.0 did, and the first try found it).

## 1.8.2 (1 Nov 2026)
- Cause 70 (the next platform rule): with 1.8.1 the service accepted the new-session setting and then refused with "create_trigger: no session_id in auth claims, so cannot inherit environment_id from the calling session. Pick one of these environment_ids: - env_… ("Default", active)". A task created from a page has no Claude session to take its cloud environment from. `Runner.create` now takes the environment the service lists (the one used before if listed, else the first "env_…", else the first) and remembers it per login (`META.envId`). Proven before the gate with a one-button test page that sent exactly this request from a page: try 1 refused as above, try 2 with the listed environment accepted, switching off worked; the dummy task was deleted.
- Found with it: a task created this way starts without automatic approval, so an unattended run would stop at its first step. PT cannot ask for automatic approval; the "is on" message, the Sunday switch line (until a run has worked) and the runner setup message now tell the owner to turn on "Automatically approve" in the task's settings.
- Checks: `e2e180_run.py` (environment from the list, remembered, a gone one replaced, a pool only when it is the only choice; the hint); planted bugs in `check_the_pick.py`. The mock applies both service rules in the order the service does.
- Lesson: a connector write PT has never made for real gets a one-button live check before a release depends on it (minutes, not a 4-hour gate per guess).

## 1.9 fleet: update all of your tools when a kit changes (src/v190_fleet.js, strings20.js `fleet.*`)
- `test/e2e190_fleet.py` (real-data copy and `test/fixtures/synthetic.json`): Health › My tools and Settings › General (kit defaults) say "n of your tools are behind kit x.y" with one button; nothing starts without its click (also not on opening PT); the put-live card (republished in place one after another, acceptance lines per tool, every previous version restorable, stops at the first problem, cost as an estimate, other people's tools "they publish it themselves", undo clause restores / keeps / cannot know, Start not focused); one tool at a time with the existing update job (kit, acceptance lines, pages, previous versions; instructions: republish in place, live check twice in a row, previous version back on a red); a restore point before each tool; green = verified AND the last two live checks passed → kit and page version stamped, the version row's event names the kit run and the restore point; red → stop (previous version live, the rest wait without a job, Inbox and Sunday-note line with tool and why); one green only is red; Continue (the same card); Cancel keeps what is done; the run lives in `WS.settings.fleetRun` and goes on after a reopen; other people's tools only prepared; a preview copy has no button, no run, no job; release stamps; three languages; phone width; no page errors.
- Planted bugs in `check_the_pick.py` (`--only=e2e190_fleet`): one green enough, goes on after a red, another person's tool republished, starts without the card, a stored run not resumed, a preview copy runs it, Cancel lets the waiting tools start.
- The mock: `JOBRES.update.smoke` (two passing live checks), `window.__mockUpdate(job, result)` (a red or a single green, versions) and `window.__mockHold` (an update stays running until the test writes its result).
- The kit version: no part of 1.8 defined `KIT_VERSION` (only e2e180_health set it), so "behind the kit" was never measured live; 1.9 falls back to 1.8.0 (`hr18KitNow`). A first release stamps its kit; a later release of a tool with pages or scheduled tasks keeps its kit (an update changes only what changed); a tool with nothing to republish gets the current kit with each release.
## 1.9 care: the owner's reminders R1, R2, R3, R5, R7 (src/v190_care.js, strings18.js)
- `test/e2e190_care.py` (real-data copy and made-up bundle, fake clock): R1a export line (note + Inbox, failed download records nothing, every full export recorded, back after 90 days); R5 push switch (off by default, owner only, not in a preview copy; stored while the Sunday run is off; on = a new task through `Runner.create` with push + new session + same cron + the noteworthy-only prompt, old one paused; off = the reverse; back on = the kept task; refused push leaves the run as it was; never a delete; Health lists paused tasks); R2 "How customers get AI" (three options, ★ by whether fixed rules can do the AI part, direction-E block row, the server option needs a hard monthly limit, decision + limit one Undo step, brief carries the server rules and the owner's steps, nothing called); R3 (no proposal before 1 Feb 2027 or under 60 days of counts; average × 1.25 rounded up checked against the stored counts; Not now / Change / Use this; above the ceiling `autoOK()` false, automatic AI calls and the drill on opening stopped, Health › Economy and the note say so, a step you start asks once a day in the page); R7 (from 4 Oct 2027, steps and links, no key field, only a date stored, weekly until done, 11 months later again); three languages; 390 px.
- `test/plain_browser.py` (gate suite, R1b): PT's own export made in a mocked page, then the built file in plain Chromium without any runtime: the read-only viewer opens the export, lists every project, shows each project's main content; nothing written (storage, cookie, IndexedDB, caches, fetch/XHR/beacon/socket instrumented) and nothing requested but the file; no PT action, no AI/run/publish control; three languages; 390 px. Before 1.9 PT fell back to a local mode there that wrote a new workspace into localStorage and was fully editable.
- Planted bugs in `check_the_pick.py` (`--only=e2e190_care`, `--only=plain_browser`): export not recorded, failed download counted, ceiling proposed before February / under 60 days, automatic AI above the ceiling, a started step not asked, old Sunday task left running, push task without the noteworthy rule, key line before 4 Oct 2027, server key without a limit, the viewer writing to storage, the plain browser falling back to the editable local mode.
- Found while building: an in-page question added outside `#app` (the ceiling question) lost the focus to a render right after it opened. A modal question PT adds by itself takes the focus synchronously and keeps it (focus trap) until answered.

## 1.9 scan (2 Nov 2026)
- Self-scan: action names only (the 1.7.1 day document gets a capped `seq`; `e2e171` still checks numbers and names only), counted on Saturday night, two proposals at most, propose only; a shortcut only for look/move/copy steps (`SCAN19_SAFE`). Checks: `e2e190_scan.py` + 10 planted bugs.
- 4×4 interview before a big or risky change to a live tool (outward, shared/customers, money, data shape, > 3 rows changed); a single fix is exempt; answers become owner rows, a skipped area a residual-risk row.
- `CHANGELOG.md` is generated (`tools/changelog.py`); the gate and CI fail when it is stale (`changelog_test.py`, 7 planted bugs).
- Cause 71 (integration): the fleet part wrote "Firnlab kit 1.8.0: …" into every build brief. "Firnlab kit 1" names kit number 1 (pages), so the 1.6 kit test read a scheduled tool's brief as carrying the page kit. The line now says "Kit version 1.8.0 (the Firnlab kits as of this version)"; a kit number and the kit version are never written the same way. Check: `e2e16.py` (it found it), `e2e190_fleet.py` follows the wording.


## 1.9.1 judge and lab (src/v191_judge.js, src/v191_lab.js, strings21.js `jdg.*` `lab2.*`)
- The independent judge is a third gate (`CHK_GATES`: tests, drill, judge) with the honest assessment both ways, PT's ★ "apply" for every tool and the cost per run as an estimate. A private tool taps it like every row (O4a; `jdgOn` = applied); a tool other people use has it fixed on (today's behaviour: every gate applies).
- The judge job (kind `judge`, the existing runner; `PREVIEW_BLOCKED` too) starts after a build job result, a verified update job result and a build report read or pasted, when the gate is on, the runner exists, `autoOK()` allows it and it is not a preview copy (`jdgStart`, `by: "pt"`); "Run" / "Check again" are the owner's clicks, and inside a kit run it is part of the owner's GO (`by: "fleet"`). One run per build/update result and per draft. Instructions: a fresh session; commit first (the plan and the expected outcome of every acceptance line are the first step it writes); every built page/task opened and every line checked with evidence; the builder's report only at step 3, kept in its own document (`jdg-<run>-builder`, never in the job's inputs); disagreements listed; hard floors (security, accessibility; "unknown" is not a pass).
- PT never takes the verdict word alone: green = verdict "pass" AND every line passed (a line not reported counts as not passed) AND no disagreement AND both floors "pass"/"none" AND the plan came first (`jdgNorm`). Runs are stored on the project (`p.judges`, newest last, kept by a restore, never undone) with the draft/version they judged; what you did with a run (`p.jdgHandled`) is one Undo step.
- Effect: not green → `releaseGate` item for that draft (`jdg.g.fail`, also `jdg.g.none` / `jdg.g.failed`) and a block card (kind `jdg`: hard, tier block, noAuto; "Make fixes from it" → findings for the next draft or Inbox items for a live tool's next update; "Check again"); running → the gate waits (`jdg.g.wait`); no runner or a preview copy → one plain line "Not judged: no background runs here" that does not block; a live tool with pages or scheduled tasks gets its next version through the update job after the release, so its draft is judged after that job (`after`, a plain line: before it there is nothing new to open). A kit run (`fl19Judge`) is green only with a judge pass when the gate is on; a fail stops the run (red, with why; the update is live, the previous version restorable).
- The second-lab row (`lab2`, "Second opinion from another lab"): ★ apply where a mistake hurts others or costs money (others use it, acts outward, money), skip otherwise; cost per review in CHF as an estimate (the provider bills the owner's key, outside the Claude plan). It needs a tap on every tool, shared ones included (it spends money outside the plan). Settings › General (kit defaults) records "Second-lab key: not added / added in GitHub as SECOND_LAB_API_KEY (provider: …)"; PT has no field for a key and never sees one. Without it the row says why and cannot be applied (not a row of the tool's checks, not in the queue, `chkSet` refuses). Applied with the key: the brief's PART R and the GitHub build issue tell the GitHub build to run the review (must-fix / unsure / overthinking judged by the builder, only agreed must-fix fixed, one more opinion when unsure, residual risk, never a review loop, labs alternating by ISO week where the key reaches more than one lab) and record `reviews: [{lab, week, findings: [{text, judged, fixed}], residual}]`; any other build skips it (`reviewSkipped: "only in GitHub builds"`), and the row and the Build page say "only in GitHub builds". PT shows the reviews next to the build report (Release).
- `test/e2e191_judge.py` (quick gate on the made-up bundle; real-data copy in the gate). Planted bugs in `check_the_pick.py` (`--only=e2e191_judge`): the gate on without a tap, the builder's report in the inputs, the verdict word alone green, an unreported line passed, a fail not blocking, no runner blocking, a start with automatic work off, a preview copy starting it, the block card takeable by a ★, a kit run green without the judge, the second-lab row applied without a key, Settings asking for the key itself.
- The mock: `JOBRES.judge` and `window.__mockJudgeOf(job, result)` (a plan first, one passing line with evidence per acceptance line, both floors); `window.__mockJudge` = "fail" | "disagree" | "floor" | "noplan" | "missing" | "nofloor" | "failed" | "pending" | a function.
- `e2e180_checks.py` expects the third gate (rows, queue and buttons) and the second-lab off row on the Check page.
- Cause 72 (found while building 1.9.1, by e2e14's "Undo all"): a new project field added to `KEEP_FIELDS` (the fields a restore keeps) made every restore of a project that never had it throw (`clone(undefined)` → `JSON.parse(undefined)`), so "Undo all" in Finish stopped half-way. A field that older projects may lack is kept through a `keepRecords` wrapper that copies it only when it exists. Check: `e2e191_judge.py` (a restore, and `keepRecords` on an empty project); planted in `check_the_pick.py`.
- Cause 73 (integration, found before the gate): the PT side and the GitHub side of the second lab were built apart and disagreed. PART R told the builder to call the other lab itself with SECOND_LAB_API_KEY before the pull request, but in firnlab/tools (`claude-build.yml`, `scripts/second_lab.py`) the workflow runs the review after the pull request and the key reaches only that script, never a Claude step; PT also offered providers the script cannot call (Mistral, xAI, OpenRouter) and showed a lab in odd weeks, when the workflow uses a fresh Claude reviewer; and the GitHub build issue never asked for `tool.json` "acceptance" lines, which the build room's judge and sealed twins read. Now: PART R says the workflow does it and the builder only adds `{"id": "lab2", "v": "apply"}` to `tool.json` "decisions"; providers are OpenAI and Google; even ISO week = that lab, odd = a fresh Claude reviewer; Settings names the two repository variables (SECOND_LAB_PROVIDER, SECOND_LAB_MODEL); the issue asks for the acceptance lines; the Release box points to `.checks/<slug>/review.json` in the pull request. Rule: a feature with a PT side and a GitHub side is checked against the other side's files before the gate. Check: `e2e191_judge.py` part 6; planted bugs "PART R hands the second-lab key to the builder", "a lab the workflow cannot call", "forgets the Claude weeks", "drops the acceptance lines from tool.json".

## 1.9.2 pseudo-localisation (test/pseudo19.py, src/strings22.js `vault.use.*`)
- PLAN-1.9 C, the part 1.9.0 left out: every English text from the strings table (`STR`, column 0) and from the three-language objects (`L()`) is swapped for a pseudo text (accented letters, ⟦ ⟧, about 40 % longer in short runs that can wrap; tags, {placeholders}, entities, links, file names and CAPS names stay). PT's screens are walked at 1440 px and 390 px: the Inbox, Weekly, Library (3 tabs), Insights, Notes, every Settings tab and Health, a tool's cover, its Decisions page, all seven stations, a new tool, a dialog, the second owner's first day, What's new, the command palette.
- A: a visible text, aria-label, title or placeholder with a plain English word that is in none of the strings, the `L()` objects, the stored data (the owner's own words: whole texts, the start of one cut short, or a line of four words or more out of a longer one) or `KEEP` (names of products and labs, the language names, keyboard keys, month and day names from Intl) fails. A link to an outside page keeps that page's own title; `translate="no"` marks a name. B: no raw string key on screen; the vault lines exist in three languages and their English is `vault/vault.json` word for word. C: no button, tab or pill with pseudo text clipped or cut with …. D: no sideways scrolling.
- Inline planted faults (hard-coded button, hard-coded aria-label, raw key, clipped label, 600 px box; a project name is never reported) plus four in `check_the_pick.py` (`--only=pseudo19`). In the gate (real-data copy) and the quick gate (made-up bundle).
- A new or changed vault line (the monthly `vault` workflow) turns check B red until its German and Chinese are in `strings22.js`: intended, the line is shown to the owner.
- Cause 74 (found by the new suite): (a) the "what it is for" lines of the Firnlab vault came straight from `vault.json` and showed in English in every language; (b) at 390 px with longer labels, a row inside a top bar, a panel head or a continue row grew to its longest button's one-line width (buttons keep their size: `flex-shrink:0`, `width:max-content`; a percentage `max-width` does not cap a min-content size), so Insights, the Picks and Design stations scrolled sideways; (c) the notes page set its two columns inline (`220px minmax(0,1fr)`), which beats the narrow-container rule, so it scrolled sideways on a phone even in English (10 px at 390 px); (d) an AI button's cost pill could not move under its label. Now: `vault.use.<id>` strings (the brief's PART O keeps the English), names and licences `translate="no"`; `:is(.row,.topbar,.panel-h,.head,.controw,.fullstep)>:is(.row,.controw){min-width:0;max-width:100%}`; `.btn{flex-wrap:wrap}`; the notes grid is the class `grid2 side220`, one column at ≤ 860 px like every two-column grid. Rule: a two-column layout is a class, never an inline `grid-template-columns`; a row nested in a flex row may shrink. Check: `pseudo19.py`; planted bugs "a button label is written in English in the code", "the vault lines in English only", "the notes page keeps its fixed filter column on a phone", "a row of buttons in a top bar is as wide as its longest label".

## 1.9.3 wording (src/strings16.js `bld.sub` `bld.s2.sub` `bld.setup1`, test/static_checks.js `claims`)
- Cause 75: the Build page said GitHub asks for, or waits for, the owner's approval in the `build` environment before a build in
  `firnlab/tools`. That repository is private on GitHub Free; GitHub offers environments and environment secrets for private
  repositories only on paid plans, and required reviewers only on public repositories (Free, Pro, Team). So there is no such step:
  the only lock is the workflow's login check on the `@claude build` comment. Found while checking the owner's twins-key steps
  (2 Nov 2026); the tools notes said the same and were corrected in firnlab/tools PR #2.
- Now: the three texts say that only a comment from the owner's own login starts a build and that on a private repository GitHub
  adds no second approval step. Rule: PT names only a lock that exists; a promise about someone else's platform is checked against
  its official page first. Check: static check `claims` (no string promises a GitHub approval step for a build, in any language);
  planted bug "a build promised to wait for a GitHub approval (cause 75)" in `check_the_checks.py`.

## 1.9.4 key renewal (src/v190_care.js R7, src/strings18.js `care.keys.*`, src/strings24.js, test/e2e190_care.py part 7)
- Cause 76: the Sunday note's "Renew 2 keys" (from 4 Oct 2027) named only prompt-translator's secrets. The build repository
  (`firnlab/tools` by default) keeps its own `CLAUDE_CODE_OAUTH_TOKEN` and, from 2 Nov 2026, its own `PT_PRIVATE_TOKEN` for
  the sealed twins. After a renewal by the old steps its builds stop at the first step that uses an expired key ("git clone
  failed" at the sealed twins step), with no word about a key. Found when the owner added the twins key (2 Nov 2026).
- Now: each part of the card puts its new key into prompt-translator and then into the build repository (its Actions secrets
  page, `buildRepo()` so Settings › General is followed), before the next key is copied: GitHub shows a new key only once, so
  the terminal stays open until the Claude key is in both places. One pt-private key (Contents read/write on pt-private only)
  serves both repositories. Rule: every place PT tells the owner to keep a key is on the renewal card. Checks: `e2e190_care.py`
  part 7 (each key ends in the build repository, the link follows the setting, no placeholder left); planted bugs "the key
  renewal leaves the build repository out of the pt-private key (cause 76)" and "the build repository's key page ignores
  Settings › General (cause 76)" in `check_the_pick.py`.

## 1.10.0 PT's hands (src/v1100_hands.js, src/strings25.js `hands.*`, test/e2e1100_hands.py, test/mock.js browser)
- New ability, not a bug fix: the owner's GO (3 Nov 2026) to let PT act in the Claude desktop app's built-in browser "to the highest
  ceiling". Checked on the platform first with a separate page ("PT Hands Probe", 7 of 7 steps in the owner's app): open, read,
  find, scroll to, go to another page. GitHub there runs with the owner's own login, so the risks are those of the owner's hands.
- Rules built in (and tested): one way to the browser (`handsCall`) with a guard: github.com over https only; only the tools
  preview_start, navigate, get_page_text, find and computer; computer only scroll_to, hover and wait (no click, no typing, no key,
  no drag; `form_input` is not even declared), so a final button (merge, delete, save) and every form stay the owner's; an answer
  that holds something shaped like a key is dropped at once and the step stops (nothing kept, shown or stored); the owner's login
  only; each browser failure has its own line (not the desktop app, not allowed yet, sign-in page, no answer); a closed tab gets a
  new one; GitHub fills lists after opening, so PT reads again (at most 4 times, 2 s apart) and never forever.
- Checks: `e2e1100_hands.py` (49, on both data sets); planted bugs in `check_the_pick.py`: "PT's hands may click", "PT's hands go
  to any site", "a key on the page is kept and shown", "PT reads GitHub once, before its list is there", "outside the desktop app
  PT shows only a generic error", "a closed tab ends the check instead of opening a new one", "another login may use the owner's
  browser".
- Not testable here: the real app's browser. The mock answers in the shapes the probe recorded; the live preview is tried by the
  owner in the desktop app before main is published.
- Cause (owner's first live try, 3 Nov 2026): GitHub's real pages differ from the made-up ones. The pull request list puts one-word
  labels ("dependencies", "pt") between the title and "#N" (PT showed "#21 pt"); the key page writes "Never used •Expires on …" on one
  line (PT found no key dates). Both parsers now take these shapes; `e2e1100_hands.py` has the real shapes; two planted bugs in
  `check_the_pick.py`.
- Cause (owner's second try, 3 Nov 2026): the key check stopped reading at "Generate new token", which the page shows before its
  list, so PT read the header only and found no dates. It now waits for "Expires"/"No expiration" (four reads at most). The real
  `get_page_text` shape (name, "Never used •", "Expires on …", "Delete" on separate lines) is in `e2e1100_hands.py`; the mock's
  `early` text plays the header-first page; planted bug "the key check stops at the header, before the list".

## 2.0.0 Part A — the foundation (src/v200_facts.js, src/v200_events.js, src/strings26.js, test/e2e200_foundation.py)
- What changes for the owner: each project has a facts book (never / must / fact / decided / tool rule, in his words, with source, date
  and status; More ⋯ and the page bar open it); PT reads his rules first in every step of that project and checks its proposals against
  them; what he answered is not asked again; two entries that contradict each other are shown side by side; nothing of one project
  reaches another; every answer shows "✓ Saved: … → where" and one Next is always visible; errors stay as cards in Events until he
  dismisses them; examples never ask; the text gets the room; plain words.
- Data for Parts B–E: `p.ledger = {v, entries, props, conflicts, known, blocked}`; an entry is `{id: "F<n>" (nextId), kind: never|must|fact|
  decision|tool, words (the owner's), short (PT's form), kw, src: {k: you|ns|oos|const|note|qa|pick|dec|profile, ref, label}, at, by: you|pt,
  status: active|replaced|withdrawn, replacedBy, hist}`. Functions to reuse: `factsActive(p, kinds)`, `factsAdd(p, {...})` (the caller opens
  the action), `factsBodyHTML(p)` (the panel without the page: the later "Decided" tab), `factsConflictSoon(p, ids)`, `askOnceRun(p, items,
  {drop, where})` (ask once for any new question source), `askMatch`, `exAsks` / `exSplitAsk` (examples never ask), `rcpt20(p, what, where)`
  (the receipt), `nx20HTML(p)` (the Next bar), `ev20Add` / `ev20AI` (an error card), `EX_TASKS` (prompts that get the examples rule).
- Cause 77 (owner, 2 Nov 2026, "we never log in to Google or Samsung — second time I have to tell this"): the owner's rule lived as text
  in notes, answers or constraints; `projectContext` drops low-priority parts first when over budget, and many steps ask it for a subset
  (`only`) without those parts, so a later step could propose exactly what he had ruled out. Now: `<your_rules>` (never / must) and
  `<your_facts>` go right after the task line of every `buildPrompt` with `proj`, whole, outside `projectContext` (its budget and `only`
  never see them); runAI checks every JSON answer of such a prompt: key words of a never in a sentence that is not a negation (of a must in
  one that is) → one quick-tier confirm → one repair through runAI's check path → what still breaks a rule is left out (recorded in the
  book) or, for a pick option, shown greyed "Blocked by your rule" and cannot be taken (no ★). Check: e2e200 A2 (planted never + tempting
  answer); planted bugs: rules left out, cut by the budget, another project's rules, no negation check, no repair, a blocked option taken,
  a ★ on it.
- Cause 78 (owner, 2 Nov, "we already answered this or similar before"): each question source deduplicated only against itself (the
  interview against interview answers, Pick against picks) and never against the facts the owner gave. Now one pool (`askPool`: interview
  answers, picks, decisions, active facts) for picks and interview questions: bigram similarity ≥ 0.8 = known, 0.4–0.8 or a fact's key
  words = one quick-tier check, the known ones are dropped and shown "Already known: … (change)". Check: e2e200 A3; planted bugs.
- Cause 79 (owner, "projects dont get other porjects rules, never"): the workspace profile (`user_profile`, partly made from insights across
  projects) went into every project prompt, and the 1.8 cone starred and pre-labelled "you chose this last time" from other tools. Now the
  profile is in no project prompt (an entry enters a project only through "Copy into this project" in its facts book) and the cone has no
  ★ or line from other tools (`conePolicy` removed; e2e180_cone part 5 now checks the opposite of 1.8, by the owner's decision). Check:
  e2e200 A5; planted bugs "the profile goes into project prompts again", "the cone stars your choice on another tool again".
  Left as it was (ask the owner): a check row's ★ "you chose this last time" from another tool (1.8 checks, v180_checks.js) is still a ★, not applied.
- Cause 80 (owner, "why didn't it change so I see it's done … what is next"; "it brought me to one I already answered"): answers changed data
  with no visible end state, and the examples loop looked for the next unjudged example only after the current one, so after the last one it
  stayed on a judged example. Now `rcpt20` after interview answers, picks, cone answers, notes, the facts book and the project's text forms
  ("✓ Saved: … → where", only when the form changed something); `nx20HTML` in the page bar's nav (one per screen, also where Pick hides the
  bar); the loop goes to any unjudged example and says when all are judged. Check: e2e200 A6; planted bugs.
- Cause 81 (owner, 3 Nov, "an error popped up bottom right – what was the issue"): errors were a toast that vanished and an in-memory list.
  Now onAppError and every failed AI step (runAI: no runtime, no readable answer, an upstream code) become an error card (`WS.settings.events`,
  newest first, at most 20, quoted text replaced by "…", so no project text is kept) in Events (status bar chip, Settings › PT health, a click
  on the error message), with what happened, what PT did, what you can do and the technical detail, until dismissed; "Report to Improve PT"
  is pre-filled with the technical detail. Messages shown this session are listed but never stored (they may hold project words). Check:
  e2e200 A7; planted bugs "an error is not kept", "an error card keeps the project's text", "Report to Improve PT starts empty".
- Cause 82 (owner, "'Reply with (a) or (b)' – why a question in an example?"): no example prompt forbade questions and nothing checked the
  results. Now the examples rule goes into loop-show, loop-rule, pick-next/refresh/second and arch-stories (`EX_TASKS`), and runAI checks the
  example fields (question marks, "reply with", (a)/(b), which / do you and their German and Chinese forms): asked again once, then the
  question moves out into `toolAsks`, shown labelled "The tool would ask: …". Check: e2e200 A8; planted bug.
- Cause 83 (owner, "text so squeezed … should use the whole page"): `.chips{max-width:45%}` and `.qacts{max-width:46%}` reserved almost half
  of a row for buttons. Now both take only what they need (`flex:0 1 auto`, at most 100 %) and a queue row's text keeps at least 18em
  before its buttons move under it. Check: e2e200 A9 (text ≥ 60 % of a row whose buttons sit beside it); planted bug.
- Cause 84 (owner, "what should I write as 'validated'?", "right sizing … should be clear", "'Fix it together with me' makes no sense"):
  process words on the surface. Now "Not in this version", "How much should run by itself?", "PT drafts a fix, you pick what to keep" (the
  draft starts at once; the proposal box ticks each field) and yes / no / not sure for assumptions, in three languages. Check: e2e200 A10
  (no old word in any string but the changelog); planted bug.
- The 1.2.1 report "Add requirement — nothing happens": not reproducible in today's code (Design page › all details › Requirements adds R<n>
  and puts the cursor in its title); e2e200 A11 proves it.
- Found while building: a `// …` comment put before the last statement of a block (`}catch(e){ errs = []; }   // … weak = errs.length > 0; } }`)
  swallowed it and the file still parsed; the cause-64 check needs a second statement after the comment. `static_checks.js` now also flags a
  comment followed by one assignment and a closing brace; planted in `check_the_checks.py`.
- runAI's `check` may now be async (`await check(out)`): the rules check confirms a code hit with one quick-tier call inside it.

## 2.0.0 Part B — the solution map and the new order (src/v200_stage.js, src/v200_map.js, src/strings27.js, test/e2e200_map.py)
- What changes for the owner: a project made with 2.0 goes Goal → Map → Decide → Details → Build → Check → Launch → Operate. The goal card
  (what, for whom, a real moment, success sign, where, budget; your rules from the facts book; "PT's guess" until you say ✓ That's it)
  comes first; then one tap shows all routes on one map (Simple → Medium → Complex → Frontier, plus Not possible yet), searched from six
  angles with a red team and an on-screen record of how far PT searched; you shortlist (☆, up to 3), say ✕ Not for me with a reason,
  compare, Prove it, Take this (decision record with tripwires, restore point first); only then PT asks the details of that route. A new
  fact, a failed test or a serious review problem that breaks the route raises a Route alert. Routes that worked in another project
  (after its launch) stand on the map with "Worked before", as templates only.
- Data for Parts C–E: `p.order20` (true for projects made with 2.0; a stored project without the flag gets false: Part C's migration sets
  it), `p.goal20 = {v, f: {outcome, whom, situation, success, where, budget}, by: {field: you|pt}, noNevers, skip, hist, pend}`,
  `p.map20 = {routes, notyet, rounds, cells, short, rej, chosen, decs, alerts, events, neutral, tags, libChecked, looked, satAt, nextR,
  nextN}` (one project field, so a change is one write of its parts), `WS.settings.lib20` (the template library). Functions to reuse:
  the stage model `STAGE20`, `STAGE20_PHASES`, `stage20On/Of/Rows/Done/Next/Early/Decided/Waiting`, `stage20StripHTML`, `stage20RowsHTML`;
  the map `m20Read`, `m20Chosen`, `m20Decision`, `m20Status`, `m20Round(p, {kind, lenses, red, focus, everything, question})`, `m20Chip`,
  `m20Short`, `m20Reject`, `m20Prove`, `m20Take`, `m20WatchSoon(p, {kind, text, ref})` (any new source of facts that may break the route),
  `m20Carry` (what carries over), `m20Open(p, view, id)` and the views `m20MapHTML`, `m20CardHTML`, `m20CompareHTML`, `goal20HTML`.
- Cause 85 (owner, 2–3 Nov 2026, "it asks me about assumptions and requirements of something I have not chosen"; "a later fact broke the
  solution after much work"): the twelve phases put assumptions and requirements before the architecture choice, so PT asked details of a
  route that was not chosen and nothing tied the details to a route. Now (2.0 projects) the detail items (phases assume and require) wait
  in the queue until a route is taken (kept, counted on the map: "Detail questions wait …"), the pick and interview prompts carry the
  route-splitting rule before the decision and `<chosen_route>` after it, and the details made before the decision are route-neutral
  (they carry over), the ones after it route-bound. Check: e2e200 B1, B5; planted bugs "detail questions are asked before the route is
  chosen", "the pick prompt asks details before the decision", "every detail counts as route-bound".
- Cause 86 (owner, "Claude says that's all, but there is more"): one call listed the options, collapsed onto the typical answers and stopped
  when the list looked complete; nothing re-tested what it said. Now six fixed lenses are six calls (each asks for unusual answers with how
  typical each is), merged by code (bigram similarity ≥ 0.8; 0.4–0.8 one quick-tier check), a red-team call adds missing routes, explains
  empty grid cells ("where it runs × how") and breaks routes (a correction on the route and a map event), and the saturation record is on
  screen; "searched to saturation" only after two quiet rounds in a row with every cell covered or explained, and the button stays. At most
  two calls at a time, the cost named first for every multi-call action, calls only on a tap. Check: e2e200 B3, B8; planted bugs (lenses
  run at once, one call for every angle, no unusual answers, no merge, no correction, saturation after one round, cost not named).
- Cause 87 (owner, "show me all … don't hide what breaks my rule, but don't offer it"): a route that breaks a never was either dropped by the
  Part A output check (repaired away) or shown like the others. Now the map's calls are exempt from the repair (`map-` in v200_facts.js),
  each route is checked against the active never / must entries by code plus one quick-tier confirm (`factsGuardHits`), and a breaking route
  is "Blocked by your rule: …", greyed, hidden by the default filter with its count, never shortlisted or taken; a never added later greys
  it at once. Check: e2e200 B4; planted bugs "a route that breaks your never is not greyed", "the map shows rule-breaking routes by default".
- Cause 88 (owner, "PT also shows previous solutions that worked … projects dont get other projects rules, never"): a worked solution could
  only come over as a whole project copy or a preference. Now a route enters `WS.settings.lib20` only after its project launched
  (doRelease, or a launched project's map), with allow-listed fields (family, rung, generic pattern, where, how, actor kinds, recipe,
  measured outcome, date); any text holding a key word of one of that project's facts-book entries, a capitalised name from its goal card
  or its name is left out. On another map it is a route like the others ("Worked before · live since …"), re-checked against that
  project's rules. Check: e2e200 B9 (a planted never "We never upload the photos to Dropbox" reaches neither the library nor a prompt of
  the other project); planted bugs "a proven route carries its project's rule words", "a route enters the library before its project
  launched".
- Cause 89 (Part A left it to the owner's rule): a 1.8 check row's ★ was "you chose this last time" from another tool of the workspace —
  a carry-over of another project's choice as a suggestion. Removed (`chkPrev` gone, `chkStar` is PT's own); e2e180_checks part 2 now
  checks the opposite of 1.8. Planted bug "the checks ★ carries your choice on another tool again".
- Decided (Part B): the route alert's detection is code for your rules and one quick-tier call per action for facts, failed tests and
  serious (critical/high) review findings against the chosen route's load-bearing assumptions and tripwires; web truth (prices, terms) is
  not fetched by the map (sample calls cannot browse): every field says "PT's reasoning, not checked" unless the call knew better.
  The "Not possible yet" watch line is shown, but nothing watches it on a schedule yet (Part D's morning check is the place).
- Found while building: a comment put before a call at the end of a line (`… ));   // note STAGE20_HELD.set(p, n);`) swallowed the call
  and the file still parsed (cause 62 again, this time a call, not an assignment); the waiting-details count stayed empty. static_checks.js
  now also flags a `// comment` followed by `name.method(…);` at the end of a line; planted in check_the_checks.py.
- check_the_pick.py must start from a tree whose own test is green: a planted-bug run on a red baseline reads every bug as "caught".

## 2.0.0 Part C — two modes, one ledger (src/v200_modes.js, src/strings28.js, test/e2e200_modes.py)
- What changes for the owner: every project has a switch "Chat with structure · Pick" (status line, also on the cover). Chat: he types
  freely; PT answers in a sentence or four and files what he said into the facts book ("✓ Noted as never: “…”" with ✎ and Take back;
  "Already in your facts book" when it is there), keeps the goal card, the map, Decided, Plan and Events beside the conversation
  (on a phone: one tap between conversation and workspace), shows the one Next and a few chips; a question PT asks is a pick card
  in the chat (tap an answer). Pick: the same cards, pages and facts book; before the route is decided its Picks page leads to the
  route (goal → map → shortlist → compare) and the details wait. Steps, Blueprint, Journey, Swimlanes and Express are gone (their
  data stays; the Design page keeps the parts map). On first open in 2.0 each project gets a restore point "Before 2.0", then its
  own 1.x rules go into its facts book and its 1.x design options onto its map; a confirmed design choice is the chosen route.
- Data for Parts D–E: `MODES = ["pick", "chat"]` (`projMode` reads any other stored value as Pick); `p.chat20 = {v, n, msgs: [{id: c<n>,
  at, by: you|pt|sys, text, filed: [F…], known: [F…], goal: [field], card: pick card id, dropped, cut: {n, rule, id}, about: tool|pt|both,
  next, fail, to}]}` (at most 160, this project only); `p.m200 = {v, at, rp, from: {mode, before}, rules, routes, order: decided|early|
  kept|on, errs, prints: {field: hash}, changed: []}` (a new project: `{fresh: true}`); `p.modeBefore200`; routes moved from 1.x carry
  `from: "arch:<option id>", old: true`; facts filed by the chat have `src: {k: "chat", ref: "chat:<msg id>"}`, moved 1.x rules `src.k
  ns|oos|const` with `m200: true`. Functions to reuse: `face20Set(p, v)`, `c20Show(p)`, `c20St(p)` (UI: tab goal|map|decided|plan|events,
  side chat|ws), `c20Send(p, text)` / `c20Apply(p, msg, r)` (any new talking source: one call, filed, guarded), `c20File(p, text, list,
  ref)` (file a list of {kind, said, norm} with the quote and the duplicate checks), `c20CodeFile(text)`, `c20Guard(p, text)` (the reply's
  last rule check), `c20DecidedHTML(p)` (one Decided list for both faces), `c20PickDecideHTML(p)`, `m200Run(p, raw)` / `m200All()`
  (idempotent), `m200Prints` / `m200Changed`.
- Cause 90 (owner, 3–4 Nov 2026, "scrap all modes … make a new mode Chat with structure that can do all we want"): six ways of working
  over one item model; what he said outside the Pick deck (notes, the Express box, the change map) was not filed anywhere binding, and
  the switchers multiplied the places to look. Now two faces of one ledger: the chat files every message into the facts book (the
  quote must be in the message — a made-up quote is sent back once; a never / must is also filed by code, so a failed call loses no
  rule), feedback about PT is never filed (Improve PT offered), a chat question is a pick card through ask once, and the Decided list
  is one function for both faces. Check: e2e200_modes C1–C3; planted bugs "the chat files nothing into the facts book", "the chat files
  feedback about PT into the project", "a never is lost when the chat call fails", "a chat answer that breaks your rule is shown", "the
  chat asks details before the decision", "a question in the chat is asked again", "Pick's Decisions page and the chat's Decided tab
  differ", "an answer after the decision is not watched by the Route alert", "the old modes are back".
- Cause 91 (Part A's output check on a free text): a chat reply is one string, so Part A's check could only record a rule break in it
  (a top-level string is kept, not dropped). Now `c20Guard` leaves out each sentence that still breaks a confirmed rule after the one
  repair and says so ("Left out of PT's answer …"); the whole reply is replaced when nothing is left. Check: e2e200_modes C2 (TEMPT).
- Cause 92 (the move to 2.0, owner rules "restore points only the owner deletes", "projects don't get other projects' rules, never"):
  a move that rewrites data cannot be checked and a move that runs twice adds everything twice. Now `m200Run`: restore point first
  (the stored copy; an existing "Before 2.0" point is reused, none is ever deleted), then additive steps reading only that project
  (rules from its constraints, not-in-this-version, constitution; routes from its design options; the decision as a facts-book entry
  src dec ref route:R…; `order20 = true` only when decided or without detail work — a project mid-way keeps its order and is told how
  to switch), a hash of every field it had before (`prints`) and the fields that changed (`changed`, must be empty), once per project
  (`p.m200`; run again = the same: duplicates by ref and by similarity). Check: e2e200_modes C4 and R; planted bugs "the move makes no
  restore point first", "the move twice adds the rules twice", "the move brings another project's rules", "the move changes a field
  the project had", "a confirmed 1.x choice is not the chosen route after the move".
- RC replay (acceptance, e2e200_modes R, green on work/backup-140, work/backup-141 and the made-up bundle): every project of both
  workspaces is moved, then: nothing lost (the hash per field, and no count lower than in "Before 2.0"), rules never cut (every never /
  must whole in the prompt with a 2 000-character context budget and in every chat prompt), no cross-project content (no other
  project's rule in its book, map, chat or prompt; a never said in one project's chat reaches no other), no repeated questions (each
  question it answered before, asked again in the chat, is dropped), the order (route-splitting before the decision, `<chosen_route>`
  after, details waiting), the same ledger in both faces (facts book ids, Decided list), and opening again moves nothing twice.
- Found while building: (1) the 1.6 one-time move recorded `projMode(p)` as the earlier view; with the 1.x views gone that read "pick",
  so the view a project had was lost — it now keeps the stored value. (2) normalizeProject's one-level fill copied a new project's keys
  into a stored record (`m200` gained `fresh: true`, the move looked undone and the record changed on every reload) — the stored record
  is kept as it was; hunt 4 (persist) caught it. (3) A `// comment` put before a closing brace made the file stop parsing; `build.py`
  still wrote the file — only `node test/static_checks.js` (check 0) says so: run it after every build, as the rules say.
  (4) The layout audit read screen-reader-only text (`.sr20`) as clipped and a button half under the main area's lower edge as covered
  by the status bar; both are now skipped (layout141).
- Tests moved with the views: tests that set `p.mode = "steps"` (or another 1.x view) to reach a step now open that step in its page's
  details (`pgShowPhase` before `setPhase`; the page's render sets the cursor to its own steps); hunt 15 ("the Journey marker") is now
  "the stage strip marks the one stage the project is at"; e2e141's learning-moment, guide-strip and stage-gate checks are gone (those
  lived only in the 1.x step views; Pick and Chat with structure are their own guide); layout141 shows the chat and its workspace.
- Found by the hunt once it visited the page details (both also on ab8ef98 with the same hunt): (5) the Design page drew the open kit
  questions twice, in "What you decide" and in its kits block (two boxes with one id) — fixed, the kits block leaves out what is above;
  (6) hunt 5: "Make about 30 variants" on the Review page's test details, followed by PT's automatic trial, cannot be undone back to the
  exact engine state (the trial's engine climb is not part of the click's actions) — NOT fixed in Part C, fails identically on ab8ef98; fixed in Part D (cause 93).
- Left out (not built, say so if asked): the workspace-level "reading hint" when the owner corrects "about the tool / about PT" (one tap
  "No, it's about my tool" files it as a tool rule instead); sending feedback about PT to Improve PT by itself (one tap opens the report
  with the words filled in); a resizable split between conversation and workspace (fixed 58/42, one column under 1000 px); the CSS of
  the five removed views is left in styles.css (no screen uses it; removed in Part E). New projects still start in Pick (Settings › default: Pick or Chat).

## 2.0.0 Part D — hands and loop (src/v200_hands.js, src/v200_loop.js, src/strings29.js, test/e2e200_hands.py, test/e2e200_loop.py)
- What changes for the owner: each project has "PT's hands" (More ⋯; the route card links to it): a list of the project's sites (add,
  remove; github.com stays read only), "Ask PT's hands" (his words → PT writes the steps before any page opens), a card that shows what,
  where, why, whether it can be undone and every step with whose it is, then Run: PT opens the page, types into fields, chooses options,
  clicks ordinary buttons and stops one step before the final one ("Your click: Send" · Take me there). On his first open of a day the
  cockpit shows one "Morning check" card. The facts book (and the test page) has "Prompt tests". Settings › PT health lists his Improve
  PT reports with open / fixed in; Settings › Metrics shows how PT works for him.
- Data for Part E and later: `p.hands20 = {sites: [host]}` (an action: Undo takes a site back), `p.hands20log` (a record, DIFF_SKIP:
  {id, at, what, host, n, end: done|final|stopped, final}), `p.ptest20 = {inputs: [text], runs: [{id, at, v, n, pass, items: [{i, input,
  src, ref, answer, rules: [{id, kind, rule, ok, code, why, judged}], pass, empty}]}]}` (a record, at most 5 runs), `WS.settings.morning20
  = {day, at, lines: [{k, st: ok|new|warn|skip, text, pid}], prs: [n], kp, watch: {"pid:nyid": hash}, seen, calls}`, `WS.settings.ipt20 =
  [{id, at, v, where, text, status: open|fixed, fixed}]`, `ipt20v`, `ipt20news`, `WS.settings.met20 = {pid: {asked, twice, repaired, hands,
  ptests, goalAt}}`. Functions: `h20Call(p, tool, input)` (the only way for project hands), `h20Vet`, `h20Run`, `h20Go`, `h20Clear`,
  `h20IsFinal`, `h20SecretField`, `h20SecretVal`, `h20SiteOk` / `h20WriteOk`, `mc20Run`, `mc20Since`, `pt20Run`, `pt20Inputs`, `ipt20Add`,
  `ipt20Version`, `m20Metric(p, k, n)`, `IMPROVE_FIXED` (version → report ids; empty for 2.0.0 until the release fills it from the inbox).
- Cause 93 (hunt 5, red since ab8ef98): PT's automatic steps (`autoEngine`: the trial 900 ms after a visit to Design, the engine
  suggestion, the frontier scan) opened their action with `snapshot` and never closed it; the next click's `actOpen` closed it, so it
  landed in the Undo history after the click had started, and "Undo everything the click set off" also took back the finished trial
  (`engine.climb`, the loop's default state). Now `autoEngine` closes the project's action when each automatic step ends, and
  `aiTrialRun` closes its own. Check: hunt 5 green on both data sets; e2e200_loop L7; planted bug "an automatic step leaves its action
  open" in check_the_pick.py.
- Cause 94 (owner, 3–4 Nov 2026: "real clicks and typing in forms are OK; final buttons — merge, send, delete, pay, publish — and
  keys/passwords always stay mine"): 1.10's hands could only point (scroll, hover), so every form was the owner's; letting them click
  without a rule would let one wrong label press a final button. Now (per project) a plan first (one call, before any page; page text
  never adds a step), a contract card before Run, and two gates by code: at plan time a click whose label holds a final word (en/de/zh:
  merge, send, submit, pay, buy, delete, publish, confirm, save, install, agree …) ends the steps and becomes "Your click"; on the page
  `h20Clear` clears an element only the moment before its action (a click only on a non-final label, a fill only into a field that is not
  a key / password / code / card / account / id field), and `h20Call` refuses a click or fill on anything not cleared, a click by
  coordinates, key presses, typing by keys, other tools, sites off the project's list (github.com too), a key-shaped value, another login.
  A click that leads to a page off the list stops the run. Check: e2e200_hands D1–D7 (49 checks); planted bugs: final-word check off, an
  uncleared click, a password field typed, a key-shaped value typed, any site opened, github.com writable, steps run before the
  contract, a click off the list goes on.
- Cause 95 (Part B left it open: "the Not possible yet watch line is shown, but nothing watches it on a schedule"): the watch lines and
  the tripwires were checked only when something happened inside PT. Now the morning check (owner, once a day on first open; the mock
  keeps it off unless a test asks): the 1.10 GitHub checks (pull requests with what is new since the last check, key dates, the release;
  outside the desktop app one line and no further try), per project the tripwires against what came in since the last check (facts,
  failed tests, serious findings → `m20WatchSoon`, deduplicated by ref), the not-yet lines when PT's platform knowledge changed, and a
  watched page (an https address in the watch line) read through the Fetch helper — a changed page is a map event and goes to the Route
  alert. PT creates no scheduled task (the cloud guide is one tap away). Check: e2e200_loop L1; planted bugs "twice a day", "for another
  login", "skips the tripwires", "a watched page that changed raises nothing".
- Cause 96 (prompt tests): a test that sends the project's rules channel with the inputs tests PT's prompt, not the tool's, and a model
  that answers and grades in one call tends to grade itself kindly. Now one quick-tier call (cost on the button) answers up to five inputs
  following only the package and grades each never / must; no `<your_rules>` block goes in (raw `[[task:ptest-run]]` prompt, no project
  marker), and code reads every answer for a never's key words in a non-negated sentence: such a hit fails the answer even when the call
  says the rule holds. Check: e2e200_loop L2; planted bug "prompt tests trust the call over PT's word check".
- Cause 97 (Improve PT): reports went to the `toolfeedback` collection with no status, so the owner never learned what an update fixed.
  Now every report sent (header, rail, an error card, the chat's one tap) is also kept in `WS.settings.ipt20` (open), on a version change
  the ids listed for it in `IMPROVE_FIXED` become "fixed in <version>" and one card says so once (Got it). Check: e2e200_loop L3;
  planted bugs "a report is not kept", "fixed reports are announced on every open".
- Metrics (design §9; kept in WS.settings.met20, saved with the workspace and part of "Export my data", never in a prompt): questions PT showed (askOnceRun: items minus held back), asked twice and held back, rule breaks
  caught and repaired (factsGuardHits with a hit), routes on the map, goal → decision (first confirmed goal field or the project's start
  → the active decision); never in a prompt or report (they are in the workspace export). Check: e2e200_loop L4; planted bug "asked-twice questions are not counted".
- Found while building: (1) a `<rules>` tag named in the prompt's prose before the block made the mock read the prose as the block (a
  real model would read either); the prose no longer names the tags. (2) A screen-reader-only label (`.sr20`, absolutely placed) in a
  table header escaped the table's scroll box at 390 px and widened the page by 82 px; the header carries `aria-label` instead and the
  scroll box is `position:relative`.
- Left out (not built, say so if asked): a quick-tier second opinion on "is this button final" (the design's "plus a quick-tier check":
  code only, conservative word list, and the guard refuses anything not cleared); typing into a field the page marks only by
  `type=password` without a telling label (find answers role and name only; such fields are caught when their label says password /
  code / key); the morning check's AI parts as their own cost line (they are the Route-alert quick calls PT makes anyway); a list of the
  ids fixed in 2.0.0 (`IMPROVE_FIXED["2.0.0"]` is empty: the release fills it from the inbox).

## 2.0.0 Part E — setup and helpers (src/v200_setup.js, src/strings29.js `su20.*`, CAPABILITIES-2.0.json, test/e2e200_loop.py L5–L6)
- What changes for the owner: Settings › Setup lists one helper program per kind of job with its state on his Mac (Ready / Not checked
  yet / Installed but tools are missing / Not installed / Only in the desktop app), what PT does with it, "Check it's there" and its
  install guide; nine click-by-click guides (the Claude GitHub App for firnlab, the GitHub connector, auto-merge for Dependabot pull
  requests only, the morning check as a cloud scheduled task, computer use in the desktop app, one per helper). A route card whose route
  needs a helper says "Needs <program> on your Mac — Install guide" (or "ready", or "Excluded by your PT rule").
- HELPERS20 (tool names from each program's own page, checked 4 Nov 2026; host server = the entry name in claude_desktop_config.json):
  | kind | program | host server | tools PT calls | what PT does |
  | files | Filesystem (MCP reference server) | host:filesystem | list_allowed_directories, list_directory, write_file | saves the prompt as a NEW file in the allowed folder after a contract (never overwrites; it has no delete) |
  | code history | Git (MCP reference server) | host:git | git_status | morning check: changes not committed yet in the folder he names |
  | web pages | Fetch (MCP reference server) | host:fetch | fetch | morning check: reads the pages the not-yet watch lines name |
  | 3D | Blender MCP (community add-on, ahujasid/blender-mcp) | host:blender | execute_blender_code | "Check it's there" runs one read-only script (counts the scene's objects), shown first |
  Never: Calendar, Contacts, Music, Photos, e-mail / Slack sorting or drafting (an excluded category on a route card is named, never
  offered). Not declared in 2.0 (no program whose tools could be checked on its own official page, or PT already does the job):
  terminal, databases (the SQLite / Postgres reference servers are archived), office documents, notes, other browsers (PT's hands are
  the only browser), memory (the facts book), time.
- Detection: `listTools()` never asks the viewer; a server the app runs lists with descriptions (or `authStatus: "connected"`), one only
  declared in the page lists with empty descriptions → "Not checked yet"; "Check it's there" makes one read-only call where the helper
  has one (Filesystem: list_allowed_directories; Git: git_status of the named folder); Blender's only tool runs code, so its check shows
  the script and runs only after yes. `helper20Call` refuses any tool not declared for the helper, drops key-shaped answers, owner only.
- CAPABILITIES-2.0.json (repo root, for the publish manifest): the 1.10 set plus `form_input` on host:claude_browser and one entry per
  helper with only the tools PT calls; e2e200_loop L5 checks it against `HELPERS20` and `H20_TOOLS`. Planted bugs: "a helper declared
  only in the page counts as ready", "a helper runs a tool that is not declared for it", "the Blender check runs its code without
  showing it first", "the prompt file is written over an existing file", "a route that needs a helper does not say so".
- Cleanup: the CSS of the five removed views (Steps `.steps2 .stepmain .spine2 .sgroup .sglabel`, Blueprint `.bp2 .bp-st .bp-label .lnk
  .homeB`, Journey `.tiles .tnext`, Swimlanes `.lgrid .lh .ln .lc .lpart .cbtn`, Express `.xp .bubble .xcard .xnext`) is gone from
  styles.css / styles18.css (57 selectors; each class checked unused in src/*.js, dynamic names included: `k-${kind}` stays, the
  Design page's parts map uses it). What the Design page and the stage strip still use (`.bpmap .bp-node .mapwrap .station …`) stays.
- Not testable here: the real helpers and the real desktop app (the mock answers in the shapes the programs' pages give); the live
  preview is tried in the desktop app before main.
- Found by the Part D regression on all three data sets (both also red on 2cb4f16): (3) e2e200_foundation A9 on work/backup-140 — a
  queue row 564 px wide kept its buttons beside the text with the text at 46 % (the 18em floor fits, the 60 % rule does not); the text
  now takes `max(18em, 60%)` before the buttons move under it. (4) e2e200_map B1 "an older project keeps its order" still read the
  Part B rule; Part C's move puts an older project on the 2.0 order when it is decided or has no detail work (`p.m200.order`), so the
  check now reads the move record (kept → old order; otherwise on).

## 2.0.0 release gate (4 Nov 2026, part A: 7 red on bb3383f)
- Cause 98 (flows 1.2): with the Steps view gone, a page's details are the only way into a step, and they never visited it: the pages'
  `goto` override (since 1.7) and the details' render moved the cursor (`p.focus`, `UI.phase`) without `setPhase`, so no automatic step
  ran (the frontier scan on reaching the interview, the engine suggestion and the trial on reaching the architecture), no "step done"
  restore point was saved and the project's phase did not move on. Hidden in 1.7–1.9 because the 1.x views still called `setPhase`.
  Now a step's tab is a visit (`setPhase`, as the Steps view's was), and a person's click that opens a page with its details open, or
  the details themselves, visits that page's step (`pgVisit`). Check: e2e12_on14 part 3 ("frontier scan ran by itself"); planted bug
  "a step's tab on a page is not a visit" in check_the_pick.py.
- Cause 99 (flows 1.2, a page error): Part C removed `aiImpactParts` with the 1.x change map (and Part C's string clean-up `cm.thinking`),
  but the Run page's change request ("Tell PT what to change", Operate) still calls it: the request was filed and then the page threw.
  Restored (one quick call that lists the parts and items a change touches, as in 1.x). `static_checks.js` now flags a function the
  release before had (`src_v180_backup`) that is gone while a caller is left (`[calls]`); planted in check_the_checks.py. e2e200_modes
  no longer lists `aiImpactParts` / `cm.thinking` among the removed 1.x code (the change map's actions `cmap`, `cmap-ask` stay listed).
- Cause 100 (flows 1.2): `pickDefaultsOnce` recorded the workspace's earlier default view only when it was in `MODES`; 2.0's `MODES`
  holds Pick and Chat, so a workspace's 1.x default (Blueprint, Journey …) was recorded as "steps" (the record of what he had was
  lost). The stored value is kept now. Check: e2e12_on14 part 1; planted bug in check_the_pick.py.
- Cause 101 (flows 1.4): the walk through a list ("1 of N", next, Back — the queue's titles, "Walk through", Finish's list) never
  showed on the pages: the pages' `goRef` opened the item's page through `pgOpen`, which clears `UI.nav`, and dropped the list. Now
  the list is kept. Check: e2e14 part 7.
- The release page of the version under test (flows 1.10 hands, flows 2.0 loop): the mock's GitHub had a fixed page for v1.10.0, so
  from 2.0.0 on "Check this version's release" read "no release yet". The mock now adds the page of `PT_VERSION` once the page's
  script has run (tests that need "not there yet" still delete it). No app change.
- Tests that still drove what Parts B and C changed on purpose (ported, nothing weakened):
  - flows 1.7 (e2e17): the mock question ("is this what you meant?") is a detail item (phase require); a 2.0 project asks details only
    after its route is taken (cause 85), so part 12 now takes a route on the map first (a full round with the mock, then Take this)
    and checks it. Part 5 counts each open kit decision once on the whole Design page (Part C, hunt 12: a kit question already in
    "What you decide" is drawn there only); planted bug "the Design page draws a kit question twice" in check_the_pick.py.
  - check the rows (e2e180_rows): since Part C's move touches every project at boot, the rows of the loaded projects are worked out
    before the test takes its "before" picture, so the planted bug "working out the rows fills in the project" changed them unseen.
    The fresh 1.7 copy the test makes now lacks `goal`, as two of the made-up 1.7 projects do; the planted bug is caught again.
  - flows 1.2 / 1.3 / 1.4 (e2e12_on14, e2e13, e2e14): steps are reached the 2.0 way — the page in the page bar, "all details", the
    step's tab (e2e12_on14 `goto_step`; e2e13 `step()`; e2e14 `pgShowPhase` before `setPhase`); the new project starts in Pick; the
    Bauplan is checked on the Design page (opened, as it is folded since 1.8, and as a diagram at 420 px) and the check now fails when
    there is no map to audit (before, `auditMaps()` on a page without a map passed); the cover's "everything" is opened before its
    queue is used; Requirements rows are typed in directly (Express's Edit button is gone). e2e12_on14 now ends with the standard
    summary line (check_the_pick.py can read it).
  - e2e14 part 2 (update affected, on work/backup-140): Part A's rule check confirms every code hit through the mock, and the updated
    items repeat their own wording, which names a never rule's key words, so every update was left out. The section is about the
    update flow; the quick check answers "does not break" there (the rule check itself is e2e200_foundation A2).
- Dropped with their feature (Part C removed it): e2e12_on14 "mode … renders" (×5), "switch to … keeps the place" (×5), "Guided shows
  the guide strip", "no sideways scroll at 420 px in <view>" (now per page); e2e13 part 6 "quick mode" (Express: the short list, J/K,
  Enter, "Accept all recommended").
- 2.0.0 hunt check 28 (await race) went quietly empty: it looked for AI buttons on the step pages, which 2.0 removed, so it clicked
  nothing, stayed green, and its planted bug was MISSED by check_the_hunts. Now it starts an answer in both faces (a chat message;
  the first Pick-cover button that starts one) and fails when no answer starts at all, so it can never pass by doing nothing.
- 2.0.0 e2e200_loop L4 still asserted the old metrics line ("never sent anywhere"), which the fact check had found untrue (the
  data export carries the numbers). The test now asserts the corrected claim: never sent to Claude, part of the data export.
