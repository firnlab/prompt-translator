# Build plan 1.1 + 1.2 → released as 1.2.0 (started 19 Oct 2026 04:15)

Principle (owner, 04:11): every engine setting is "PT recommends (Auto), you can override with one click", like the model auto choice. G1–G4 overrides need a one-sentence reason (D1). Consistent chips everywhere: `Auto · X` / `You chose · Y` + "Back to Auto".

## 1.1 quick fixes and current rules
1. Gap 1 cost/length guard: ≥20% longer or costlier than last release = regression → readiness + release gate, override with reason.
2. Gap 2 borderline judging: judge may answer "unknown" and gives confidence; unknown or confidence < 0.7 → user decides.
3. Gap 3 judge reliability: JUDGE_V on every result; user labels → TPR/TNR after ≥30 labels; shown in Test › Judges.
4. Gap 4 new kinds of input: collect job flags inputs not covered by test categories; any inbox item → "Make this a test" (AI drafts, marked from real use).
5. Gap 5 grouped sign-off per severity, 4-line card (goal · change · risk · undo).
6. Gap 6 fallback copy stamp: copy-loader records p.tool.fallbackV; warn when live is 2+ releases ahead.
7. Gap 7 real-tool smoke check: job kind "smoke" opens published artifacts/documents read-only; offered in Operate › Health and after a build report.
8. Gap 8 budget: warn only, never block (no confirm); weekly workspace budget + monthly per-project warning; fixed share for refresh/checks.
9. k = 3 test runs; pass^3 and flip rate; flaky tests flagged; seal recheck 3 trials.
10. "Same family (Claude)" label on the second judge (D7).
11. Model rules for Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1 (dated): no prefill / budget_tokens / sampling params, effort instead, remove verification text, explicit scope/length, report-all-then-filter.
12. 5-generation lint: verification text, severity filters, prefill/budget_tokens/temperature mentions, CAPS.
13. Review lenses receive matching rules (LENS_RULES).
14. Concrete model chip: tier + last model actually applied (sample modelApplied).
15. Understand needs 3 of 4 artefacts; aiExisting fills scores; keep 12 test runs.
16. Skill lint: description > 200 chars warning, > 1,024 error; name must not contain "claude"/"anthropic", ≤ 64 chars.
17. D8 audience question in Capture (customers? EU?) → Art. 50 + GDPR/nDSG/FDPIC foresight and legal-lens rules.
18. Tool card (one page) at every release; download as .md.
19. Owner default view Blueprint/Pro/EN (migration 1.2 for projects whose mode was never chosen).
20. D9 Second owner separate: fresh account → first-run setup (name, language, defaults); no auto "Second owner" workspace; runner only for owner by default, explicit "Set up background runs" (create_trigger on click) for other accounts; offer removal of the empty "Second owner" workspace in Owner's login (confirm).
21. SPEC 14D.1 naming R1 → v1.0.

## 1.2 frontier engine (p.engine)
- Knowledge pack as data: shared docs `kp/pack` (read: all, write: owner) + `kpprop/<id>` proposals (owner only). Built-in pack is the fallback seed. Every item: src, verified, expires/recheck; > 90 days = "possibly stale". Approve/reject per item in Settings › Knowledge (owner only). Second owner reads the approved pack.
- Weekly refresh: cron task Sundays 20:52 Europe/Zurich, proposals only (D4: everything asks). Same instructions as job kind "refresh" (button "Check now"). Urgent items (retirement of a model a live tool uses) show in Cockpit at once (in PT only).
- Frontier scan (D2: every project; short on Quick track): background job "frontier" after Capture/Understand: restated task + success criterion, existing solutions (buy/adopt/build verdict), capability fit per requirement (feature, maturity), reliability flags, suggested gate answers, suggested dials, ceiling option.
- Gates G1–G7 (D1): G1 existing product, G2 value proof, G3 exactness, G4 task shape, G5 maintenance, G6 red lines, G7 trifecta. Answer yes/no/unknown with evidence; scan pre-fills; G1–G4 must be answered before Architecture is done; override with reason.
- Right-sizing score: 7 dimensions 0–2 (AI suggests, you can change) → suggested rung; error cost caps autonomy; maintenance caps rung.
- Four dials, all Auto with override: A rung R0–R5, B model + effort, C platform (claude.ai / code route [off] / Managed Agents [off, shown as ceiling]), D autonomy L1–L5 (D3 default: act, you approve key steps = L3; only you raise it).
- Tracks Quick / Standard / Full: Auto from score, override.
- Trial run (Auto: recommended for agents/scheduled tools; you can switch on/off): 10–20 cases drafted from the interview, you can edit or mark real; plain prompt run + batched judge; failures recorded.
- Mini-test (Auto, top 2 settings): recommended setting vs one step up; 5 cases × 3 tries; pass^3, flip rate, usage per success (proxy).
- Ceiling card (3 languages): recommended vs ceiling; measured values; why not the ceiling; what would make us climb. Frozen into the build brief and release notes.
- Climb log: every move up records "rung/setting N failed at X"; moving down counts as success.
- Readiness: 13th check "Frontier & right-sizing" (scan done, gates answered, dials set, ceiling card, trial/mini-test done when recommended).
- Brief: PART E engine decisions (gates, dials, ceiling, climb triggers).
- Maintenance: model changes from the pack → re-check items in each live tool's inbox; monthly digest in Cockpit (climb-or-descend suggestions).

