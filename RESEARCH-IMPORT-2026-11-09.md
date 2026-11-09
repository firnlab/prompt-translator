<!-- The owner's research import (research chat 7-9 Nov 2026), stored 10 Nov 2026 so 2.2.0 and 3.0.0 do not lose it. Personal names replaced by roles (public repository). Same entries live in PT's tool requests (collection toolfeedback, ids tf-mw9une…). -->
# PT upgrade import · research session 7–9 Nov 2026

For Claude in the Prompt Translator chat: this file holds the briefing and all 35 items the owner wants for the next PT upgrade. The same 35 entries are also saved in PT's tool requests (collection "toolfeedback", each with where = "Import › Research session 7–9 Nov 2026 …", status open). Read the briefing first. Then show the owner the planned change list and the version number, and wait for his go before building anything. Items tagged LATER or PT 3.0 are not to be built in this update.

Contents: 1 briefing · 16 × 2.2 SHOULD · 14 × 2.2 COULD · 1 × LATER · 3 × PT 3.0

---

[READ FIRST · briefing for the next PT upgrade · from a research chat with the owner, 7–9 Nov 2026]

WHAT HAPPENED
the owner asked Claude to compare PT against every alternative for building and running AI agents and digital tools, from the point of view of a non-coder, and to find everything PT should take over. Claude researched online (frameworks, pricing, no-code builders, Managed Agents, computer use, vendor spend caps, the vibe-coding failure record), read PT's change log 1.0 → 2.0.0, and went through 33 capabilities row by row. PT moved to 2.1.0 and 2.1.1 during the session; items those releases already did are marked done below and were not imported.

WHAT WAS COMPARED
Code frameworks: Promptise Foundry (Manser Ventures, Zurich), LangChain / LangGraph / LangSmith, CrewAI, Pydantic AI (+ Logfire), Mastra, Vercel AI SDK, Microsoft Agent Framework, Google ADK, OpenAI Agents SDK, Claude Agent SDK / Claude Code, LlamaIndex, Haystack, smolagents.
No-code / low-code builders: Zapier Agents, Lindy, Relevance AI, n8n, Microsoft Copilot Studio, OpenAI Agent Builder.

THE CONCLUSION (decided with the owner)
- PT stays the place where tools are designed, reviewed, tested and operated. Adopt none of the frameworks; never rebuild PT on one. They are a checklist of what production-grade means, not tools for the owner.
- No framework or builder does what PT does before the build (solution map, routes not possible yet, coverage and red-team rounds, facts book, right-sizing, ceiling card, legal lines, independent checker). Keep that the core.
- The frameworks are still ahead in a few runtime things: an input/output check inside running tools, event triggers, per-call traces, per-agent identity and tenancy, server-side approval gates, canary releases, data versioned with code. The open requests below close the ones that matter for the owner's tools; the rest are deferred on purpose.
- No-code builders win only on connector reach (Zapier 8,000+ apps) and event triggers. PT bridges to them; it does not copy them.
- Claude Code with the Claude Agent SDK is the exit route for anything that must run outside claude.ai, and PT's brief, decision records and AGENTS.md export are already most of what it needs.

HOW TO READ THE ITEM REQUESTS (all from this same import; each starts with a tag)
- [2.2 SHOULD] – build in the next update. Ordered by priority.
- [2.2 COULD] – mostly brief and kit text; build if there is room, otherwise carry forward.
- [LATER · do not build now] – one request listing items with the trigger that makes each one due (first customer tool, 2.2+, a third person, …). Keep it open; do not build.
- [PT 3.0 · research and design first · do not build in 2.x] – three requests the owner wants remembered. They need deep research, decisions and design with him before anything enters PT.
Show the owner the change list and the version number and wait for his go, as always.

ALREADY DONE IN 2.1.0 / 2.1.1 (not imported)
Typing into forms (2.1.0) · Managed Agents facts in kit 2 checked on Anthropic's pages (2.1.1; note: PT's check found a Console builder with test sessions — this supersedes the chat's earlier 'API only' reading from a 9 April third-party guide) · Vercel Hobby limits · Stripe restricted key per service (2.1.1).

WHAT IS NOT YET VERIFIED (be careful)
The chat did not read PT's code, its build reports, its problem reports or its projects; capability judgements come from the change log and research. Vendor facts are as found on 7–9 Nov 2026 and expire by PT's own rules (prices 20 days, platform facts 45). A 'deep pass' was proposed and not yet run: PT's code and database, every build report's 'couldNotDo' lines, research per path this month, a red team of the item list, a CHF cost model, Swiss/EU rules for sold products, and the second owner's (Chinese-first) path. Before building a SHOULD item, check it against the code: some may already be partly there.

