# HANDOFF → PT chat: item 22 "My prompts where I type" (+ Chinese-typing fix, later items)

From: the owner's prompt-library chat, 7–9 Nov 2026. Checked by a four-round red team against the 2.1.1 code (each round re-checked the previous one). *Claude drafted this · the owner decides.* Nothing in this file is a GO. Follow CLAUDE.md as always (Idea card shown → map → GO → preview).

This replaces every earlier note on item 22 ("prompt store", 7 Nov). Owner wants it in the next update together with the other planned items.

## 0. Why (one paragraph, measured on the owner's full claude.ai export, 4,716 typed messages)
51 instructions recur 10+ times (fold in 637×, push to the ceiling 603×, audit 450×, hunt 433×). Retyping them is the waste; the ones that work best are short structured ones (6–11% rework); message drafts were corrected first in 68% of cases, mid-task rules failed 47%. Most of the owner's typing happens in claude.ai, so inside PT the library is the home of the prompts and claude.ai is reached by Copy.

## 1. Owner decisions already taken (log in DECISIONS.md before GO)
1. "Most used" (frecency: often + recent) is the default order; ★ favorites always first.
2. Auto-send exists, off by default, never for prompts with blanks. (Red team narrowed: Chat Mode only, per device, never for unopened Received prompts — confirm with owner.)
3. PT stays PT: no new mode or tab next to Pick and Chat. Library tab "Patterns" becomes "Prompts"; settings are a section in Settings › General.
4. Categories (owner's list): Favorites · Most used · Surface · Pick · Fold · Verify · Audit · Received (prompts from others/imports, marked "outside source") · Map · plus Starter (PT's own).
5. Every row shows: short name, what it does, the prompt, Copy, Choose (Choose = into the field the list was opened from).
6. Add / edit / delete any prompt; a settings area for everything logical.
7. The owner's 8 standing rules do NOT go into PT's prompts (they are claude.ai preferences; already given to the owner).

## 2. Placement in the next update — honest timing (owner chooses)
Round 4: item 7 is due 13 Nov; item 22 is large (estimate 8–12 build hours over ~3 sessions + full gate ≈ 170–175 min, page +45–60 KB of 97 KB headroom). The Chinese-typing fix (below) is small and ships with item 7's release either way. Show the owner both options in the Idea card: (a) 2.1.2 = item 7 + IME fix + item 22 together (later release), or (b) 2.1.2 = item 7 + IME fix now, item 22 right after. Owner asked for (a); do not decide for him.

## 3. Final Item card — Item 22 "My prompts where I type"

*Claude drafted this · you decide.* Lane: **large**. Position proposed: after item 7 (due 13 Nov); you choose E1 or this next.

**Outcome (your words).** "In every field where I write to Claude I press one button, pick a prompt from my library by category, and it goes straight into that field. Most used on top. I can add, edit, delete, and change how it works in Settings."

**Honest limit.** "Every field" = every PT field whose text goes to Claude or to PT's hands. Inside PT, Chat Mode is your chat with Claude, so Choose puts the prompt straight into it. In claude.ai's own chat box PT cannot type; there, Copy (one tap) and paste is the route.

**Three announcement lines (as if live).**
1. Under every PT field that talks to Claude there is a Prompts button: pick, tap Choose, and your prompt is in the field where your cursor was.
2. Opens on Most used, your ★ favourites on top; categories Favorites · Most used · Surface · Pick · Fold · Verify · Audit · Received · Map · Starter.
3. Add, edit and delete any prompt right from the list; deleted prompts wait in "Deleted" until you empty it; settings in Settings › General › Prompts.

**Three scenarios.**
- Happy: In Chat Mode you tap Prompts → Most used shows "Fold in" first → Choose → the text sits in the chat box at your cursor, keyboard up. 2 taps.
- Ugly 1: You open Prompts from the item box, a background save re-renders the page, then you press Esc. The item box stays open with your text; only the list closes. If the field really is gone, Choose copies the prompt and says "Field gone — copied, paste it".
- Ugly 2: The second owner, in Chinese, opens Prompts for the first time: the list is empty except a Starter chip (marked "English"), one line "Add your first prompt"; she searches in pinyin and the list does not jump while she types.

