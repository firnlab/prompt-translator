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
(filled in after the gate)