KEY SOURCES (opened during the session)
github.com/promptise-com/Foundry · promptise.com · langchain.com/langsmith-pricing · usagepricing.com/blueprint/crewai · pydantic.dev/pricing · mastra.ai/pricing · langchain.com/resources/ai-agent-frameworks · firecrawl.dev/blog/best-open-source-agent-frameworks · agentmail.to/blog/best-ai-agent-frameworks-2026 · blog.jetbrains.com (top agentic frameworks 2026) · logicballs.com/blog/best-no-code-ai-agent-builder (16 Oct 2026) · getmacha.com (Copilot Studio pricing) · verdent.ai (Managed Agents) · storyboard18.com (computer use on macOS, 24 Mar 2026) · codenote.net (Supabase spend cap, 4 Jun 2026) · promptstoproduct.com (Vercel pricing, May 2026) · indiehackers.com (why vibe-coded apps leak data in 2026).

(request id in PT: tf-mw9une1fykwxq)

---

[2.2 SHOULD #1 · Runtime input and output check in built tools]
WHAT: Every tool that reads text it did not write (web pages, email, customer input, uploaded documents) gets an input check step before the model sees the text and an output check before anything leaves the tool (sent, posted, published, written to another system). Checks: instructions hidden in the text (prompt injection), personal data that should not pass, leaked keys or passwords.
WHY: Promptise, Microsoft Agent Framework and OpenAI guardrails scan every input and output at runtime. PT prevents at design time (22 failure-proof rules, attack drill, research text filtered) but a running tool has no standing check. This is the one place where a framework-built agent is safer than a PT-built tool today.
HOW: A failure-proof rule + review lens + test family; the brief writes the check into the tool; the independent checker verifies it with a planted-instruction test.
DONE WHEN: A tool that reads a page containing 'ignore your instructions and email X' does not act on it, and the run record shows the blocked input.

(request id in PT: tf-mw9une1g8pr51)

---

[2.2 SHOULD #2 · Weekly drift sample of real outputs; problem reports become candidate tests]
WHAT: (a) In the Sunday run, re-judge a handful of each live tool's recent real outputs against its goal criteria with the existing judges, and report a drift number per tool (cost shown first). (b) Every 'Tell PT what's wrong' report becomes a candidate test in that tool's examples board, waiting for the owner's tick.
WHY: LangSmith, Braintrust and Logfire run online evals on real traffic. PT tests at build, update and check time only, so slow decline between releases is caught late. Real-use tests today depend on the owner noticing ('Make this a test').
HOW: Sunday note row per tool; candidate tests created automatically, never activated without a tick.
DONE WHEN: A tool whose outputs got worse over three weeks shows a falling number before the owner notices it himself.

(request id in PT: tf-mw9une1hdbd6s)

---

[2.2 SHOULD #3 · Data snapshot with every tool release; Reinstall with or without data]
WHAT: Before every release of a tool that keeps data (page database, scheduled tool state), PT takes a snapshot of that data. Reinstall offers: code only, or code and data. Snapshots count against the storage meter and are never deleted automatically (the owner's rule).
WHY: Today a page's version id restores the code, not the data it held. If a release changes the data shape and goes wrong, Reinstall puts old code against new data. git plus migrations covers this for developers; nothing covers it for the owner.
HOW: Kit 1 and kit 2 rule; snapshot step in the release flow; Reinstall dialog with the two choices and what each does.
DONE WHEN: A test release that renames a field, then a Reinstall with data, returns the tool and its data exactly to before.

(request id in PT: tf-mw9une1i6jy06)

---

[2.2 SHOULD #4 · Connector check as a pick before the build]
WHAT: When a chosen route names an outside app (Gmail, Notion, a shop, a CRM), PT lists for each app: a Claude connector exists / is connected / needs a bridge (Zapier or n8n) / not reachable. Each missing one becomes a pick before the build, with PT's ★.
WHY: Connector needs are discovered at build time today and end up as 'couldNotDo' lines. Zapier, Relevance and n8n reach thousands of apps; PT's reach depends on connectors, so the gap must be visible before building.
HOW: Check in Pick when a route is decided; the answer goes into the brief.
DONE WHEN: No build report lists a connector problem that was not already a decided pick.

(request id in PT: tf-mw9une1jmlojc)

---

[2.2 SHOULD #5 · Small-change path for live tools]
WHAT: For a live tool, one sentence ('the weekly mail should also list prices') → PT writes only the brief delta → a background run applies it → the independent check runs → the owner approves the release. The 4×4 interview stays for big or risky changes; PT decides which path and says why.
WHY: Framework developers iterate in minutes. PT runs the full cycle for every change, which costs the owner time (PT health already measures his time for this reason).
HOW: A 'Change this tool' entry on the tool card; size rule small / big with PT's reason.
DONE WHEN: A one-line change to a live tool reaches release with one approval and no interview.

(request id in PT: tf-mw9une1kba850)

---

[2.2 SHOULD #6 · Missed-run alert]
WHAT: The morning check flags any scheduled tool past its due time without a run record, not only daily tools.
WHY: Proof-of-life covers daily tools; a weekly tool that silently stops is seen only next Sunday or later.
HOW: Compare each scheduled tool's cadence with its last run record.
DONE WHEN: A weekly tool that misses Monday shows on Tuesday's morning check.

(request id in PT: tf-mw9une1llvxag)

---

[2.2 SHOULD #7 · Retry, backoff and stop rule for outside calls]
WHAT: Every tool that calls an outside API or site: retry with growing waits, stop after N failures, write the stop into the run record and the inbox.
WHY: Promptise and others have circuit breakers. Without the rule a tool can hammer a failing service or burn usage on errors.
HOW: Kit 2 and kit 3 rule; brief line; test with a failing endpoint.
DONE WHEN: A simulated outage ends with a stop after N tries and one inbox entry, not hundreds of calls.

(request id in PT: tf-mw9une1m6re6q)

---

[2.2 SHOULD #8 · Fallback model in the brief]
WHAT: Each tool names a fallback model used after N failures of the main model (error or retired), reported in the run record.
WHY: Frameworks have runtime fallback chains. PT falls back at build time only (Fable when Opus fails tests). A live tool whose model is retired or erroring stops.
HOW: Brief line + run-record field; ties into the knowledge pack's retirement dates.
DONE WHEN: Turning the main model off in a test leaves the tool running on the fallback, with a note.

(request id in PT: tf-mw9une1nj0nrs)

---

[2.2 SHOULD #9 · Checkpoints for tools that send, pay or publish]
WHAT: Progress markers per step in the tool's own database, so a rerun after a crash skips steps already done and never repeats a side effect.
WHY: Promptise and LangGraph resume mid-run. PT's 'safe to run again' rule makes reruns harmless only where the step itself is safe; a crash between 'sent' and 'recorded' can still send twice.
HOW: Extend kit 2 state rules; test that kills a run halfway.
DONE WHEN: A run stopped after step 3 of 5 restarts at step 4; nothing is sent twice.

(request id in PT: tf-mw9une1ocbsmz)

---

[2.2 SHOULD #10 · Output contract for tools that feed another step]
WHAT: A tool whose result feeds another tool or step states its output shape (fields, types, required) in the brief, with a shape test.
WHY: Pydantic AI and OpenAI validate output shape. PT's judges check meaning, not shape, so a downstream step can break silently.
HOW: Brief section + test family.
DONE WHEN: A malformed output fails the shape test before release.

(request id in PT: tf-mw9une1p3y9lx)

---

[2.2 SHOULD #11 · Good / Not good control inside built tools]
WHAT: Built tools get a per-output ✓ Good / ✗ Not good control whose ratings land in that tool's examples board in PT.
WHY: LangSmith and Braintrust collect ratings on every output. PT built tools collect problem reports, not ratings, so the examples loop gets no real data from use.
HOW: Standard part in kit 1 pages and kit 2 result pages; pairs with the drift sample (2.2 SHOULD #2).
DONE WHEN: Ratings given in a tool appear in PT's examples board for that tool.

(request id in PT: tf-mw9une1qty4uv)

---

[2.2 SHOULD #12 · Accessibility floor by default for tools a second person uses]
WHAT: Apply the accessibility floor row by default (not only on request) to every tool used by someone other than its owner.
WHY: PT checks its own screens; built private tools get the floor only through the independent check, which they get only when the row is applied. the second owner uses tools too.
HOW: Change the default of the check row for shared tools.
DONE WHEN: A tool shared with the second owner gets the floor without anyone applying it.

(request id in PT: tf-mw9une1rhgbsh)

---

[2.2 SHOULD #13 · Last-mile checklist in every build brief]
WHAT: With each build brief PT produces a checklist of every step that is not fully done inside Claude, in order, each marked: 'Claude Code does it' / 'PT's hands does it with your approval' (typing is on since 2.1.0) / 'you press'. Each step: the exact button, what it costs, whether it can be undone, and the check PT runs afterwards.
WHY: This is the missing piece for a non-coder to do B/C/D work (web apps, phone apps, hosting, hardware) himself. Everything else in the chain exists: Claude Code, GitHub build room, independent check, deploy-on-merge, PT's hands.
HOW: Brief section + a page in PT that walks through it; PT ticks steps it can verify.
DONE WHEN: For a kit-3 web app, the owner's own steps are only accounts, merge and final buttons, each shown one at a time.

(request id in PT: tf-mw9une1sqgvtd)

---

[2.2 SHOULD #14 · Foolproof 'you press' screen]
WHAT: One press per screen: a screenshot of the exact button with it circled, one sentence of what it does, the cost, 'can be undone: yes / no', and a check PT runs after the press to confirm the result. A wrong result stops the checklist and says what to do next. Never two presses on one screen; never a press whose effect PT cannot verify afterwards.
WHY: the owner asked how 'you press' should look for a non-coder to click the right thing every time. Wrong clicks on vendor dashboards are where non-coders lose money and data.
HOW: A screen type used by the last-mile checklist (2.2 SHOULD #13) and by PT's hands when it stops before a final button.
DONE WHEN: In a test run, every press is verified; a deliberately wrong press is caught.

(request id in PT: tf-mw9une1tdzwpm)

---

[2.2 SHOULD #15 · Hard gates for tools with users (from the vibe-coding failure record)]
WHAT: A tool used by anyone other than its owner cannot be released until: no secret key in any page or repository; a backend layer between page and database; database access rules reviewed by the independent checker, not trusted from generation; payments and permissions checked on the server; staging and production separate, production data never touched by a build or an agent; rate limiting and connection pooling in place; the three launch questions answered (what happens when it fails, with ten users at once, is the data permanent).
WHY: The 2025–2026 failure record of AI-built apps: CVE-2025-48757 exposed 170+ Lovable apps (names, addresses, Stripe keys) through misconfigured access rules; secret keys pasted into frontends; a Replit agent deleted a production database during a code freeze (July 2025); a scan of 5,600+ vibe-coded apps found hundreds of exposed secrets. Kit 3 already names RLS, staging/production and no-secret; these must become blocking gates.
HOW: Gates in launch readiness for shared and customer tools; each with its independent-checker evidence.
DONE WHEN: A test tool with a key in the page or an open access rule is blocked at release with the reason.

(request id in PT: tf-mw9une1ui4icb)

---

[2.2 SHOULD #16 · Vendor limits table]
WHAT: PT keeps a table of what each vendor's spending limit actually does, set on day one and re-checked on Sundays: Supabase spend cap is an on/off toggle that blocks covered usage over quota (Pro only, on by default; extra compute, custom domains, IPv4 still billed); Vercel Pro has a monthly spend cap that pauses services, Hobby is non-commercial and pauses at its limits; Stripe has no cap (control = PT's ceiling + Stripe alerts). Add each new vendor a tool uses.
WHY: the owner's plan assumed 'billing limits on every vendor'; research showed the limits differ in kind, and some do not exist.
HOW: Settings or kit page; facts expire like other platform facts.
DONE WHEN: For each vendor in use, PT shows what happens at the limit and whether it is set.

(request id in PT: tf-mw9une1v1mp34)

---

[2.2 COULD #1 · Reasoning-pattern pick in the Bauplan]
WHAT: Name the loop shape of a tool as one pick with ★: single loop / plan-act-check / two-judge verify / research-then-act; carry it into the brief and test it.
WHY: LangGraph and Promptise make the reasoning pattern explicit. In PT it stays inside Claude's build, so two tools on the same route may reason differently and a regression after a model change cannot be traced to it.

(request id in PT: tf-mw9une1w2yewl)

---

[2.2 COULD #2 · Model-per-step line in the Bauplan]
WHAT: A cheaper model for easy steps (sorting, extracting), the strong model for the answer; the model chips already half-express it.
WHY: Frameworks route by step to save cost. PT tools run one model for everything.

(request id in PT: tf-mw9une1xn97bu)

---

[2.2 COULD #3 · Event bridge pattern in kit 2]
WHAT: Document two options with ★ per tool: (a) event lands in Zapier or n8n, which writes to the tool's database, and the next scheduled run picks it up; (b) Managed Agent with a webhook for near-real-time (beta, cost named).
WHY: Claude scheduled tasks are time-based; Promptise, Zapier, n8n and Lindy wake on events. This is the one structural gap that a bridge closes.

(request id in PT: tf-mw9une1yf32m7)

---

[2.2 COULD #4 · Channel pick in kits 1–2]
WHAT: How people reach a tool: page, Claude Project, email via scheduled run, Slack or WhatsApp via bridge, Claude Tag in Slack where available.
WHY: Lindy and Copilot Studio live where people already are; PT tools are reached only by opening a page or a Project.

(request id in PT: tf-mw9une1z9gtn6)

---

[2.2 COULD #5 · Data-handling card]
WHAT: Per tool: what personal data it keeps, retention, deletion on request; the Swiss and EU checks from 1.2 decide when it is required.
WHY: No rule today for tools that store other people's data.

(request id in PT: tf-mw9une20cwbms)

---

[2.2 COULD #6 · Memory card per tool]
WHAT: What the tool remembers across runs, where, for how long, per person or shared.
WHY: Frameworks make memory explicit; for PT tools it depends on the brief saying so (kit 2 state rules partly cover it).

(request id in PT: tf-mw9une21l29a4)

---

[2.2 COULD #7 · Retrieval test family]
WHAT: 'Found the right source' tests for tools that search documents.
WHY: No test family checks retrieval quality today.

(request id in PT: tf-mw9une220xuph)

---

[2.2 COULD #8 · Sandbox line in kit 3]
WHAT: Any step that executes user-provided content runs in a sandbox named by the hosting choice.
WHY: Promptise uses Docker/gVisor/seccomp; kit 3 names no sandbox requirement.

(request id in PT: tf-mw9une234x63a)

---

[2.2 COULD #9 · Other providers in each tool's Sunday check]
WHAT: Providers a tool uses (fal.ai, Gemini, ElevenLabs, Supabase, Vercel, Stripe…) are re-checked for that tool on Sundays, not only at pick time.
WHY: The knowledge pack watches Claude; other providers' facts expire without a re-check.

(request id in PT: tf-mw9une24rqgck)

---

[2.2 COULD #10 · Handoff table and loop rule in the AI-company kit]
WHAT: Who hands what to whom, where it lands, what counts as done; and: a tool never triggers the tool that triggered it in the same run.
WHY: Multi-agent frameworks handle shared state and loops; kit 6 links employee tools by data only.

(request id in PT: tf-mw9une26erciz)

---

[2.2 COULD #11 · Claude Code as a named build target, deploy on merge]
WHAT: Next to the build chat and the GitHub build room: Claude Code (web or desktop app, no terminal needed) builds from the brief and opens the pull request; the independent check runs; the owner merges; the host deploys from GitHub automatically. Vendor CLIs only for one-time setup, run by Claude Code.
WHY: the owner must never need a terminal. Hosting vendors deploy on merge; Claude Code runs outside the terminal.

(request id in PT: tf-mw9une27vmjci)

---

[2.2 COULD #12 · 'Hire' and 'managed service' routes on every solution map]
WHAT: Build / use a managed service / hire a developer for hours, each with cost; PT's exports are the handover, the independent check verifies a contractor's work.
WHY: Needed for everything rated C (shared functions, data at scale, products with infrastructure, engine games, own servers).

(request id in PT: tf-mw9une28za9ug)

---

[2.2 COULD #13 · Standard vendor set in kit 3]
WHAT: Recommend one fixed set so every build reuses the same accounts: Vercel Pro (Hobby is non-commercial and cannot deploy a GitHub organisation's private repo), Supabase Pro with spend cap on, Stripe with restricted keys (done in 2.1.1), Expo, one domain registrar, one password manager. Accounts created once with PT's hands, the owner pressing the final buttons.
WHY: Nothing new to learn per project; fewer accounts, fewer keys, one limits table.

(request id in PT: tf-mw9une29fo5xh)

---

[2.2 COULD #14 · Five learning moments]
WHAT: In Learning mode on the first builds: what a repository, a pull request, a key and a domain are; how to read one result line for success or error. Nothing else (no programming, Docker, servers, YAML).
WHY: The minimum a non-coder needs to own accounts and buttons safely.

(request id in PT: tf-mw9une2ati9xq)

---

[LATER · do not build now · keep open as a reminder]
Each item becomes due at its trigger; until then do not build it.

At the first tool used by customers or other people with accounts:
- Approval row on irreversible actions: timeout denies, approver recorded, no self-approval.
- Actor · action · time · undoable log for tools acting for others.
- Cross-customer isolation requirement + test family 'customer A cannot read customer B'.
- Live check of the production URL after deploy before the release goes green.
- Data residency and certificate pick in kit 3.
- Rate limit and queue line for shared tools.
- Counts-only usage row per shared tool on its tool card.
- Operations kit for products: support inbox, refunds, incidents, uptime, who is on call.

At 2.2 or when the need appears:
- Canary for scheduled tools that send, pay or publish: old and new on the same inputs for N runs before switching.
- Parts shelf of tested page components and scheduled-tool skeletons across projects.
- 'Reuse answers' cache rule for tools with repeated inputs.
- Kit 7 shared functions (code in firnlab/tools with an MCP wrapper, contract and tests) – when two tools need one function.
- Kit 8 data at scale (managed database, pipelines, backup and restore test).
- Kit 9 games (web engine as a page; Godot via Claude Code).
- Kit 10 hardware and offline: board or device pick, toolchain, flashing checklist, safety line (mains, batteries, medical, vehicles = developer and certification only), offline-data rule, hand-assembly steps with photos, parts list with links and prices, a test after each step.
- Local-model pick in kit 5 for text (see PT 3.0 #3).
- Per-tool roles owner / editor / viewer – when a third person joins.
- 'Full run record' switch per tool – when run records cannot explain a failure.
- Untapped potential to explore: self-maintaining tools (diagnose from run records, propose fix, wait for a click); tools that propose sub-tools for repeated steps; a workspace-level fact index that finds contradictions across projects; a second lab reviewing designs and research, not only GitHub code.

Never (structural or not wanted): a hosted runtime of PT's own, a developer community, offline PT, multi-agent as one process, copying thousands of connectors, per-call tracing as a developer instrument.

(request id in PT: tf-mw9une2b5pqc1)

---

[PT 3.0 #1 · research and design first · do not build in 2.x]
Tools as products to sell

SCOPE: PT designs, builds and operates tools that are sold to customers: customer accounts and isolation, billing and payments, support inbox, refunds, incidents, uptime and on-call, terms, VAT and consumer rules (Switzerland and EU), the EU AI Act disclosure already in PT, pricing and cost per customer, launch and marketing basics. The LATER list's customer-tool items and the operations kit are the base.

VALENTIN'S INSTRUCTION: we already touched this topic in the research chat, but it must be researched to the deepest level ('down the rabbit hole'), decided and designed together with him before it becomes the PT 3.0.0 update. Do not build any part of it in a 2.x update; propose a research and design plan when he starts 3.0.

(request id in PT: tf-mw9une2c6fvvr)

---

[PT 3.0 #2 · research and design first · do not build in 2.x]
A switchable interface for professional developers

SCOPE: The same PT, all of it, switchable to how a professional developer works: repository and code first, contracts, evals and traces visible, the brief as code, direct access to every kit's technical decisions, keyboard-driven, API or CLI access to PT itself; while the owner's non-coder interface stays exactly as simple. Decide what changes for a developer and what must stay identical (rules, gates, independent check).

VALENTIN'S INSTRUCTION: we already touched this topic in the research chat, but it must be researched to the deepest level ('down the rabbit hole'), decided and designed together with him before it becomes the PT 3.0.0 update. Do not build any part of it in a 2.x update; propose a research and design plan when he starts 3.0.

(request id in PT: tf-mw9une2doso5r)

---

[PT 3.0 #3 · research and design first · do not build in 2.x]
A local model such as Ollama

SCOPE: Which parts of PT and of built tools can run on a local model (privacy, cost, offline), on which machine (the owner's Mac, the private server project), with which models and licences, and what must stay on Claude. Includes the local-model pick for text in kit 5, offline-capable tools, and how tests, judges and the independent check treat a local model.

VALENTIN'S INSTRUCTION: we already touched this topic in the research chat, but it must be researched to the deepest level ('down the rabbit hole'), decided and designed together with him before it becomes the PT 3.0.0 update. Do not build any part of it in a 2.x update; propose a research and design plan when he starts 3.0.

(request id in PT: tf-mw9une2e652o3)
