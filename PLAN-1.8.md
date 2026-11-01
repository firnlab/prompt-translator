# PT 1.8 plan — the flow walked through with the owner (25 Oct 2026, evening)

Every gate of the 1.7 flow was shown as a graph and asked one by one. Decisions, page by page:

## 1 · Idea
- **Start fast or with questions, chosen per idea**: a switch next to the idea box (fast = as today; questions = for whom / what result / how measured before any research).
- **Existing product (kit 7)**: PT fetches the product's current price from the maker's page BEFORE showing the four routes (cost when needed; the price is dated).
- Screening: kept as is — screened-out findings shown folded with "use anyway"; the site counted against in the ledger.
- Company record: kept (free infrastructure until launch, one tool per role).

## 2 · Decide
- **Hard decisions may show PT's ★ too** — still only the owner decides, never assumed.
- **Readiness for a first version drops "measure"**: idea · result · no hard pick open · platform checked. (The measure stays a pick; it is asked, just not required before the first version.)
- **5 cards per round** instead of 3 (gap cards unchanged).

## 3 · Try
- Chain and stop-at-a-new-hard-point: kept. Quick-check failures become picks: kept.
- **The mock comes first**: drawn right after the idea (from idea + research), before the picks; yes / no-like-this is the first decision and feeds the picks.

## 4 · Design
- Kits at the design station, one card at a time: kept. Cost card + security card + split flag: kept.
- **The map (Bauplan) folded by default** on the Design page (the owner never looks at it); one click opens it.

## 5 · Check
- **Lenses ticked per tool**, all seven preselected.
- **Fix until green, stop when a round repeats itself** (the same fix proposed twice → stop and show before→after); no fixed round limit.
- **Tests 3× normally, 5× for tools that act outward** (send, post, publish, pay, order).
- Fact age 90 days: kept.

## 6 · Build
- **GitHub issue "build" is the default build button**; the cloud build job stays as the second way.
- Report gate stays hard (tests passed · parts present · live ids).
- **Laptop tasks stop only before a payment**; sign-ups, deletions and publishing go ahead and are reported after (the three-line report stays mandatory). Noted as the owner's choice; the task text says so.

## 7 · Run
- Publish stays the owner's click, every version.
- **Learn from use: PT fixes it and tells**: a repeated failure or a new input kind → PT builds the fix as a new version through the update job and shows the change list; no proposal step. Publish still the owner's click.
- **Attack drill runs by itself when due**: on opening PT with a live tool due (7 days), and weekly through the runner's scheduled check so it does not depend on PT being open; credits on the subscription; findings as proposals.
- Update job: all steps kept.

Order: 2 (★ on hard, measure, 5 cards) and 3 (mock first) change the first screens most → wave A; 5 (lenses, fix until repeat, 5×) wave B; 1 (start switch, price first) and 4 (map folded) wave C; 6–7 (default build button, laptop stop list, learn-and-fix, drill by itself) wave D.

