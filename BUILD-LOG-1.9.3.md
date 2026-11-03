# Build log 1.9.3 (2 Nov 2026)

Owner's GO: "GO notes fix now and GO 1.9.3 wording" (2 Nov 2026, 16:22 Zürich). One-GO release: build, full gate, preview
publish, live re-test, main publish, releases.json as a PR the owner merges.

## What 1.9.3 is
- Cause 75 (RELEASE-CHECKS): the Build page promised that GitHub waits for the owner's approval before a build in `firnlab/tools`;
  a private repository on GitHub Free has no such step. The three texts (`bld.sub`, `bld.s2.sub`, `bld.setup1`) now say that only
  a comment from the owner's own login starts a build and that GitHub adds no second approval step on a private repository.
- Static check `claims` and one planted bug in `check_the_checks.py` (31 of 31 caught). Changelog `cl.193.fixed` (`strings23.js`).
- Same GO, other repository: firnlab/tools PR #2 corrects the notes there (repository secrets, no environment; the lock is the
  login check); `test_harness.py` 26 of 26.

## Gate and publish
- Full gate in four parts (the session's background limit is 2 hours): part A 39 of 39 green (static checks with the new
  `claims` rule included); part B1 check the Pick tests 111 of 111 caught; part B2 check the hunt 10 of 10; part C click
  everything alone, 0 problems. No flaky test.
- Both files rebuilt after the gate, byte for byte the tested builds.
- Published (2 Nov 2026, about 20:45 Zürich): preview `1793648709-a256` (before `1793628914-30d1`); main `1793648891-af98`
  (before `1793629097-1653`). Capabilities carried forward.
- Live re-test: preview and main byte for byte the tested builds; smoke (0 errors), PT outside claude.ai (21 ok, 0 failed) and
  the pseudo-localisation check (179 ok, 0 failed) green on the live preview.
- Code commit: `d05ca4b`.
