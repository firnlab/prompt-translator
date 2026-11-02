# Build log 1.9.1 (2 Nov 2026)

Owner's GO: "GO, all 4 in one go" (1 Nov 2026, 15:30 Zürich), step 4 = 1.9 (PLAN-1.9.md), wave 1.9.1. One-GO release: build,
full gate, preview publish, live re-test, main publish, releases.json as a PR the owner merges.

## What 1.9.1 is
Two sides, built apart and then checked against each other.
1. **PT side** (`v191_judge.js`, `v191_lab.js`, `strings21.js`, `test/e2e191_judge.py`):
   - Independent check: a third gate row ("tests", "drill", "independent check") and a judge job through the runner after a build
     result, a verified update and a pasted or read build report. Commit first, every line with evidence, the builder's report only
     at step 3, security and accessibility floors. PT counts it green only when everything holds (never the verdict word alone).
     Not green blocks the release (block card: make fixes, or check again); a kit run is green only with a judge pass.
   - Second opinion from another lab: a check row that stays off until the owner marks SECOND_LAB_API_KEY as added in GitHub
     (Settings › General, kit defaults; no key field anywhere). Applied, the brief (PART R) and the GitHub build issue mark it in
     `tool.json`; the GitHub workflow runs the review after the pull request.
2. **GitHub side** (`firnlab/tools`, PR #1): one approval runs build → sealed twins (kept only in pt-private, fetched or written
   after the build step) → independent judge (commit first, verdict committed and commented) → second lab (even ISO weeks the
   other lab through `scripts/second_lab.py`, odd weeks a fresh Claude; must-fix / unsure / overthinking; one more opinion; no loop).
   `test_harness.py` 26 of 26 with a local server and a local bare repository; `harness check` CI green.

## Integration
- Cause 73: PART R had the builder call the other lab with the key, while the workflow keeps the key in its own script; PT offered
  providers the script cannot call and a lab in odd weeks; the issue never asked for `tool.json` acceptance lines. Aligned, tested,
  4 planted bugs (RELEASE-CHECKS).
- Builder's decisions kept: the second-lab row needs a tap even on shared tools (it spends money outside the plan); the judge
  inside a kit run is part of the owner's GO; a live tool with pages or tasks is judged after its update job republishes; a judge
  fail in a kit run leaves the update live (restore by hand); the cost per review is a labelled estimate.
- Known double work: a GitHub build gets the build room's judge in the pull request, and PT's own judge once its report is pasted
  (PT's release gate counts only PT's).

## Never tried for real (named at publish)
- The judge job on the real runner; the whole GitHub build room (first real `@claude build`); sealed twins (need the
  pt-private key in firnlab/tools); the second-lab review (needs a key, off until then). From 1.9.0 still: push, the kit run.

## Gate and publish
(filled in after the gate)
