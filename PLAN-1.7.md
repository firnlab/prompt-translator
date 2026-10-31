# PT 1.7 plan — "PT does the clicks" (decided with the owner 25 Oct 2026)

Theme: fewer clicks for the owner, real human gates, PT able to finish and launch what it designs — on the laptop as PT's work computer (fresh OS, non-admin user, Claude desktop + Remote Control; no OpenClaw).

1. **Do it for me** — every "person step" in a build brief becomes a button; a Claude session on the laptop performs the clicks in the browser, stops at every gate (sign-up, payment, anything irreversible) and asks the owner over GitHub, writes the result back into PT. Laptop only, never cloud sessions.
2. **Build without a chat** — a build brief goes straight to a Claude Code cloud session on the right repo (firnlab/tools/<tool>, firnlab/<company>): build, test, commit, report; PT shows the PR and the live page.
3. **Pages' restore in one click** — "make this earlier version live again" for every tool page (ids already recorded), with GO.
4. **Company: free infrastructure only** — 1.7 builds the free parts (company page + founder gate, GitHub mirror, the scheduled-task version of the agents, memory, exports). Paid parts (Managed Agents, Supabase Pro, a domain) are added only AT launch, each cost named, the owner's decision at that moment. Nothing paid before launch.
5. **Kit defaults in Settings** — private pages, AI-inside-when-needed, repo, media cap CHF 10, Balanced weights: editable per workspace instead of fixed in code.
6. **Made-up test data for GitHub** — the full gate can run in CI too (task #84).
7. **Inbox: GitHub issues only** — read at session start, answered or planned, closed with one line. No Telegram.
8. **Housekeeping from the 1.6 run** — kit decisions appear only once a project reaches the design station (not seven at once on an old project); flaky hunt check made deterministic (#83); e2e scripts parsed like sources.

## Your own devices (owner chose all three, 25 Oct 2026)
9. **iPhone, no OS change — kit 4.** Reach the wish without modifying iOS: (a) build the app and install it directly in the EU (alternative distribution), so functions the App Store would reject still run; (b) build Shortcuts and use the iPhone's own automation; (c) build apps that talk to any device's public API. A custom/private OS on the iPhone stays out of scope (Secure Boot; stated plainly, not attempted).
10. **A device you fully own — the private-OS route.** Not the iPhone: PT supports an open device (an Android phone that is built to take a replacement OS, or a Raspberry Pi / mini-PC). The laptop session drives the documented flashing/setup steps with a gate at each irreversible point; then PT builds and runs your own software on it. This is the real "private OS", legal and reliable.
11. **Automate the iPhone as-is.** Shortcuts, device public APIs, and PT-built companion apps — nothing modified, nothing breaks.

## PT more and better (owner picked 1, 3, 4, 5, 6, 9, 10 on 25 Oct 2026; 2, 7, 8 kept for a later update)
12. **Design pass** — one button: research → the picks PT can answer itself (marked as assumptions) → design → package → tests, in one run; one screen back: the tool, the few decisions only the owner can make, and what PT assumed. Decide once at the end instead of fifteen times along the way. Builds on the spine and the gap cards.
13. **Show, don't describe** — a tappable mock from the design for every tool with a screen, tried on the phone before anything is built ("yes, that's it" / "no, like this"). The passive mockup becomes the thing you click through.
14. **Learn from use** — run records and problem reports of live tools flow back into PT as proposals ("3 runs failed on step 2 this week — change X?"); the collecting exists, the turning-into-decisions does not yet.
15. **Trustworthy sources** — a source ledger (which domains were right or wrong before); every number on a card carries a visible date and confidence.
16. **Fewer words, native quality** — a native-reader pass on the Swiss German (owner) and the Chinese (Second owner), and a "say it shorter" review of the 20 most-seen screens.
17. **PT's own health page** — what ran this week, what failed, usage, what the radar found; one page instead of trusting Claude's messages.
18. **Honesty as code** — every legal, price and platform claim carries its source date; anything older than 90 days is flagged "re-check before you rely on it", automatically, like the drift rule does for models.
Later (not 1.7): start from what already exists (reuse across projects), phone as first-class device (voice out, one-thumb), Second owner's first real project as the test.

## REA and rebuilding (corrected legal logic, owner 25 Oct 2026)
PT must not assert a wrong rule. The sound basis:
- **Rebuild a function with your own clean code** (observe behaviour, write your own implementation): broadly fine to use, publish or sell. Functionality and ideas are not copyrighted; your code is yours. The main road PT recommends.
- **Reverse-engineer for interoperability, study, or private analysis** (URG Art. 21, EU Software Directive): protected.
- **Copying someone's copyrighted source code** is an infringement whether or not it is published; "copy the code, use it only myself" is NOT generally legal (private-use exceptions are narrow and do not cover lifting a product's source). PT never holds this as settled-legal.

PT asks per tool: (a) only for me / public-or-sold; (b) is the source one you may copy from (your own code, open-source under its licence, public-domain) or a protected paid product. Then:
- protected product, any audience → rebuild the function clean-room (legal, publishable);
- open-source / your own, compatible licence → reuse or adapt the code (legal, faster);
- interoperability need → reverse-engineer the interface (protected).
Where genuinely grey, PT says so and points to real legal advice rather than guessing.

REA as a tool (1.7, laptop only): install locally through "Do it for me" with a gate; a REA job from a brief produces notes/behaviour spec that stay on the laptop (PT receives only "done, N findings"); the private tool is built from those notes on the laptop; guardrails in code (a REA job refuses to write outside the laptop, refuses targets with a known forbidding licence, logs each run); the "nothing copied" proof rule gets a planted-bug test.

Out of scope for PT to auto-drive: device-modification jobs (phone OS replacement, TV firmware reflash) — physical device, bricking/security risk, platform protections. PT states plainly which part of such an idea is buildable (e.g. an app that talks to a device's public API) and which is not.

Order: 2 and 3 first, then 1 (needs the laptop), then 4 when the company design is ready, 5–8 alongside. Each kit-level decision goes through Pick with the owner first.

## Unified 1.7 — one structure for everything above (25 Oct 2026)
**Backbone: the cover and seven pages.** The seven spine stations of 1.6 (idea · picks · try · design · review · build · run) become seven pages, one human question each; every page has the same three blocks: *what PT did · what you decide · next*. Above them one **cover** (replaces home view + spine strip): three-line summary of the tool, the open questions, the build-stage track (seven stations, filled), the quality spider when scores exist, one primary "next" button, the inbox link. Cover first, then pages 1–7.

| page | question | what moves in (existing code) | new in 1.7 |
|---|---|---|---|
| cover | Where are we? | spineState, pickInsights, pickLastStrip, queueCounts, home view's briefing | summary text, open-questions list, track graphic, spider, design-pass button (12) |
| 1 Idea | What do you want? | intake, northStar, candidates, own words (pk-dump), existing-product pick (kit 7) | — |
| 2 Decide | What do you decide? | pk-deck, gap panel (PT fills itself), kit cards 1–6 | kit cards only once Try is done (item 8); before that each kit default is listed as *PT assumed* with "change" |
| 3 Try | Is this it? | pk-try first version, rounds | tappable mock in a phone frame, "yes, that's it / no, like this" writes the decision (13) |
| 4 Design | How is it built? | arch, **Bauplan** (mapBlock) as the page body, journey/swimlanes as its two graphics, kits applied | cost card per tool (model per task, caching, batch, cadence) with the ceiling rules; security layers card (architecture/input/output/watching) (credits + hacking) |
| 5 Check | Is it right and honest? | review, 27 proof rules, package, tests, finish view | "fix automatically" shows every change before→after with why, "that's what I meant / change it", text suggestions; every fact with source date + confidence, >90 days flagged (18); source ledger per domain (15) |
| 6 Build | Who builds it, where? | brief, handoff, person steps | build-without-a-chat via GitHub issue `build` → Claude Code workflow → PR (one secret, set by the owner in GitHub only; usage on the subscription) (2); do-it-for-me buttons, laptop only (1); REA job and device routes 9–11 as brief parts |
| 7 Run | How is it doing? | live, versions, health tab, run records | restore in one click + GO (3); learn-from-use proposals (14); weekly red-team of the tool's brief, capped, findings as proposals; cost actuals vs card |

Retired from the main path: the mode bar (steps/journey/swimlanes/express) — steps = "all details" expander on each page; the phase vocabulary stays in the data model only. Old projects: one-time `m170` move to the cover; `modeBefore160` kept for tests.

**PT's own pages**: Settings → *PT health* (17): runs this week, failures, usage units, radar findings, versions — local data only, no key, no GitHub call from the artifact. Kit defaults editable there (5).

**Known bugs folded in**: Karte · Bauplan does nothing / sits in the statusline (mode bar in `v14_ui` statusline, map body under Pick) → gone with the Design page; test asserts Bauplan content renders. Kit decisions seven-at-once → item 8. Hunt check 28 (#83), e2e parse check, synthetic CI data (6).

**Waves** (each: build → static checks → area tests → full gate → preview GO; main GO once at the end as 1.7.0):
A cover + seven pages on the existing spine, Bauplan in Design, mode bar retired, fix-automatically change list, kit timing. Tests: e2e17 (every page renders with its three blocks; Bauplan content present; navigation by track; old project migrates; Undo across pages).
B honesty as code (one FACTS registry with source + checked date, 90-day flag), source ledger, cost card + proof rule `lean`, security layers in every brief + proof rule `canary`, red-team on the Run page.
C tappable mock, design-pass button, learn-from-use proposals, PT health, Settings defaults.
D build-without-a-chat, do-it-for-me, REA job, device routes, company free-infra, synthetic CI data, native-reader pass (strings), housekeeping.

## Status (25 Oct 2026, built on one GO)
Waves A–D built and tested in one session (BUILD-LOG-1.7.0.md). Deferred to a later update, as agreed: reuse across projects, phone-first,
Second owner's first project. Owner's steps after the release are listed at the end of the build log.
