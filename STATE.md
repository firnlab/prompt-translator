# State (hand-written until FL-7 generates it; read first with CLAUDE.md, BACKLOG.md, DECISIONS.md, releases.json)
- Live main: Prompt Translator 2.0.0 (artifact VjEPcpnocMTPMwHvHdwTZ3). Live preview: 2.1.0 pre-rename build (version 1793982956-0929) — superseded by the next publish.
- Running item: PT 2.1.0 release on branch `sprint1` (large lane). Code done incl. the red-team fixes 1–9 of 7 Nov; About approved by the owner; CLAUDE.md carries PT Flow and the release rule.
- Next: quick checks → full gate from scratch on the final commit (parts, then one --resume run for the FULL receipt) → owner's "GO 2.1.0" → main published directly → owner tests in main → releases.json PR and code PR for the owner to merge.
- 2.1.0 is live in main (7 Nov 05:44, version 1794026648-f594, published by the owner from a local task; rollback = previous 1793826109-ac8d).
- 2.1.1 (small lane) collects Fix items from the owner's testing: FIX-2.1.1-1 release check (branch fix/release-check). Ships together when the owner says so.
- Waiting on the owner: merge of PR sprint1 → main (code + releases.json; the release workflow then tags v2.1.0); his word on the one open Improve-PT report (fixed / none); testing 2.1.0 in main with his projects → Fix items.
- Appetite (PT work, estimate): full gate ≈ 2 h 35 from scratch (measured 6 Nov); this item has used about one working day of sessions since 6 Nov 03:56.
