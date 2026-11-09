# PT 3.0.0 — what we must not forget
Owner, 10 Nov 2026 00:22: "keep all in mind so we will make the update for the 3.0.0 update. store it wise so we will not forget."
Rule (D-2026-11-07-08, D-2026-11-10-03): nothing of 3.0 is built in a 2.x update. Each topic is researched to the bottom, decided and designed with the owner in chat first; then it becomes the 3.0.0 update. When the owner starts 3.0, PT proposes a research and design plan, beginning with this file.
Read at the start of any 3.0 work: this file, RESEARCH-IMPORT-2026-11-09.md (sections "LATER" and "PT 3.0"), BACKLOG.md ("PT 3.0.0", "LATER" lines), DECISIONS.md.

## The three topics
### 3.0-1 Tools as products to sell (and prompts?)
- Scope (owner, 7 Nov): customer accounts and isolation, billing and payments, support inbox, refunds, incidents, uptime and on-call, terms, VAT and consumer rules (Switzerland and EU), the EU AI Act disclosure already in PT, pricing and cost per customer, launch and marketing basics.
- Open question (owner, 10 Nov): sell prompts too? Not decided; research it together with tools (item 22's prompt library is the starting point: its data shape only adds fields, so a later "for sale" mark or licence field fits).
- Absorbed from the 50 Promptise items / the import's LATER list: approval row on irreversible actions (timeout denies, approver recorded, no self-approval) · actor-action-time-undoable log · customer A cannot read customer B (requirement + test family) · data residency and certificate pick in kit 3 · rate limit and queue line · counts-only usage row per shared tool · operations kit (support inbox, refunds, incidents, uptime, on-call) · live check of the production URL after deploy · the customer-only part of the hard gates (2.2.0 builds the part for any tool a second person uses; D-2026-11-10-02).
- Groundwork 2.2.0 lays: hard gates for shared tools, vendor limits table, standard vendor set, last-mile checklist, "you press" screen, data snapshots and Reinstall with data, runtime input/output check, Good/Not good ratings, hire/managed routes.

### 3.0-2 A switchable interface for professional developers
- Scope: the same PT, all of it, switchable to how a developer works: repository and code first, contracts, evals and traces visible, the brief as code, every kit's technical decisions directly, keyboard-driven, API or CLI access to PT; the owner's non-coder interface stays exactly as simple. Decide what changes and what must stay identical (rules, gates, independent check).
- Groundwork 2.2.0 lays: output contracts and shape tests, Claude Code as a named build target, AGENTS.md export already in PT.

### 3.0-3 A local model such as Ollama
- Scope: which parts of PT and of built tools can run on a local model (privacy, cost, offline), on which machine (the owner's Mac, the private server project), which models and licences, what must stay on Claude; the local-model pick for text in kit 5; offline-capable tools; how tests, judges and the independent check treat a local model.
- Groundwork 2.2.0 lays: fallback model in the brief, model per step.

## Waiting items with their trigger (not 3.0 by themselves; due when the trigger happens)
- At 2.2 or when the need appears: canary for send/pay/publish tools · parts shelf · reuse-answers cache · kit 7 shared functions (when two tools need one function) · kit 8 data at scale · kit 9 games · kit 10 hardware and offline · per-tool roles (a third person) · full run record switch (when run records cannot explain a failure).
- Untapped, research only: self-maintaining tools · tools proposing sub-tools · a workspace fact index finding contradictions across projects · a second lab reviewing designs and research.
- Never: a hosted runtime of PT's own, a developer community, offline PT, multi-agent as one process, copying thousands of connectors, per-call tracing as a developer instrument.

## Research already done (starting points, re-check before use: prices 20 days, platform facts 45)
Frameworks and builders compared 7-9 Nov 2026 (RESEARCH-IMPORT-2026-11-09.md, "What was compared", "Key sources"); the vibe-coding failure record (CVE-2025-48757, exposed keys, a deleted production database); vendor limits (Supabase, Vercel, Stripe). Not done yet: the "deep pass" (PT code and database, every build report's couldNotDo lines, a CHF cost model per customer, Swiss/EU rules for sold products, the second owner's Chinese-first path).
