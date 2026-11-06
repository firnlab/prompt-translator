# PT 2.1.0 — build log (sprint 1, GO 6 Nov 2026 05:04)

Sprint goal: a safer PT and a test kit that cannot go quietly empty.

- App: the safety layer (src/v210_safe.js): safe item ids at import and load, no prototype keys, no data-bind path into the
  prototype, safeHTML on the main and care page, outside image links cleared at import, last raw selectors escaped, the inline
  onerror became a listener. Causes 102, 103. Changelog cl.210.fixed (en/de/zh).
- Tests and gate (wave 1): J1, J2, J3, J4, J5, J6, J7, J8, J9, J10, J11, J12, J13, J15, J16, J17, J18, J21, J23 (see BACKLOG.md),
  new suites e2e210_platform, e2e210_clicks, e2e210_safe (booby-trap import, export→import round trip), check_the_causes; all
  four in the gate.
- Sprint 2 (Ricardo relisting) off by the owner (D-2026-11-06-06).

## Change before keep (owner, 6 Nov 18:01)
- Pick → Pick Mode, Chat with structure → Chat Mode in every string (three languages), prompt, comment, test name and label; About rewritten (six paragraphs, accurate to 2.1: modes, what a project gets, promise and limits, AI steps and cost, web access and hands, data, reporting); 2.1.0 changelog gets a "Changed" block. Area tests green (modes 170, pseudo-localisation 179, 1.5 57, changelog 27). The built file changed, so the full gate runs again before the preview is republished.

## Red team and the second change round (6 Nov 23:00 – 7 Nov)
- Four red-team layers over everything since 2.0.0 (46 + 13 + 9 + 9 findings; verbatim in the session's scratchpad). Fixed here: the Design mock deleted by the filter (PT's frames exempt, src guard), raw number sinks coerced, import rewritten (whole-file check, counts, "from a backup" mark + lock + re-link, Undo via confirm, settings allow-list, projectId remap, object-held and numeric ids, depth 64), morning check reads pages only after "Watch these", typing on (form_input), download filename slugged, German "Pick-Modus", changelog rewritten, About approved line by line, CLAUDE.md: PT Flow + release rule + inbox rule; gate: minimum counts for every counted suite, fixtures/labels in every key, untracked = dirty, both builds, expected reds named, planted bugs cited by name.
- State at this commit: the built file changed after the FULL receipt of 6029de7; **no full gate on the current code yet** — it runs next, from scratch.

## Gate and publish
- Full gate GREEN, 54 of 54 checks, FULL on commit 6029de7 (built file sha256 e26ccc835b26953b…), receipt `receipts/2.1.0/full.json`.
- Run as parts on the final code (one part per 2-hour window): hunt check 9 min (31/31), click everything 40 min, part A 28 min (50/50),
  Pick part 1 37 min (104/104), then one `--resume` run 38 min (37 checks reused by key, Pick part 2 103/103 and the gate self-test ran again).
  Wall time of the final gate ≈ 2 h 30 min; a from-scratch full gate ≈ 2 h 35 min. Measured first here; the next sprint compares against it.
- Fixed on the way: a receipt committed between parts counted as "a different commit" (receipts now carry the code tree, self-tested).
- GO 2.1.0 (owner, 6 Nov 17:35): preview published, version id 1793982956-0929 (previous 1793825785-5fb3), contract 0.2.88 unchanged,
  manifest = CAPABILITIES-2.0.json (no form_input). Live body equals the built file (3 472 647 bytes inside the platform skeleton).
  On the live file: smoke (0 errors), PT outside claude.ai (21 ok), pseudo-localisation (179 ok), 1.10 hands (54 ok), 2.0 hands (52 ok),
  2.0 modes (170 ok), 2.1 safe (36 ok). Stopped here: main publishes after the owner's keep click.

## Retrospective (one line)
The gate's own plumbing (labels, resume, receipts, time limits) took longer than the feature work; next sprint starts the long parts first and keeps the test kit frozen before the final gate.
