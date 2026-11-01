# PLAN-1.9 (1 Nov 2026)

Owner's GO: "GO, all 4 in one go" (1 Nov 2026, 15:30 Zürich), order set at 15:33: (1) the scheduled-task link — done in 1.8.1/1.8.2,
(2) the history rewrite — done 23:19, GitHub Support ticket sent 23:42, (3) the reminder list — decided below 23:43–23:49,
(4) 1.9 and everything else under one GO (CLAUDE.md one-GO release rule: gate per wave, preview, live re-test, main, releases PR).

## Owner decisions, 1 Nov 2026 (reminder round, one yes/no each)
| # | Reminder | Decision |
|---|---|---|
| R1 | Platform risk for PT | **Yes, 1.9:** the Sunday note reminds every 3 months to save a full export; a new automatic check opens the built PT file in a plain browser outside claude.ai, loads an export and shows the projects read-only, without AI. |
| R2 | Server-backed AI for customer tools | **Yes, 1.9:** PT offers it as a choice with its cost shown whenever a customer tool needs AI; built only for a tool where the owner picks it, never in advance; hard monthly spending limit always. Nothing is paid until then. |
| R3 | PT monthly spending ceiling | **Yes, 1.9:** keep measuring November–January; the first Sunday note of February 2027 suggests a ceiling (average + margin) with the figures behind it; one tap confirms or changes it; PT holds to it from then on. |
| R4 | Hosted customer tools | **On hold** until the first customer tool that needs accounts or stored data; then PT names costs and steps and it is built under its own GO. |
| R5 | Push to the phone | **Yes, 1.9:** a switch in Settings, off by default; on = a push only when something needs the owner (a live tool failing, a drill finding an open attack), never for routine runs. |
| R6 | Decoy proposals | **Closed for good (option B):** no decoys, no watch; the topic does not come back. |
| R7 | Key renewals Nov 2027 | **Yes, 1.9:** from 4 Oct 2027 the Sunday note shows "Renew 2 keys" (Claude build key, pt-private GitHub key) with click-by-click steps, weekly until ticked done. |

## Scope of 1.9 (the four parts moved from 1.8 + R1, R2, R3, R5, R7)
Sources: PLAN-1.8 (video round 1, 2, 6, 7, 9, 10), DESIGN-1.8-rev2 §3 (fleet), §4 (canaries — R6 closes decoys, so no planted
should-reject items), §8 (harness 1.9), §17 (compute split, server-backed key row).

### A · Second-lab reviews and alternating labs
- A check row "Second opinion from another lab" (`lab2`) per tool: honest assessment both ways, ★ where a mistake hurts others or
  costs money (shared, acts outward, money), cost per review shown as an estimate. Tapped like every check row (O4a).
- Runs only where a key exists: the key lives only in GitHub's secret store (`SECOND_LAB_API_KEY`, provider and spending limit
  chosen by the owner, cost named first). Without a key the row says so and cannot be applied (failing features stay off).
- Review flow (in the build workflow, never in the page): reviewer from the other lab gets the diff + acceptance lines →
  findings → the builder judges each "must-fix / unsure / overthinking" → only agreed must-fix are fixed; unsure → one more
  opinion, then residual risk written; never a review loop. Result into the tool report (`reviews`).
- Alternating labs: drills, scans and reviews alternate the lab week by week where the key exists; the run record names the lab.
- Until the owner adds a key: plumbing + mock provider in tests; nothing calls a paid API.

### B · Fleet rebuild when a kit changes ("GO kit x.y")
- Settings › Building blocks and the Health › Fleet row: "n tools behind kit x.y" → one button "Update my tools to kit x.y" =
  the owner's GO for the whole run.
- For each affected own tool, one at a time: update job via the runner (rebuild with its acceptance lines → harness → republish
  in place → live smoke); stop on the first red (the previous version stays live; the rest wait, listed); two consecutive greens
  before the next tool. Progress as a four-state list; Cancel keeps what is done.
- Other owners' tools: PT prepares and lists the new version; they publish it themselves.
- `custom/` slot three-way merge and graduation of custom patterns: 1.9.x, after the first real kit release.

### C · Test-harness extras
- Sealed twins: held-out variants of each tool's acceptance lines, written by a workflow into `pt-private/sealed/` and run by an
  acceptance job; the builder never sees them; public logs show only pass/fail counts.
- Independent judge: a fresh evaluator (different instance, no builder reasoning, commit-first, hard floors) checks a build
  against its acceptance lines; its verdict is a separate line in the tool report; disagreement = not green.
- PT's own gate gets the R1 check (plain browser, export, read-only) and pseudo-localisation as gate suites.

### D · Self-scan, 4×4 interview, public changelog
- Self-scan (code, no AI): Saturday night, PT counts repeated sequences of the owner's own actions (action names only, never
  text) over the last 4 weeks → the two most repeated workflows proposed in the Sunday note ("make this one tap?"); propose only,
  nothing runs by itself.
- 4×4 interview: for a big or risky change to an existing live tool (the risk check: acts outward, shared, money, data shape,
  more than n decision rows touched), four questions in each of four areas (product, design, practical, edge cases), skippable
  per area; answers become decision rows.
- Public changelog: `CHANGELOG.md` generated from the `cl.*` strings and releases.json with every release (en), plus release
  notes; per tool, "What changed" from its events in the tool report and the drawer.

### E · Reminders taken (R1, R2, R3, R5, R7)
- R1 quarterly export line + plain-browser check (gate suite). R2 server-backed AI row (direction E) with cost and limit, built
  per tool only. R3 February 2027 ceiling proposal + one tap + enforcement (automatic AI work stops above it; a manual AI action
  asks once). R5 push switch (off by default; noteworthy-only rule in the run prompts). R7 key-renewal lines from 4 Oct 2027.

## Order (waves, one full gate per wave, each wave live as 1.9.x when green)
1. **1.9.0:** E (R1, R3, R5, R7, R2 row) + D (self-scan, 4×4, changelog) + B (fleet rebuild in PT).
2. **1.9.1:** C (sealed twins, independent judge) and A (second lab, off until a key exists) — these touch `firnlab/tools` and
   `pt-private` workflows; repository access for the session and the secrets are listed for the owner before the wave starts.
