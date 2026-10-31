# PT 1.0 build plan (builder's working file — read this after any context reset)

Spec: SPEC-1.0.md (authoritative). Prototype: proto/modes.html. This file = builder decisions + architecture + progress.

## Builder decisions on open points (tell user at the end)
- Step names (latest prototype): Capture · Understand · First questions · Assumptions & risks · Requirements | Architecture · Build brief · Review · Test | Launch · Release · Operate & update. Groups: Define / Design & check / Run. ids: capture understand interview assume require arch build review test launch release operate.
- Built-tool numbering: drafts = "Draft 1, 2…" (p.versionNo); releases = semver "v1.0", "v1.0.1" (fix), "v1.1" (feature/change), "v2.0" (big).
- PT itself: 1.0.0, three numbers, What's new + changelog.
- Build report: build chat writes it back into PT storage itself (doc reports/<briefId>); paste is fallback.
- Test step: 2 runs by default (trials=2) for release readiness.
- German: keep v1's formal "Sie" everywhere (v1 convention; prototype "du" was concept only). ss never ß.
- Chinese: Simplified mainland (agent converted strings.js+knowledge.js zh). New strings written in Simplified.
- Workspaces: on first 1.0 boot, if only one default-named workspace → rename "Owner" and create "Second owner" (zh, Guided, default mode Journey). Owner default: Pro, Blueprint? -> Steps default kept for familiarity? Decision: Owner default mode "steps" (his current familiar view) — prototype suggested blueprint; use prototype: Owner Blueprint/Pro/EN, Second owner Journey/Guided/ZH.

## Platform facts (proven)
- Background run (scheduled task) reads/writes PT storage via ArtifactData (data/users/me/...). T1.
- Background run can create/update/delete scheduled tasks; update sometimes blocked → fallback create-new, check, delete-old. T2.
- Chat inside a Claude Project can read PT storage. T3. (Chat write assumed; paste fallback.)
- Background run can publish + republish artifacts in place.
- Page mcp: capabilities.mcp = {servers:[{server:"Claude Code Remote", tools:["fire_trigger","list_triggers","update_trigger","create_trigger"]}]}; page calls callTool("Claude Code Remote","fire_trigger",{trigger_id,text}).
- db page API: no if_version; use acquire lease + _rev compare for safe saves.
- GitHub not connected → code route OFF (T4 pending).

## Architecture
- Files: knowledge.js, strings.js (+ strings2.js new keys, merged), core.js, tasks.js, tasks2.js (new AI tasks), app.js, items.js (item adapter, readiness, flags, restore, releases), views_shell.js, views_modes.js, views_phases.js, views_run.js (launch/release/operate), views_pages.js, actions.js, actions2.js.
- Storage paths: root data/users/<uid>; meta; ws-<id>; ws-<id>/projects/<pid>; .../projects/<pid>/versions/v<n>; .../projects/<pid>/restore/<rid>; ws-<id>/jobs/<jid>; ws-<id>/briefs/<bid>; ws-<id>/reports/<bid>; ws-<id>/live/<pid>; notes, patterns, research; toolfeedback/<id> (shared, Tool requests).
- Runner: poke-only trigger "Prompt Translator runner" (id stored in RUNNER_ID constant + META.runnerId override). fire text = "PT job <collection path> <jobId>".

## Progress checklist
(see bottom; update as you go)

Runner trigger id: trig_01E9H3fe9ckZJbWPW7HtKuYX (created 2026-10-19 00:06Z, poke-only, prompt = generic job executor).
v1 source backup: src_v1_backup/

## Progress (update)
- DONE: core.js (routing, usage, checked saves, Runner, jobs storage), items.js (engine), tasks.js edits, tasks2.js, tasks3.js, app.js (model, migration, Owner/Second owner, autoResearch), views_modes.js, views_shell.js (frame, start page, panel), views_phases.js (edits), views_run.js, views_pages.js edits, actions2.js, strings2.js (EN/DE/ZH by agent), strings3.js (test-time keys, write all 3 langs yourself), styles.css 1.0 block, mock.js 1.0, test/e2e10.py.
- Chinese of strings.js/knowledge.js converted to Simplified (agent).
- NOW: e2e10 test loop → fix → independent review agent → publish with capabilities {db,user,sample,downloads,mcp:{servers:[{server:"Claude Code Remote",tools:["fire_trigger","list_triggers","update_trigger","create_trigger"]}]}} at https://claude.ai/artifact/VjEPcpnocMTPMwHvHdwTZ3
- Decisions to report: step names; Draft n / v1.0 semver; German "Sie"; Owner default Steps, Second owner Journey+Guided+ZH; build report auto-written with paste fallback; 2 test runs; code route off until GitHub (T4).

## Storage limits (found with the real v1 data, 19 Oct)
- db docs max 256 KiB. Real project p-mvdsdqnoyglbu = 255,323 bytes in v1 → 1.0 would overflow.
- Store now splits projects + restore docs > 150 KB into header + content-hashed parts (<doc>/parts/<field>-<i>-<hash64>-<len>), parts first, header second, old parts deleted after (only when the remote header is ours). readDoc retries on part_missing.
- Briefs, releases, big job inputs: text chain (doc, doc~2, … with "next"); loader line, setup.loadertext and job instructions tell the reader to follow "next".
- Migration: one "State before the 1.0 upgrade" restore point; steps done in v1 marked done without a copy each; identical restore points merge.
- Backup of live v1 data: scratchpad/backup-v1-data. Real-data test: test/migrate_real.py <backup> <shots>.
- PUBLISHED 1.0.0 at VjEPcpnocMTPMwHvHdwTZ3 (version 1792372558-2559), caps db,user,sample(images),downloads,mcp[fire_trigger,list_triggers,update_trigger]. Data untouched until first open. Independent review: 19 findings fixed.
- 19 Oct 04:0x: owner decisions for 1.1 recorded in DECISIONS-1.1.md; leftover pages deleted. No code changed.
