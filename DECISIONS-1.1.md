# Owner decisions for the upgrade after 1.0 (19 Oct 2026, 04:0x Zurich)

Source: plan "Prompt Translator frontier upgrade" §7–8, answered by Owner.

## Decisions D1–D11
- D1 Gates G1–G4: STOP and explain; continue with a one-sentence reason (override logged). Never locked for good.
- D2 Frontier scan: every project; short version (existing products + model fit) on the Quick track.
- D3 Autonomy default: tools act, owner approves outward-facing, irreversible, money or login steps. Only the owner raises a tool above this.
- D4 Knowledge refresh: EVERYTHING is a proposal; nothing changes until approved (not the recommended "facts auto").
- D5 Budget: one weekly workspace budget + monthly warning per project + small fixed share for refresh and tool checks. Warn only, never block (spec 18.2 stays).
- D6 Code route: LATER, decide in 2.0 (not now). GitHub not connected for now; T4 stays open; code route stays off.
- D7 Non-Claude judge: label "same family" only; different Claude tiers; revisit with the code route.
- D8 Business use: per project; Capture asks "customers or people in the EU?"; yes switches on Art. 50 + GDPR/nDSG notices.
- D9 Second owner: FULLY SEPARATE (own Claude login, no shared approvals). Consequences for 1.1:
  - share the PT artifact with her account; her data lives under her own user id (private by db rules);
  - she needs her own runner scheduled task (triggers are per account) → PT must detect "no runner" and guide setup in her language, never fall back to Owner's runner id;
  - the empty "Second owner" workspace in Owner's login: offer to remove it (owner confirms), or keep as a demo;
  - defaults for her (Journey / Guided / Chinese) apply in her own account on first open.
- D10 Owner time: monthly ~10-minute digest; urgent items (broken tool, model retirement) immediately.
- D11 Leftover pages: DELETED 19 Oct 2026 (Runner Connection Test, Prompt Translator Modes).

## The 18 inferred 1.0 decisions
- All confirmed as built, except 19.7: Owner's default view → Blueprint / Pro / English (code currently defaultMode "steps": change in 1.1). Second owner: Journey / Guided / Chinese.

## Gaps and extras: fix all in 1.1
- Gaps 1–8 from AUDIT-interruptions.md as listed in the plan §8 (gap 8 per D5).
- Release naming in SPEC 14D.1 (R1 → v1.0).
- Model rules for Opus 5.5 / Sonnet 5.5 / Haiku 5.5; review lenses receive rules; concrete model chip; Understand threshold; existing.scores; keep more test runs.
- Skill description lint: >200 chars = warning, >1,024 = error; check "claude"/"anthropic" in skill names.

Status: decisions recorded only. No code changed. Build starts when the owner says go.
