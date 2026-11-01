# Build log 1.7.1 (1 Nov 2026)

Owner's GO: "GO 1.7.1" (one-GO release: build, full gate, preview publish, live re-test, main publish, releases.json as a PR).

## What 1.7.1 is
A small patch before 1.8 (PLAN-1.8 step 4): it measures the owner's time in PT for two weeks, so 1.8 can be held to
"no more than 1.7" (DESIGN-1.8-rev2 §0.12). Nothing PT does changes.

1. **Owner-time baseline** (`src/v171_measure.js`, strings in `src/strings11.js`)
   - tap = a button or choice the person presses (`[data-a]` action, changed select/checkbox/radio, sent form); only trusted
     events, so PT's own programmatic clicks never count; typing is not a tap
   - active minute = a minute with a tap, a key, a scroll or a touch while PT is visible (lower bound: reading alone is not counted)
   - per day, per workspace, per project (taps, minutes) and per action name; never text, never project content
   - stored at `<workspace>/metrics-<YYYY-MM-DD>/<tab id>`: one document per day and page load, written only by that page,
     so two windows (or a phone and a laptop) never overwrite each other; flushed every minute, when the page is hidden and on close
   - Settings · PT health: one row "Your time in PT (last 14 days)" — taps, active minutes, days, and per new project the
     average taps and minutes
2. **Name independence** (cause 59)
   - the public-repo name swap had touched code: the empty-second-workspace card looked for a name no workspace has, the keep
     flag had a new key (a kept card would have come back), new first workspaces were named "Owner"
   - now: the second workspace is found by place; any earlier `keep…` flag still counts; Keep writes `keepSecondWs`; the card names
     the workspace (`jw.sub` with `{name}`); default names come from `ws.default`; the 1.2 default-view migration applies to the
     first workspace; kit sharing looks at the names of the other workspaces instead of a fixed word; user-facing strings
     (gate.maintain, kp.lead.owner, fr.nameph, cl.10/cl.12 changelog lines) no longer carry a name
   - frozen baselines (`src_v*_backup`) and the 1.0 file: the remaining lowercase name removed; the old preview build in `dist/`
     (it no longer parsed after the swap) is rebuilt with this release
   - tests pick workspaces by position; the scrub check uses the data copy's own workspace name; no e-mail address in tests
   - static check `person` (hard) + planted bug in `check_the_checks.py`

## Checks
- `test/e2e171.py` (28 checks) on the real-data copy and on the made-up bundle: green
- static checks 0 hard / 0 review; strings complete; check the checks 29 of 29
- full gate: see below

## Gate and publish
(filled in after the run)