**Acceptance lines (each with its named test; suite `test/e2e220_prompts.py` unless named).**
1. Every field on PT's prompt-field list shows a Prompts button in or below it; paste and note fields never do. — *static_checks.js "prompt-fields registry"* (every text field id is on the list or the no-list with a reason; planted bug: drop one entry → red) + *e2e220 "button on every listed field" at 390 and 1280 px*.
2. The list opens on Most used: ★ first, then most-used-recently; each row shows short name, what it does, the prompt (3 lines, tap for all), Copy, Choose. — *e2e220 "frecency order"* (B×3, A×1 → B above A; ★C above B; no cloud write on Choose).
3. Choose puts the text at your cursor in the field you opened it from, closes the list and returns you to the field; if that field is gone or doubled, it copies instead and tells you. — *e2e220 "choose survives renders"* (3 renders, `it-in` in main and Inspector, field removed → clipboard + toast, draft kept after next render; planted bug in check_the_checks.py).
4. Esc or tapping outside closes only the prompt list, never the box behind it. — *e2e220 "picker over modal"* (open from `it-in` in the item box, Esc → item box and text intact).
5. Prompts with blanks `{{name}}` (max 7) ask for the blanks first; Choose stays off until filled; auto-send exists only in Chat Mode, is off on every device until you switch it on, and never fires for a prompt with blanks or a Received prompt you have not opened. — *e2e220 "blanks and auto-send"* (off → no send; on + blanks → no send; on + clean → `c20-say` once; Received unopened → no send).
6. From the list or Library › Prompts: add, edit (explicit Save), ★, set category, delete into "Deleted (n)" → Restore; only you empty it (one click + confirm); a starter becomes yours with "Make my copy"; a key in the text blocks Save. — *e2e220 "manage round trip"* + *e2e210_safe.py* (export→import keeps `cat/fav/deletedAt`; 2.1.1 build opens 2.2 data intact) + planted bug for the key check.
7. Settings › General › Prompts: button on/off, open on (Most used), order (most used / A–Z), show starters, auto-send for this device (off); works at 390 px phone with ≥44 px buttons in EN/DE/ZH, Chinese typing in the search does not jump. — *e2e220 "settings change the picker" + "IME search"* + *i18n14.js* + *pseudo19.py* + *self18.py bytes*.

**Non-goals.** No new mode or tab next to Pick and Chat; no typing into claude.ai's box; no Ctrl+K prompts; no versions per save; no scores or export analysis; no own categories; no Practices check on save; no AI rewrite on export; no "/" or keyword expansion; no sharing between owners except by Import.

