# Build log 2.0.0 (4 Nov 2026)

Owner's GO: "GO" (4 Nov 2026, 00:26 Zürich) to the full 2.0 scope listed in chat, then "all in one go. i want the next click
from me to be opening the PT 2.0 main ready to use" (00:28). One release, no owner preview try: build in five parts, full gate,
preview publish, Claude's own live re-test, main publish only on a green full gate, releases.json as a PR the owner merges.

## Checked first
- PT Platform Probe (owner's desktop app, 4 Nov 00:15): quick tier 0.9–6 s per label (12/12 right), a 20-route map in 36 s,
  sample input cap 256 KB, tools up to 16, db document 194 KB fine, sequential writes ~350 ms each (writes bundled).

## What 2.0.0 is (PLAN-2.0.md; RELEASE-CHECKS.md § 2.0.0 Parts A–E, causes 77–97)
- A Foundation: facts book per project (`p.ledger`), rules channel never cut plus output check, ask once, contradiction check,
  workspace profile out of project prompts, cross-project ★ removed, one Next with "✓ done", error cards (`v200_facts.js`, `v200_events.js`).
- B Solution map: goal → map → decide → details, coverage rounds from six angles, red-team, saturation note, compare, tripwires
  and Route alert, proven routes from other projects as templates only (`v200_stage.js`, `v200_map.js`).
- C Two modes: Chat with structure and Pick on one ledger; Steps, Blueprint, Journey, Swimlanes, Express removed; additive move
  to 2.0 with a "Before 2.0" restore point per project, idempotent (`v200_modes.js`); RC replay acceptance test.
- D Hands and loop: per-project site list, form typing and ordinary clicks, final-button stop, morning check, prompt tests,
  Improve PT reports, local metrics (`v200_hands.js`, `v200_loop.js`); hunt 5 (undo after the automatic trial) fixed.
- E Setup and helpers: nine guides; helpers Filesystem, Git, Fetch, Blender declared (`v200_setup.js`, `CAPABILITIES-2.0.json`).
- Strings `strings26.js`–`strings29.js`, `cl.200.*`; PT_VERSION 2.0.0.

## Gate and publish
- Gate, part by part, one at a time (2 CPUs: side-by-side runs timed out; leftover browsers were killed between runs):
  - A: 38/45 → 4 app bugs, a mock and old tests fixed → 45/45; on the final commit 44/45 (e2e200_loop L4 still asserted the old,
    untrue metrics line; fixed) → after the typing switch 45/45 (flows 1.5 review flaky once, green on its retry, in the ledger).
  - Pick tests: split into two halves after the whole run passed its 110-minute limit; 104/104 and 103/103 caught (no Pick code
    changed after this run).
  - Hunt check: 9/10 — check 28 (await race) had gone quietly empty (it looked for the step pages 2.0 removed); rewritten for Chat
    and Pick, fails when no answer starts → 10/10, and 10/10 again on the final commit.
  - Click everything: 0 problems, twice (before and after the typing switch).
- Preview publish refused form_input under host:claude_browser from a cloud session. Typing into forms is off (H20_TYPE = false;
  the card and the changelog say so; CAPABILITIES-2.0.json without form_input); A, the hunt check and click everything ran again.
- Preview published: version id 1793825785-5fb3 (previous 1793741106-aca6), contract 0.2.88 unchanged. Live body equals the built
  file; on the live file: smoke (0 errors), PT outside claude.ai (21 ok), pseudo-localisation (179 ok), 1.10 hands (54 ok),
  2.0 hands (52 ok), 2.0 modes (170 ok).
- Main published: version id 1793826109-ac8d (previous 1793741450-54e1), contract 0.2.85 unchanged; live body equals the built file.
- To switch typing on later: publish once from a local session in the Claude desktop app on the owner's Mac with form_input in the
  manifest, and set H20_TYPE = true (its tests already run with the switch on).
