# PT 2.1.0 — build log (sprint 1, GO 6 Nov 2026 05:04)

Sprint goal: a safer PT and a test kit that cannot go quietly empty.

- App: the safety layer (src/v210_safe.js): safe item ids at import and load, no prototype keys, no data-bind path into the
  prototype, safeHTML on the main and care page, outside image links cleared at import, last raw selectors escaped, the inline
  onerror became a listener. Causes 102, 103. Changelog cl.210.fixed (en/de/zh).
- Tests and gate (wave 1): J1, J2, J3, J4, J5, J6, J7, J8, J9, J10, J11, J12, J13, J15, J16, J17, J18, J21, J23 (see BACKLOG.md),
  new suites e2e210_platform, e2e210_clicks, e2e210_safe (booby-trap import, export→import round trip), check_the_causes; all
  four in the gate.
- Sprint 2 (Ricardo relisting) off by the owner (D-2026-11-06-06).

## Gate and publish
- Full gate GREEN, 54 of 54 checks, FULL on commit 6029de7 (built file sha256 e26ccc835b26953b…), receipt `receipts/2.1.0/full.json`.
- Run as parts on the final code (one part per 2-hour window): hunt check 9 min (31/31), click everything 40 min, part A 28 min (50/50),
  Pick part 1 37 min (104/104), then one `--resume` run 38 min (37 checks reused by key, Pick part 2 103/103 and the gate self-test ran again).
  Wall time of the final gate ≈ 2 h 30 min; a from-scratch full gate ≈ 2 h 35 min. Measured first here; the next sprint compares against it.
- Fixed on the way: a receipt committed between parts counted as "a different commit" (receipts now carry the code tree, self-tested).
- Preview publish and main publish: pending the owner's GO 2.1.0 and his keep click (two-GO rule).

## Retrospective (one line)
The gate's own plumbing (labels, resume, receipts, time limits) took longer than the feature work; next sprint starts the long parts first and keeps the test kit frozen before the final gate.