**Nevers and musts.** (facts book + PT's proposals, marked P)
- Never: delete a restore point or empty "Deleted" by itself; auto-send with blanks, in a single-line field, or into PT's hands (`h20-in`); put your 8 standing rules into PT's own prompts (P); put your prompts into the repository (seed goes as a file in chat, CLAUDE.md:13).
- Must: keep `title/desc/body` where 2.1.1 reads them, so rollback is one GO (P); Copy, Insert into project and Make a skill keep working; imported text is data until you open it; an old backup still imports.

**Quality round (PT default · change option).**
- Speed: list opens and filters without lag on a mid phone (measured in e2e, budget set from first measurement) · change: tighter budget.
- Offline: list, Copy and Choose work offline; edits queue · change: none.
- Who sees what: each login and workspace has its own library · change: one library per login.
- Where data lives: prompts in the workspace store like patterns today; Most used and auto-send on this device only (not in backups, not synced phone↔PC) · change: sync after B1/B5 are fixed.
- Monthly cost ceiling: 0 · change: none needed.
- Languages: UI EN/DE/ZH; a prompt is inserted in the language it was written in; starters in English, marked · change: translate starters later.
- On failure: Choose falls back to Copy with a message; if the gate shows Choose failing, it ships switched off and the changelog says so (CLAUDE.md:17).

**Probe first (5 min, needs you, costs nothing).** Preview build, no owner data: Prompts on Chat Mode, inside the item box, and on one Pick answer line. On your iPhone: does the text land, does the keyboard come up, does the box behind survive, does Copy work? Result: possible / not yet / needs you.

**Decisions to log before GO (DECISIONS.md).**
1. Frecency (Most used) is the default order, counted per device.
2. Auto-send: exists, off by default per device, Chat Mode only, never with blanks or unopened Received.
3. No new mode/tab: Library tab "Patterns" renamed "Prompts"; settings as a section in Settings › General.
4. claude.ai's box is out of reach; Copy is the route there.
5. Library per workspace (not per login).
6. Page budget: raise 3.6 → 3.7 MB, or strip comments (list #21) in this item.
7. Order: item 7 first; IME fix ships in item 7's release; 22 vs E1 is your call.

**Steps needing your laptop or a key.** None. No new capability, so a cloud publish works. Needs you: the iPhone probe; one Chinese-typing check by the second owner (or you with a pinyin keyboard); importing your seed file (sent in chat) via Data › Import in main after GO. Costs money: no.

**Appetite (estimate, not measured).** Build ≈ 8-12 session hours over ~3 sessions (last measured: 2.1.1 ≈ 4-5 h for a smaller release). Full gate ≈ 170-175 min (last measured 157 min) plus the preview quick gate. Page +45-60 KB of 97 KB headroom.

### Later items (cut, with reason)
- **IME fix "Ctrl+K search works while typing Chinese"** · small · ship in item 7's release (bug is live in 2.1.1, actions.js:321; one gate instead of two). Test: composition-event case in `test/e2e210_clicks.py`.
- **22b-1 "Fresh prompts on one click"** · medium · after 22, after D2 (domain block enforced) and C16 (meter counts scheduled runs). A "Find new prompts" button in Library › Prompts builds a dated research brief (official Anthropic pages + other labs' official guides; never X/LinkedIn/Reddit) through the existing research box; results land under Received as "outside source"; Keep (link + date + own paraphrase) / Skip. Only official Anthropic pages may propose a Practices change.
- **22b-2 "Weekly prompt watch"** · medium · after 22b-1 proves useful: a new scheduled task you create with one click (the existing runner stays untouched, CLAUDE.md:15), cost per run shown first; quiet when nothing passes.
- **Try harness (with/without on a throwaway task)** · medium · own item, priced first; needed before anything is "proven".
- **Prompts in Ctrl+K** · small · after the IME fix.
- **Exact Skill/Project-instructions export without AI** (`skillMd`) · small.
- **Your own categories, rename/hide categories** · small.
- **Versions per prompt** · medium · soft delete covers loss for now.
- **Scores ("proven in tests" / "worked in your chats") and export ingestion** · large · no source in PT today.
- **Map prompts open the Solution map** · belongs to a Solution-map item.
- **Standing rules + short-intent meanings for claude.ai** · in chat, any time, no build (parallel, never a gate).


## 4. Code facts the rounds verified (2.1.1; start here)
- Every render rebuilds the page (views_shell.js:132); only the focused field gets its cursor back → the button must live inside each prompt field's template; track the target by field id + its host container (nearField actions4.js:438-441; `pk-dump-in` exists twice: v150_pick.js:837 and v160_spine.js:131).
- `pickMic()` (v150_pick.js:776) is speech-gated and appends at the end — model the look, not the logic.
- The right drawer is the Inspector (has its own fields, Notes can pin it, Pick actions close it; ≤599px it is full screen) → the prompt list is its own layer above popups and owns Esc (Esc closes every overlay today, actions.js:340; the backdrop is already guarded when a popup holds typed text, actions4.js:62-67).
- Patterns today: no Save (every keystroke stored), no versions, delete is permanent (actions.js:218), projects keep no link to a pattern. Keep `title/desc/body` where 2.1.1 reads them (rollback = one GO); add only new fields.
- Pattern saves have no conflict check (same class as backlog B1/B5) → frecency counts and auto-send stay device-local; settings must be flat keys or a backup restore drops them (v210_safe.js:117, IMPORT_SETTINGS).
- Key guard: `h20SecretVal` (v200_hands.js:46) never fires on prompt text (tests the whole value for no spaces) → scan per word, known key prefixes block Save.
- Ctrl+K search re-renders on every keystroke without IME guard (actions.js:321) → breaks Chinese typing today (bug in 2.1.1).
- Picker clicks leave no Undo/activity noise (actClose drops empty patches, v14_model.js).
- AI-facing fields ≈ 17 of ~116 text fields (incl. `ask-sec-in`, `exa-aim`); use a registry: every text field id is on the prompt-field list or the no-button list with a reason — a static check fails the build otherwise.
- Phone: pseudo19 forbids sideways scroll at 390 px → category chips wrap.
- "Make a skill" is an AI rewrite (tasks.js:460), not an exact export.
- claude.ai: no artifact capability writes into claude.ai's message box (`comments.sendToClaude` only posts a comment; backlog E10 already said skip) → Copy is the honest route there.

## 4b. Screens (owner saw and approved the look; canvas is private, so in words)
A · PC Chat Mode: Prompts button under "Tell PT" next to the mic; list opens as a floating layer on the right (not the Inspector), on Most used; chips; top row expanded (name, what it does, 3 lines of prompt, Copy, Choose); compact rows below; "+ New prompt"; "into: Chat · Tell PT" shown in the header.
B · Phone: same button (44 px); list as a sheet from the bottom, chips wrap, big Choose buttons, rows one line until tapped.
C · Library › Prompts: categories left (incl. Starter (English) and Deleted), list middle, editor right (name, what it does, categories, ★, prompt with {{blanks}}, key check, explicit Save, Delete → Deleted bin); Copy · Insert into project · Make a skill stay; Starter → "Make my copy".
D · Settings › General › Prompts: show button · opens on · order · show starters · auto-send on this device (off) · note that counts stay on the device.

## 4c. The owner's prompts (seed)
Attached separately as `pt-prompt-seed.json` (30 prompts from the analysis, 8 ★, categories set, all ≤7 blanks, no project names). Shape = backup file with only `patterns` (id, title, desc, body, kind:"block", createdAt + additive cat, fav). It imports in 2.1.1 TODAY via Settings › Data › Import: no settings inside, so language/theme stay; Undo offered. Owner data — never commit it to the repository (CLAUDE.md:13). Item 22 then reads `cat`/`fav`; acceptance line 6's round-trip test should include this file.

## 5. What the four rounds changed vs. the original plan
1. Button lives inside each prompt field's template (registry of every AI-facing field), not a follow-focus button and not mic-gated; claude.ai's box declared out of reach, Copy is the route.
2. Picker is its own layer above popups, owns Esc; not the Inspector drawer.
3. 15 acceptance lines + 22b → one large card with 7 one-behaviour lines; 10 things moved to Later.
4. Opens on Most used (★ then frecency); no "category fitting the step" rule.
5. Data: additive schema (rollback-safe), soft delete without timer, no versions in v1, counts and auto-send device-local, flat setting keys so backups restore them.
6. Settings: a section in Settings › General, not a new tab.
7. Auto-send kept as you decided, narrowed to Chat Mode, off per device, never with blanks/unopened Received.
8. Key guard made real: per-token scan, known key prefixes block Save.
9. Standing rules stay out of PT's prompts; Make a skill is recognised as an AI rewrite.
10. IME bug found live in 2.1.1 → ships first, with item 7; 22b becomes a one-click research slice after D2/C16, weekly watch later.

## 6. Full red-team detail
RT1–RT4 (≈90 KB, findings with file:line) exist; the owner can attach them if you want the reasoning behind any line.
