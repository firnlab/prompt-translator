# Build log 2.1.1 (small lane: Fix items from the owner's testing of 2.1.0 and the red team of 7 Nov 2026)

## What goes in (owner, "all 10 as your rec", 7 Nov 17:40)
FIX-2.1.1-1 release check reads the releases list (cause 109) · D1 the laptop task stops at every gate (cause 110) · kitEngineRec matches whole words and keeps the ★ on the scheduled task while K3 is open · Health and the kit options follow the price clock like the Design page · RT-11 manifest check with `hosts` per artifact in releases.json (cause 111) · G5 the second owner's welcome without "1.8" · kit-fact sentences dated 7 Nov (Managed Agents, Vercel Hobby, Stripe restricted keys) · D10 comments · records (STATE, CLAUDE.md, BACKLOG, DECISIONS) · IMPROVE_FIXED "2.1.1" = none (the Capture report is not fixed, owner's tick).

## Checks
- Area suites green: health 98, checks 86, decide 71, kits 83, judge 81, loop 83, 1.10 hands 54, 2.0 hands 55, e2e16 128, e2e180_run 109, e2e17 91; check_the_causes 111 causes; changelog 27.
- Quick gate GREEN 42/42 on cbfc0e3 (receipt receipts/2.1.1/quick211.json), incl. the new "manifest" check: main equals the live set → cloud publish ok; preview adds claude_browser:form_input → omit `capabilities`.
- Preview published from the cloud on 7 Nov 19:xx with `capabilities` omitted (decision D-2026-11-07-07 (1)): version 1794071704-0c06 (previous 1793982956-0929), manifest carried forward (5 browser tools, typing off in the preview), contract 0.2.88 unchanged. No GO needed (release rule).

## Gate and publish
- Full gate from scratch on the final commit: running (parts B2, A, C, P1, P2, then --resume for the FULL receipt).
