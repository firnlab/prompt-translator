# Build log 1.9.4 (2 Nov 2026)

Owner's GO: "GO 1.9.4" (2 Nov 2026, 22:39 Zürich), after the question whether the key reminder should also cover the key in the
tools repository. One-GO release: build, full gate, preview publish, live re-test, main publish, releases.json as a PR the owner
merges.

## What 1.9.4 is
- Cause 76 (RELEASE-CHECKS): the yearly "Renew 2 keys" card in the Sunday note named only prompt-translator's secrets; the build
  repository keeps its own `CLAUDE_CODE_OAUTH_TOKEN` and `PT_PRIVATE_TOKEN`. Each part of the card now puts its new key into
  prompt-translator and then into the build repository (link to its Actions secrets page, following Settings › General), with the
  terminal kept open until the Claude key is in both places. Title stays "Renew 2 keys" (two keys, two places each).
- Offered in the chat as "a third part"; built inside the two parts instead, because GitHub shows a new key only once: a separate
  third part would come after the first key's terminal is closed.
- Texts: `care.keys.sub`, `a3`, `a4`, `b2`, `b3`, `l.env`, `l.act`, `done` changed (`strings18.js`); `a5`, `a6`, `b5`, `l.tact`,
  `cl.194.fixed` new (`strings24.js`). `e2e190_care.py` 108 ok, 0 failed; two planted bugs in `check_the_pick.py`, both caught.

## Gate and publish
(filled in after the gate)
