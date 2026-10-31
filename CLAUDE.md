# Working rules for this repository (Prompt Translator, "PT")

PT is one HTML file (`dist/prompt-translator.html`) built from `src/` by `python3 build.py`, published as a claude.ai artifact.
Owner: Owner (org `firnlab`). Second user: Second owner, own login, own workspace. These rules were set by the owner and hold in every session, scheduled runs included.

## Never without the owner
- **Publishing** (main or preview artifact) needs an explicit **GO** from the owner in that conversation. Before asking: full gate green (`python3 test/release_gate.py`), summary shown. No GO → no publish, no "quick fix" publish, no republish to fix a republish.
  - **One-GO release** (owner, 25 Oct 2026, for 1.7): "GO <version>" covers the whole release unattended — build, full gate after each wave, preview publish, re-test of the live preview, main publish, releases.json push — without further GO. Publish only on a green full gate; red → nothing publishes, the previous version stays live, the reasons are reported. A cut session publishes nothing half-way; the repo holds the state and the owner says "continue". Steps that need the owner's laptop or a secret are listed at the end, never improvised.
- **Documents**: write everything in the chat. No docs, pages, decks or sheets unless the owner asks for one. Internal repo notes (`*.md` here) and test files are fine.
- **Restore points / versions / backups**: the owner deletes them, via one click and a confirmation click. PT and Claude never delete them.
- **Costs**: anything that costs money (domains, API keys with spend, paid tiers, test runs that bill) only when needed for the step at hand, and only after naming the cost. Never add a payment card anywhere without a spending limit.
- **Keys and passwords**: never into chat, artifacts, issues, code, comments or commit messages. Keys go only into GitHub's secret store (repository secrets). The data guard (`tools/data_guard.py`) blocks pushes that carry one; never bypass it (`--no-verify`) and never add a real value to its ALLOWED list.
- **Project data**: the owner's and Second owner's project contents, backups, exports and PINs never enter the repository. Tests run on a copy under `work/` (git-ignored). CI runs only the data-free checks.
- Never retry the denied credential request (see conversation history); never scrape X, LinkedIn or Reddit; never auto-install packages or connectors on the owner's devices.
- Leave untouched: Opportunity Explorer (artifact `FSnhkTvcEKX4aDQxFXPquF`, trigger `trig_01QoaJrEReBgg2BnQZ8pZpm3`), runner `trig_01E9H3fe9ckZJbWPW7HtKuYX`, Docs artifact `5rN7mME5ts7DL2bRQ53kr1`.

## How we work
- Failing features stay **off** (never shipped half-working); say so in the changelog strings.
- Every change: build → `node test/static_checks.js` → the tests for the area → full gate before a publish. New bug → add its cause to `RELEASE-CHECKS.md`, a test that catches it, and (if it is a check that could silently stop working) a planted bug in `check_the_checks.py` / `check_the_pick.py` / `check_the_hunts.py`.
- Flaky tests are logged in `work/flaky-ledger.txt` by the gate, never silenced.
- Keep PT's platform knowledge (`src/knowledge.js`, `src/engine.js`) checked against **official** pages (platform.claude.com, support.claude.com, claude.com/blog); update `KP_VERSION` when it changes.
- Languages: English, German (Swiss: **ss** not ß, informal **du**), Chinese (Simplified). Every string key in all three (`node test/i18n14.js`).
- Links to PT are written as name + version + main/preview, never bare URLs in prose.
- Quick answers; messages at milestones and at the end, not a running commentary.
- Design to the ceiling; check the platform early; offer "Try it", never push it.

## Repository layout
- `src/` sources in the order `build.py` lists them; `dist/` built file (committed so every commit is runnable); `src_v*_backup/` baselines for static review (read-only).
- `test/` all checks (see `RELEASE-CHECKS.md`); `tools/` repository helpers (data guard, link check); `.githooks/pre-push` (install once: `git config core.hooksPath .githooks`).
- `work/` git-ignored: test-data copy, gate logs, bundles. Never commit it.

## Releases
- Version in `src/core.js` (`PT_VERSION`), changelog strings `cl.<ver>.*`, `BUILD-LOG-*.md`.
- After a GO and a publish: add the version to `releases.json` (date, commit, main and preview artifact ids with the live and the previous version id, notes) and push → the `release` workflow creates the tag `v<version>` at that commit and a GitHub release with the built file. Tags cannot be pushed from a Claude session (branch-only access); never try to work around that.
- Rollback = republishing the previous artifact version id from the tag message (needs GO).

## Inbox
GitHub issues only (templates: idea / bug / question); no Telegram (owner, 25 Oct 2026). At the start of a session: read open issues, answer or plan them, close what is done with one line.