## Owner decisions, 26 Oct 2026 (chat review)
- Repository `prompt-translator` goes **public** (gives branch protection, required checks, CODEOWNERS, environment approvals on GitHub Free). Public-repo prep (history scrub or fresh snapshot, licence, vault move) is owner work before the flip.
- **1.8 and 1.9 are built together as one release, 1.8, under one GO** (O7 decided). Scope = DESIGN-1.8-rev2 in full, listed in chat as 16 areas.
- Still open for the owner: O1, O3, O4, O5, O6, P1's two questions, scrub vs fresh repo, licence.
- **O4 decided (owner's version):** for every private tool (owner's or Second owner's), every gate and lens is presented — never auto-applied, never auto-skipped — with an honest assessment both ways (why it helps this tool, cost in time/CHF/taps, when it is not necessary or not beneficial) and a ★ recommendation; the choice is the owner's, per gate, per tool; "take all ★" allowed; choices become policy rows shown as the next ★ ("you chose this last time") but still asked. Customer-facing tools keep the fixed Accessibility and Legal floors; all other gates behave the same way.
- **O4 reading decided (31 Oct 2026): (a)** — for private tools every gate is a row the owner taps (apply / skip), each with the honest assessment; no single confirm-all tap. Early pruning (audience and other cuts) reduces which gates exist and therefore the taps.
- **Routing decided (31 Oct 2026): option C — the cone — with D (pick-then-verify) and E (say the ending, policy rows) as shortcuts.** Audience is the first cut; "both"/"not sure" build private-first with portability on; reversibility badges on early answers. Replaces the routing rule in DESIGN-1.8-rev2 §12.2.

## Owner decisions, 31 Oct 2026 (open items round)
- **O1:** facts by type with an error budget (prices ~20 d, platform ~45 d, policy ~180 d; past budget = not used, said so). Replaces "90 days".
- **O3:** fix until green, stop when a round repeats (kept) + hard cap of 5 rounds as a breaker; the fifth round ends with residual risk written.
- **O5:** mock first (kept); when PT flags a technical risk, a ≤ 2 h spike runs before the mock.
- **O6:** attack drill runs by itself when due (kept); a security finding opens a block card; a clean drill is one line in the weekly note.
- **Block-tier ★ never auto-takes**; block waits without timeout; reminder in the weekly note only.
- **Declined ideas** whose condition became true return in the weekly note only, with the reason.
- **Public repo = fresh repo from a snapshot**, no licence for now. Names: public `firnlab/prompt-translator` (current repo renamed to `firnlab/prompt-translator-archive`, private); `firnlab/pt-private` (sealed, audit, triage, unlicensed mirrors); `firnlab/tools` (tool sources, private). Tags restart at v1.8.0; `RELEASES-ARCHIVE.md` points to the archive. Re-point the session repo link, knowledge-check task and runner (laptop list).
- Rev 2 §12–15 (non-coder flow, cone, interface, placement map) are decided in a separate chat round, section by section.
- **Weekly note on Sunday afternoon** (not Monday morning): knowledge and growth runs finish by Sunday morning; the note is ready Sunday ~14:00 Zürich.

## Owner decisions, 31 Oct 2026 (unification round)
- Check rows: **tap every check** for private tools (O4a confirmed over research's tiering); PT shows each with its reason and cost.
- **"Your call first"** on high-stakes decisions only (money, who can see it, where data lives): owner states own answer before seeing ★.
- Gallery **★ revealed after the cards are scanned or on tap**, with a hedged first-person reason.
- **No decoy proposals**; gate hygiene = latency + rejection rate only.
- **Second owner: own Sunday note, own memory**; her decisions never become the owner's defaults and vice versa. Her tools are decided in her workspace and **published by the owner's runner** (no runner of her own), shared to her.
- **1.7 projects: migrate, then re-run the cone once per tool** to fill gaps (a few taps per tool).
- **Phone: in-app only**, no push in 1.8.
- **Full gate every release** (~75–90 min), preview included.
- **Order: owner does the GitHub steps first** (fresh public repo, protections, environment, App, secrets, CODEOWNERS, Agentic Workflows), then GO; 1.8 is built in the new repo.
- **Rev 2 §12, §13, §16 accepted** as the 1.8 design; **§14–15 (screens, placement) get one more round** before build.
- Weekly note: Sunday ~14:00 Zürich, 10-minute cap, skip without penalty.

## Owner decisions, 31 Oct 2026 (video round — all into 1.8)
1. **Cross-lab review** as a check row: PT explains and recommends it where a mistake hurts others or costs money; owner applies or skips any time; second provider key only in GitHub's secret store; cost shown per review.
2. **"Must-fix / unsure / overthinking"**: after a review, the builder model judges each finding; PT fixes only what both agree on; unsure → one more opinion, then residual risk; never looping reviews.
3. **Self-archiving in triage**: duplicates, already-fixed and noise close themselves with one line in the Sunday note (reopenable); real reports from strangers still wait for the owner.
4. **Reporter reputation** (owner, Second owner, tools' users, strangers, agents) scales triage strictness; owner can reset.
5. **"Tell PT what's wrong" in every tool**: plain language from the tool's menu or by telling PT; lands in triage with tool id + version; reporter sees "received" and "fixed in vX".
6. **Self-scan of the owner's PT use**: Saturday-night chunked scan of the event log → two most repeated workflows proposed in the Sunday note; **propose only, nothing runs by itself** (no autonomous 10 %).
7. **Alternate labs** across drills, scans and reviews where a second key exists.
8. **Reproduce like a real user before any fix** (simulated run, screenshots; before/after shown for visible changes).
9. **4×4 interview** (product, design, practical, edge cases) for big/risky changes to existing tools, triggered by the risk check; answers become decision rows.
10. **Public changelog** generated from events with every release, plus release notes.
11. **Model routing rule**: cheap models only for chunk work; decisions, builds, reviews always on the strongest model available.
12. Snippets = E shortcut + policy rows (already in). Not taken: test minimalism, ship-straight-to-production, sub-agent fan-out beyond chunkable work, hardware purchases.
Build estimate +4–6 days.
- **Compute split (31 Oct 2026):** "AI decides, code does" adopted (rev2 §17). Customer tools **code-only in 1.8**; run-time AI only via a viewer's own claude.ai session; a server-backed key is a direction-E row in 1.9. **Second owner's run-time AI steps need no approval.** Every tool carries a switchable "uses AI" line per feature. On-device = bonus tier; compile-to-code proposals in the Sunday note.

## Owner decisions, 31 Oct 2026 (not-yet-brought-up round)
1. **Platform risk for PT itself → later update** (reminder list: quarterly export + proven run on a static host).
2. **Customers in 1.8:** stateless pages on claude.ai for anyone; tools with accounts/data offered as a priced direction-E row (hosting cost, laptop steps) when a customer tool is actually wanted.
3. **PT monthly spend ceiling:** measure three months first, then set.
4. **Owner-time baseline:** a tiny **1.7.1** patch measuring taps/minutes for two weeks before 1.8 (its own GO; no behaviour change).
5. **Second owner day one:** one screen in Chinese (what changed + her Example tool); her project migrated; the cone offered once; her Sunday note time set then.
6. **Tool backups:** export on the owner's click → file the owner keeps; timer tools also snapshot weekly into their own storage.
7. **Public repo:** README + SECURITY.md (private reporting into pt-private) + "no support, PRs reviewed by me only".
8. **PT is a tool:** PT's own screens go through the harness (accessibility, performance, applicable lenses) on every release.
9. **Naming/domain:** asked only at the "where it runs" row of a customer tool, with the yearly cost; private tools get a working name from the sentence.
10. **Handover:** export + archive repo + record suffice; yearly restore check into a fresh PT, one line in the Sunday note.
11. **1.7 follow-ups** fold into one ordered GitHub/laptop steps list the owner does before GO.
12. **Cut session:** Inbox row + GitHub issue "stopped at wave N"; "continue" resumes from the repo state.

## Reminder list — future updates
- Platform risk for PT itself (quarterly export + proven run elsewhere).
- Server-backed run-time AI for customer tools with a scoped key (direction-E row, 1.9).
- PT monthly spend ceiling (after three months of measurement).
- Hosted customer tools path built into PT (when the first customer tool is wanted).
- Phone push notifications (if ever wanted).
- Decoy proposals (declined; revisit only if the gate decays).

## Pre-GO steps list (31 Oct 2026) — You / Me
A1 Me: clean snapshot (no history, no work/), README, SECURITY.md (private reporting), contribution line, RELEASES-ARCHIVE.md, unlicensed mirrors removed. A2 You: names in public files (default: replaced). B1 You: rename current repo → prompt-translator-archive (private). B2 You: create public firnlab/prompt-translator (empty) → Me: push snapshot. B3 You: create private pt-private → Me: skeleton + mirrors. B4 You: firnlab/tools private → Me: build workflow + tool.json. C1 Actions permissions (read; allow PRs). C2 ruleset main: restrict deletions, block force push, PR required (1 approval, code owners), status checks (add quick-gate + data-guard after first run), bypass repository admin. C3 environment build with you as required reviewer. C4 private vulnerability reporting + Dependabot. D1 CLAUDE_CODE_OAUTH_TOKEN as environment secret (build) from `claude setup-token`. D2 fine-grained PAT pt-private-writer (Contents RW, pt-private only) → repository secret PT_PRIVATE_TOKEN. D3 optional SECOND_LAB_API_KEY with spending limit. E1 Claude GitHub App on prompt-translator + tools. E2 `gh extension install githubnext/gh-aw` → Me: triage workflow. E3 run Vault workflow once. F1 Me: re-point session, releases, templates, CLAUDE.md. F2 Me with OK: repo name in knowledge-check task and runner. G laptop: Claude Code CLI, git remote, tools clone. H1 GO 1.7.1 (baseline, 2 weeks). H2 screens round. H3 GO 1.8.
- **Security note (1 Nov 2026):** two Claude OAuth tokens and one fine-grained GitHub PAT (`mac-git`) were pasted into the chat by accident during laptop setup; all three treated as burned — GitHub PAT revoked by the owner, Claude token re-issued and secrets updated; the burned Claude tokens expire within a year and are not in any secret. Rule reaffirmed: paste only `remote:` / `fatal:` lines, never the Terminal block.
- **Laptop G done:** Claude Code installed via the official installer (`~/.local/bin/claude`), git present, `~/PT/tools` cloned. No Homebrew, no `gh`, no `gh-aw` on the laptop — the triage workflow is compiled in the session instead.
- **Environments:** `build` on both repos; required reviewer only on the public repo (private repos lack it on GitHub Free) — on `tools` the gate is the owner's `@claude build` comment (actor check). Owner login: `firnsmith`.
- **Working line:** from 1 Nov 2026 the public repo is the working repo; the archive is read-only history. Main accepts pull requests only (ruleset), so every change — notes included — arrives as a branch + PR the owner merges.
