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
(filled after the full gate on the released commit)
