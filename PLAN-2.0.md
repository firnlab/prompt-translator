# Plan: PT 2.0 in waves (owner's GO, 4 Nov 2026 00:26 Zürich)

GO given to the full scope listed in chat on 4 Nov 00:26 ("what all is now in the new update?" → "GO").
Reading (told to the owner): the whole update in waves; each wave = build → full gate → preview → live re-test →
the owner tries the preview click by click → main → releases.json PR the owner merges. Red → nothing publishes.

Inputs (session scratchpad, not in the repo): the owner's 17 Improve-PT messages and the independent design
(review/independent_design.md). Both are summarised here so a later session can continue without them.

## One release (owner, 4 Nov 00:28): "all in one go. i want the next click from me to be opening the PT 2.0 main ready to use"
All waves below ship together as 2.0.0: no owner preview try; Claude tests the preview itself (test browser + real GitHub pages); main only on a green full gate. Setup that needs the owner (GitHub App, connector, computer use, helper installs) is prepared and guided in PT, not required for 2.0.

## Parts (built in this order, one branch release/2.0.0)
| Part | Contents | State |
|---|---|---|
| A Foundation | facts book per project; rules channel never cut + output check; ask once; contradiction check; cross-project leaks closed; one Next + "✓ done"; error cards kept; no questions in examples; layout width; plain words; "Add requirement" bug | built (RELEASE-CHECKS § 2.0.0 Part A) |
| B Solution map | order goal → map → decide → details; live map (33 fields per route, 9 per not-yet entry: M20_SCHEMA); coverage engine (6 angles, rounds, red-team, saturation note); shortlist/compare/Prove it/Take this; tripwires + route alert; proven routes from other projects (template only) | built (RELEASE-CHECKS § 2.0.0 Part B) |
| C Two modes | Chat with structure (new) + Pick (improved); delete Steps/Blueprint/Journey/Swimlanes/Express; additive migration with "Before 2.0" restore point; acceptance: RC replay | built (RELEASE-CHECKS § 2.0.0 Part C) |
| D Hands and loop | hands: per-project site list, forms and non-final clicks, final-button stop; morning check; prompt tests; Improve-PT loop (read, fix, "fixed in"); metrics | built (RELEASE-CHECKS § 2.0.0 Part D) |
| E Setup and helpers | GitHub App guide, GitHub connector, auto-merge (Dependabot only), cloud tasks; computer use; helper programs declared in advance (no Calendar/Contacts/Music/Photos, no e-mail/Slack sorting) | built (RELEASE-CHECKS § 2.0.0 Part E) |

## Owner decisions that bind every wave
- Projects never get other projects' rules or facts. Worked solutions from other projects may appear on the map next to the others, re-checked against this project, without that project's rules.
- Real clicks and typing in forms are OK; final buttons (merge, send, delete, pay, publish) and keys/passwords stay the owner's.
- Helpers: the owner installs; PT declares one program per category in advance; a different program needs a small update.

## Platform facts measured (PT Platform Probe, 4 Nov 00:15, owner's desktop app)
- quick tier: one message labelled in 0.9–6 s (first call incl. consent), 12 messages in one call 3.6 s, 12/12 right
- default tier: a 20-route map with 5 not-yet entries, 8 fields each, in 36 s (first text 0.7 s)
- sample input cap 256 KB; tools up to 16
- db: one 194 KB document write 1.2 s / read 0.35 s; 60 sequential small writes 21 s (bundle writes)

## Part A items
- [x] A1 facts book (`p.ledger`): kinds never / must / fact / decision / tool; owner's words + source + date; add, edit, withdraw; proposal of entries from existing project data, confirmed in one batch
- [x] A2 rules channel: `<your_rules>` first in every project prompt, never shortened, included under `only`; output check (code keywords + quick-tier) on proposals before they are shown
- [x] A3 ask once: questions matched against answered questions and the facts book before they are shown
- [x] A4 contradiction check when a fact-book entry is added
- [x] A5 cross-project: workspace profile out of project prompts (copy into a project on request); cone "you chose this last time" removed
- [x] A6 one Next + "✓ done" receipts after answers and text entries
- [x] A7 errors: kept (technical text only, no project text), shown as cards in an Events list, readable by Claude
- [x] A8 examples never ask (prompt rule + code check, regenerate or move the question out)
- [x] A9 layout: text column first, action columns no fixed share
- [x] A10 plain words: out of scope, right-sizing, fix together, assumption statuses
- [x] A11 "Add requirement does nothing" (1.2.1 report): reproduce or close

## Part D items
- [x] D0 hunt 5 green: automatic steps close their own action (cause 93)
- [x] D1 hands per project: site list, plan first, action contract, forms (form_input) and non-final clicks, the final-button stop ("Your click" + Take me there), keys/passwords never typed or read (cause 94)
- [x] D2 morning check: first open of the day (owner), 1.10 GitHub checks, tripwires since the last check, not-yet watch lines (platform knowledge, watched pages via Fetch), one card, Route alert via m20WatchSoon; no scheduled task by PT (cause 95)
- [x] D3 prompt tests: up to 5 inputs, one quick call, cost first, pass/fail against never/must with PT's word check (cause 96)
- [x] D4 Improve-PT loop: reports in WS settings, open/fixed, IMPROVE_FIXED on version change, told once (cause 97)
- [x] D5 metrics: in the workspace (part of "Export my data"), never in a prompt; Settings › Metrics

## Part E items
- [x] E1 guides in three languages: GitHub App, connector, Dependabot-only auto-merge, cloud scheduled task, computer use, per helper
- [x] E2 HELPERS20 (Filesystem, Git, Fetch, Blender MCP), detection, Needs <program> on the route card, CAPABILITIES-2.0.json
- [x] E3 CSS of the five removed views removed (verified unused)