## Delivery
- Preview artifact first (13.4) with a copy of the real data; background runs from the preview pass its URL ("PT job <coll> <id> <url>"); runner prompt updated to accept the URL and the kpprop collection for refresh jobs.
- Opportunity Explorer read-only test in the preview (Check existing work → scan → gates → ceiling card). Its page and weekly task untouched.
- Main link only after the owner tries the preview and says so.

## Progress (19 Oct ~05:40)
- 1.1 + 1.2 code complete; strings4.js EN/DE/ZH complete (translation agent, terms list in its report).
- Storage: restore points now share content-hashed parts under projects/<id>/rparts (field-level split ≥20 KB); delete removes only unreferenced parts. Found because full-copy restore points overflowed 5 MB test storage.
- Tests: test/e2e12.py (1.2 flow incl. engine, knowledge pack, Second owner separate login) 0 fails; migrate_real.py 0 fails.
- NEXT: independent review of 1.2 → fixes → preview artifact (copy data) → runner prompt update (URL + kpprop) → OE read-only real scan → Sunday refresh task (create at main publish) → hand-over.
- PREVIEW artifact: https://claude.ai/artifact/Rvmfdxmam24MNp8wCM9UQs (build: python3 build.py <that url> → dist/prompt-translator-preview.html). Capabilities: db rules kp(read view, write owner) + kpprop(owner/owner), user, sample images, downloads, mcp 4 tools (create_trigger for the explicit Second owner setup click).
- Data copied to preview 19 Oct ~05:15 from live main (live-0510 snapshot): meta v7 (Owner + empty Second owner ws from the 1.0 migration at 03:16), Owner ws, Second owner ws, 2 projects (v730, v3 untouched), 6 notes.

## Final check (19 Oct ~05:45)
- OE real scan in preview: job job-mvep2j5xg3jc6 done in ~70 s; verdict partial (keep own build, buy nothing); 4 existing solutions, 4 sources all opened and confirmed by hand; 7 gates suggested (G2, G5 yes; rest no); ceiling Fable 5.1 + fan-out.
- Fix found by the real test: imported scheduled tools showed R2/Quick/no trial. New runsOnItsOwn(p) (design, package, intake, scan) → rung floor R3 unless a gate fires; trial recommended; track Full (matches the track text). Preview build 3 published (version 1792381288-db84).
- Result after fix: R3 · Opus 5.5 high · L3 (scan said L4, capped by D3) · claude.ai · Full; 13th check open item = trial run.
- Tests: e2e12 0/0; migrate_real (v1 backup) 0/0; live-0510 snapshot (2 workspaces, picker) all kept except 2 updatedAt stamps (expected); i18n complete (brief.s = dynamic key, false alarm); e2e10 superseded by e2e12 (D9 removed the auto Second owner picker).
- Access rules checked live on the preview: kp readable at view, not writable at interact; kpprop hidden at interact and admin. Test docs removed.
- Untouched: OE page (17 Oct), OE task (16 Oct), main link (1.0).
- Observation (not changed): the OE weekly task runs on claude-opus-5; current is Opus 5.5.

## Released (19 Oct 11:18)
- Main link https://claude.ai/artifact/VjEPcpnocMTPMwHvHdwTZ3 → 1.2.0 (version id 1792401486-f03f), capabilities db rules kp/kpprop, user, sample images, downloads, mcp 4 tools. Data unchanged after publish (projects v730, v3).
- Backup before publish: scratchpad/PT-data-backup_2026-10-19_1116.zip (identical to live-0510).
- Weekly knowledge check: trig_01GGn4Z1z649ET8hzW3zSt2D, CRON_TZ=Europe/Zurich 52 20 * * 0, auto approval, no push/email, first run 25 Oct 20:52.

## 1.2.1 (19 Oct ~12:35) — version everywhere (owner request 11:28)
- Page name "Prompt Translator <ver>" (+ " Preview"), from PT_VERSION in build.py.
- Chip under the name: "<ver> ✓ newest"; shared doc app/version (rule read view / write owner) written only by the owner's page, never lowered; checked at start, on tab focus/visible and every 10 min; older tab shows orange "<new> available · Reload".
- What's new lists every version since the last one this login saw.
- Chat rule: always write links as "Prompt Translator <ver> (main, your real data)" / "(preview, copy of your data)".
- Test harness: e2e12 now served over http (file:// lost localStorage on reload ~1 in 3 runs, also before 1.2.1). 5/5 clean.
- Published main version id 1792405614-60ee, preview 1792405619-54e8.
