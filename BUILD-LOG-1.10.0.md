# Build log 1.10.0 (3 Nov 2026)

Owner's GO: "GO" (3 Nov 2026, 03:34 Zürich), answering the offer "GO 1.10 hands" (test first, then build, full release check,
publish as 1.10.0), after "yes i want that to the highest ceiling maximally possible" on the question whether PT can click for him.
One-GO release: build, full gate, preview publish, live re-test, main publish, releases.json as a PR the owner merges.

## Checked first
- A separate page "PT Hands Probe" (owner's artifact, declares `db` and `host:claude_browser`), run twice in the owner's desktop app
  (Claude 4.4212.0, macOS). Run 1: 6 of 7 (the last read came before GitHub had filled its list). Run 2, with reading again: 7 of 7.
  Answer shapes recorded: preview_start "Opened the site in Claude's browser (tabId seed). …"; get_page_text "Title: …\nURL: …\n
  Source element: <main>\n---\n…"; find "Found N match(es) …\n- <role> \"<name>\" [ref_N] …"; computer scroll_to "scrolled ref_N into
  view"; navigate "navigated to <url>". `listTools()` listed the server with 7 tools. GitHub showed the owner's login (Edit/Delete).
- Platform rule (mcp.d.ts, contract 0.2.88): host servers only for the artifact's owner; outside the desktop app every call fails
  with `server_not_connected`; the app may confirm calls that are not read-only (`cancelled` when declined).

## What 1.10.0 is
- `src/v1100_hands.js`: Settings › PT health › "PT's hands" with three checks (open pull requests, this version's release, key end
  dates) and "Take me there" (each open pull request → the merge button; the key renewal card → the line each step names). The guard
  and the reasons are in the file's header and in RELEASE-CHECKS (1.10.0).
- Strings `hands.*` and `cl.1100.added` (`strings25.js`). Capabilities: the existing set plus
  `{server: "host:claude_browser", tools: ["preview_start", "navigate", "get_page_text", "find", "computer"]}`.
- Tests: `e2e1100_hands.py` 49 ok on both data sets; seven planted bugs in `check_the_pick.py`; the made-up browser in `mock.js`.

## Gate and publish
(filled in after the gate)
