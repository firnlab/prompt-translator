# Build log 2.2.0
Owner "GO 2.2.0" 10 Nov 2026 00:52 (D-2026-11-10-01: everything in one update). Branch rel/2.2.0 from the records branch (PR #33) + main.

## Items
- Item 23 Chinese typing in Ctrl+K: guard in the input handler + compositionend render (src/actions.js); test K.ime-search in e2e210_clicks.py; manual plant: guard removed → K.ime-search red [1, False, 2, '你好'], restored → green (10 Nov). Cause 112.
