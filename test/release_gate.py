"""Release gate: every check PT has, in one run, with one summary. Run before every publish of main:
    python3 test/release_gate.py            all checks (about 2 h 35 from scratch (measured 6 Nov 2026); --resume reuses green checks whose inputs did not change; click-everything runs one browser per level side by side)
    python3 test/release_gate.py --quick    static + strings + unit + new-version flows + hunt (about 15-20 minutes)
    --only=a,b / --skip=a,b                 a part of the gate (names as in CHECKS); its result is PARTIAL
    --resume                                a check that was green with the same key (built file + its test files + helpers + data,
                                            test/gate_keys.py) is not run again but reused; the planted-bug runs resume per bug
    --label=A                               names this part's receipt (default: full / quick / part)
Everything runs on COPIES of the data with the mock runtime (test/mock.js). It never touches the real artifacts.
A check passes only when its exit code is 0 AND its summary shows no failure (old suites only print counts) AND it ran at least its
minimum number of checks (MIN_OK). A red suite runs once more only to tell FLAKY from red; planted-bug checks and data-safety checks
never run again, and FLAKY blocks a publish just like red (it is logged in work/flaky-ledger.txt).
2.1 (J7): every run writes a receipt (receipts/<version>/<label>.json, committed: commit, dirty, sha256 of the built file, per check
the result, counts, seconds and key — no output, no data). The summary reads every receipt of the version: FULL only when every check
of the gate is green in a receipt and all of them share one commit and one built file; otherwise PARTIAL with the reasons.
See RELEASE-CHECKS.md for what each check covers and the steps after a release."""
import subprocess, sys, re, time, pathlib, json, signal
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "test"))
import gate_keys as GK
QUICK = "--quick" in sys.argv
RESUME = "--resume" in sys.argv
ONLY = next((x.split("=", 1)[1].split(",") for x in sys.argv if x.startswith("--only=")), None)   # run a part of the gate (names as in CHECKS)
SKIP = next((x.split("=", 1)[1].split(",") for x in sys.argv if x.startswith("--skip=")), [])
LABEL = next((x.split("=", 1)[1] for x in sys.argv if x.startswith("--label=")), None)
BAD = re.compile(r"failed:\s*[1-9]|FAILS:\s*[1-9]|ERRORS:\s*[1-9]|page errors:\s*[1-9]|ok, [1-9]\d* failed|MISSING\s+[1-9]|MISSED\s+[1-9]|BAD\s+[1-9]|UNIQUE PROBLEMS:\s*[1-9]|[1-9]\d* hard|Traceback|Error: ")
import os as _os
SLOW = float(_os.environ.get("GATE_SLOW", "1"))   # time budgets × SLOW on a loaded machine (2 CPUs shared with builders); the checks themselves never change
CHECKS = [  # (name, command, in quick run, minutes allowed)
    ("build",          "python3 build.py && python3 build.py https://claude.ai/artifact/6rj1ZPyMB6GxKwAHsmndny", True, 2),   # 2.1: both built files (the care suite reads the preview file)
    ("static checks",  "node test/static_checks.js", True, 2),
    ("tests parse",    "python3 -W error -m py_compile test/*.py tools/*.py", True, 2),   # 1.7: the test scripts are parsed like the sources
    ("check the checks","python3 test/check_the_checks.py", True, 3),   # known bugs put back into a copy: every one must be caught
    ("the gate itself", "python3 test/gate_selftest.py", True, 3),   # 2.1: planted bugs need their own check, no retry of planted/data checks, minimum counts, receipts, FULL/PARTIAL, resume keys
    ("strings",        "node test/i18n14.js", True, 2),
    ("unit",           "node test/unit14.js", True, 5),
    ("flows 1.4.1",    "python3 test/e2e141.py", True, 20),
    ("flows 1.5 (Pick)","python3 test/e2e15.py", True, 15),
    ("flows 1.5 review","python3 test/e2e15b.py", True, 20),   # every finding of the 23 Oct 2026 review, R1 … R60
    ("Pick contract",  "python3 test/pick_contract.py", True, 10),
    ("flows 1.6 (kit 1)","python3 test/e2e16.py", True, 10),   # Firnlab kits
    ("flows 1.7 (pages)","python3 test/e2e17.py", True, 15),   # the cover and the seven pages, honesty, ledger, cost, security, drill, mock, pass, learn, health
    ("flows 1.7.1 (time, names)","python3 test/e2e171.py", True, 10),   # owner-time baseline (taps, active minutes) and name independence
    ("flows 1.8 look",  "python3 test/e2e180_look.py", True, 15),   # style C, ink blue, light; pills, Live line, Claude labels, sparklines, contrast, widths
    ("flows 1.8 rows",  "python3 test/e2e180_rows.py", True, 10),   # decision rows, events chain, tiers, undo, Decisions page, migration
    ("flows 1.8 kits",  "python3 test/e2e180_kits.py", True, 10),   # what every built tool gets: report, backups, uses-AI line, customer code-only, routing, Art. 50
    ("flows 1.8 run",   "python3 test/e2e180_run.py", True, 15),   # Sunday note, inbox sorting, tell PT what's wrong, drill when due, learn from use, build default, laptop stops
    ("check the rows",  "python3 test/check_the_rows.py", False, 15),   # planted bugs in the rows code must turn the rows test red
    ("flows 1.8 (checks)", "python3 test/e2e180_checks.py", True, 10),   # check rows, lenses per tool, fix until green, 3×/5×, facts by type
    ("flows 1.8 (deciding)","python3 test/e2e180_decide.py", True, 10),   # ★ on hard, your call first, 5 cards, readiness, mock first + quick try, start switch, price first, Bauplan folded
    ("flows 1.8 health","python3 test/e2e180_health.py", True, 15),   # health rows, second owner day one, the 1.7 move + Undo, export, restore check
    ("PT checks itself","python3 test/self18.py", False, 15),   # accessibility and performance budgets of PT's own screens
    ("flows 1.8 (the cone)","python3 test/e2e180_cone.py", True, 10),   # kinds of tool from one sentence, biggest cut, the gallery shrinks, ★ after the scan, D pick-then-verify, E say the ending, check rows, decision rows, 1.7 re-run
    ("flows 1.9 care",  "python3 test/e2e190_care.py", True, 15),   # R1a export line, R2 how customers get AI, R3 AI ceiling, R5 push switch, R7 key renewal (fake clock)
    ("PT outside claude.ai", "python3 test/plain_browser.py", True, 5),
    ("flows 1.9 fleet", "python3 test/e2e190_fleet.py", True, 15),
    ("flows 1.9 scan", "python3 test/e2e190_scan.py", True, 15),   # self-scan (names only, propose only), the 4×4 interview, "What changed" per version
    ("flows 1.9.1 judge", "python3 test/e2e191_judge.py", True, 15),   # the independent judge (gate row, job after build/update, commit first, hard floors, release gate, block card, kit run) and the second-lab row (key only in GitHub, PART R, reviews)
    ("flows 1.10 hands", "python3 test/e2e1100_hands.py", True, 15),   # PT's hands: the desktop app's browser (checks, take me there, the guard: no click, no typing, github.com only, keys dropped)
    ("flows 2.0 foundation", "python3 test/e2e200_foundation.py", True, 15),   # 2.0 Part A: facts book, rules channel + output check, ask once, contradictions, no cross-project rules, receipts + one Next, error cards, examples never ask, layout, plain words, Add requirement
    ("flows 2.0 map", "python3 test/e2e200_map.py", True, 15),   # 2.0 Part B: the new order (stage model), goal card, solution map + coverage engine (6 lenses, red team, saturation), your rules greyed, shortlist/compare/Prove it/Take this, goal diff, route alert, map chat, proven routes (templates only)
    ("flows 2.0 modes", "python3 test/e2e200_modes.py", True, 25),   # 2.0 Part C: two faces (Pick, Chat Mode) of one ledger, the 1.x modes gone, the move to 2.0 (Before 2.0, additive, once, per project), the RC replay
    ("flows 2.0 hands", "python3 test/e2e200_hands.py", True, 15),   # 2.0 Part D: PT's hands per project (site list, plan first, action contract, forms and non-final clicks, the final-button stop, keys never typed, the guard)
    ("flows 2.0 loop", "python3 test/e2e200_loop.py", True, 20),   # 2.0 Parts D/E: morning check, prompt tests, Improve-PT loop, metrics, helpers (detection, Needs <program>, file save), guides, CAPABILITIES-2.0.json
    ("flows 2.1 platform", "python3 test/e2e210_platform.py", True, 10),   # 2.1 J12/J13: PT against a platform-like mock (sample codes, mcp refusals, path grammar, access rules); expected reds listed in test/expected_red.json
    ("flows 2.1 clicks", "python3 test/e2e210_clicks.py", True, 10),   # 2.1 J13: cancel, retry and delete clicks (C2 "one click = one call" is still open; its reds are in expected_red.json)
    ("flows 2.1 safe", "python3 test/e2e210_safe.py", True, 10),   # 2.1 A1/A14/B17: safeHTML, the booby-trapped import, export→import round trip, data-bind paths
    ("check the causes", "python3 test/check_the_causes.py", True, 1),   # 2.1 J3: every cause has a check that exists and (or a reason) a planted bug
    ("pseudo-localisation", "python3 test/pseudo19.py", True, 10),   # 1.9.2: every text from the strings, the L() objects or the data; no raw key, no cut label, no sideways scrolling with ~40 % longer text at 1440 and 390 px
    ("changelog", "python3 test/changelog_test.py && python3 tools/changelog.py --check", True, 2),   # CHANGELOG.md is generated and up to date   # update all of your tools to a kit: card = GO, one at a time, two greens, stop on red, others prepared   # R1b: the built file in plain Chromium reads an export, read-only, writes nothing
    ("hunt",           "python3 test/hunt.py", True, 25),
    ("hunt 2",         "python3 test/hunt2.py", True, 20),
    ("check the hunt", "python3 test/check_the_hunts.py", False, 70),   # each hunt-2 check turns red when its bug is put back
    ("check the Pick tests","python3 test/check_the_pick.py --part=1/2", False, 110),   # 2.0: in halves, the whole run took longer than 110 min
    ("check the Pick tests 2","python3 test/check_the_pick.py --part=2/2", False, 110),   # each planted Pick bug turns its test red (1.9: +12 care bugs, about 3–4 min each)
    ("layout",         "python3 test/layout141.py", False, 15),
    ("migration 1.4.1","python3 test/migrate141.py", False, 10),
    ("migration 1.4",  "python3 test/migrate14.py", False, 10),
    ("flows 1.4",      "python3 test/e2e14.py", False, 20),
    ("smoke",          "python3 test/smoke14.py", False, 10),
    ("flows 1.3",      "python3 test/e2e13.py", False, 20),
    ("flows 1.2",      "python3 test/e2e12_on14.py", False, 20),
    ("click everything", ["python3 test/monkey141.py learn", "python3 test/monkey141.py guided", "python3 test/monkey141.py pro"], False, 75),   # one browser per level, side by side
]
if _os.environ.get("GATE_CHECKS"): CHECKS = [tuple(x) for x in json.loads(pathlib.Path(_os.environ["GATE_CHECKS"]).read_text())]   # test/gate_selftest.py only
LEDGER = pathlib.Path(_os.environ.get("GATE_LEDGER") or ROOT / "work" / "flaky-ledger.txt")
JOBS = int(next((x.split("=", 1)[1] for x in sys.argv if x.startswith("--jobs=")), "2"))   # 1.8: suites side by side (each run has its own page file)
EXCLUSIVE = {"click everything"}   # already runs three browsers: alone, after the others
# 2.1 (J9): never run again — a planted bug caught only on the second try, or a data-safety check that passes on the second try, is RED
PLANTED = {"check the checks", "check the rows", "check the hunt", "check the Pick tests", "check the Pick tests 2"}
NO_RETRY = {"build", "static checks", "tests parse", "strings", "unit", "changelog", "the gate itself"} | PLANTED
DATA_SAFETY = {"migration 1.4.1", "migration 1.4", "flows 1.8 health"}   # whole suites about keeping the data (migration, restore check, export)
# a failing line about keeping data (written over, lost, deleted, restore point, backup, a failed load) is never retried either
DATA_RX = re.compile(r"(?i)writes? (nothing )?over|overwrit|never written|writes nothing|nothing (is )?lost|\blost\b|deleted|delete[sd]? |restore point|backup|failed load|fails to load|data safety|keeps? (every|all) |nothing (from|of) another")
# 2.1 (J14): a suite that silently runs fewer checks is red. Minimum ok counts from the 2.0.0 gate on the real-data copy: small suites
# (≤ 25 checks, fixed by their code) must keep every check; larger ones (some checks per project) may drop 10 %. Raise with new checks.
_LAST = {"check the checks": 49, "the gate itself": 36, "unit": 14, "flows 1.4.1": 91, "flows 1.5 (Pick)": 57, "flows 1.5 review": 91, "Pick contract": 22,
         "flows 1.6 (kit 1)": 127, "flows 1.7 (pages)": 91, "flows 1.7.1 (time, names)": 28, "flows 1.8 look": 98, "flows 1.8 rows": 58,
         "flows 1.8 kits": 83, "flows 1.8 run": 109, "check the rows": 9, "flows 1.8 (checks)": 86, "flows 1.8 (deciding)": 71,
         "flows 1.8 health": 98, "PT checks itself": 73, "flows 1.8 (the cone)": 84, "flows 1.9 care": 108, "PT outside claude.ai": 21,
         "flows 1.9 fleet": 78, "flows 1.9 scan": 99, "flows 1.9.1 judge": 81, "flows 1.10 hands": 54, "flows 2.0 foundation": 82,
         "flows 2.0 map": 122, "flows 2.0 modes": 170, "flows 2.0 hands": 55, "flows 2.0 loop": 83, "pseudo-localisation": 179, "hunt": 21,
         "hunt 2": 10, "check the hunt": 31, "check the Pick tests": 104, "check the Pick tests 2": 103, "layout": 60, "migration 1.4.1": 14,
         "migration 1.4": 15, "flows 1.4": 58, "flows 1.2": 161,
         "flows 2.1 platform": 52, "flows 2.1 clicks": 10, "flows 2.1 safe": 53, "changelog": 27}   # 2.1 (red team 4 #16): every counted suite is listed
MIN_OK = {n: (c if c <= 25 else int(c * 0.9)) for n, c in _LAST.items()}
# suites that print no ok-count by design (a build, a parser, a scan that prints only problems): the only ones allowed to miss MIN_OK
NO_COUNT = {"build", "static checks", "tests parse", "strings", "check the causes", "smoke", "flows 1.3", "click everything"}
_missing = [n for n, *_ in CHECKS if n not in MIN_OK and n not in NO_COUNT]
if _missing and not _os.environ.get("GATE_CHECKS"): print("GATE SETUP RED: suites without a minimum count (add to _LAST or NO_COUNT): " + ", ".join(_missing)); sys.exit(2)
def ok_count(out):
    """the number of checks a suite reports as passed (its last summary line), or None when it prints no count"""
    pats = [r"\bok:\s*(\d+)\s+failed", r"(\d+) ok, \d+ failed", r"(\d+) of \d+ (?:known bugs caught|hunt checks)", r"planted [\w ]+bugs: \d+, caught (\d+)", r"planted row bugs: (\d+), MISSED 0"]
    found = [(m.start(), int(m.group(1))) for p in pats for m in re.finditer(p, out)]
    return max(found)[1] if found else None
def fail_count(out):
    m = [int(v) for g in re.findall(r"\bfailed:?\s*(\d+)|, (\d+) failed|MISSED (\d+)", out) for v in g if v]
    return m[-1] if m else None

import concurrent.futures as _cf, threading as _th
_print_lock = _th.Lock()
STATE = GK.load_state() if RESUME else {}
def check_key(name, cmd):
    if name == "build": return None
    return GK.key(cmd, ROOT, wide=name in PLANTED or name in ("tests parse", "static checks", "the gate itself"), extra=["build.py"] if name in PLANTED else ())
def run_check(name, cmd, mins):
    t0 = time.time()
    k = check_key(name, cmd)
    if RESUME and name in ("check the Pick tests", "check the Pick tests 2"): cmd = cmd + " --resume"   # resumes per planted bug
    r = STATE.get(k) if (RESUME and k) else None
    if r and r.get("result") == "PASS":
        with _print_lock: print(f"REUSED {name} (key {k[:12]}, green {r.get('at', '')})", flush=True)
        return dict(name=name, ok=True, result="REUSED", s=0, tail=[f"reused: green with the same key at {r.get('at', '')}"], key=k, ok_n=r.get("ok_n"), fail_n=0)
    with _print_lock: print(f"… {name}", flush=True)
    cmds = cmd if isinstance(cmd, list) else [cmd]
    def once(limit):
        ps = [subprocess.Popen(c, shell=True, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True) for c in cmds]
        outs, timed = [], False
        for x in ps:
            try: outs.append(x.communicate(timeout=max(1, limit - (time.time() - t_once)))[0])
            except subprocess.TimeoutExpired:
                timed = True
                for y in ps:
                    try: _os.killpg(y.pid, signal.SIGKILL)
                    except Exception: pass
                # 2.1 (J6): keep what it printed before the time ran out (the planted-bug runs keep their results in work/gate-state.jsonl)
                try: outs.append(x.communicate(timeout=30)[0] or "")
                except Exception: pass
        out = "\n".join(o for o in outs if o)
        if timed: return False, out + f"\ntimed out after {mins} min", True
        return all(x.returncode == 0 for x in ps) and not BAD.search(out), out, False
    t_once = time.time()
    ok, out, timed = once(mins * 60 * SLOW)
    n_ok = ok_count(out); why = ""
    if ok and name in MIN_OK and (n_ok is None or n_ok < MIN_OK[name]):
        ok = False; why = f"ran {n_ok if n_ok is not None else 'no counted'} checks, at least {MIN_OK[name]} expected (MIN_OK)"
    # a red suite runs once more: green the second time means FLAKY (recorded in the ledger, named in the summary, and it blocks a publish)
    flaky = False
    fails = [l.strip() for l in out.splitlines() if re.match(r"^\s*FAIL\b", l)]
    no_retry = name in NO_RETRY or name in DATA_SAFETY or any(DATA_RX.search(l) for l in fails)
    if not ok and not timed and not why and not no_retry:
        with _print_lock: print(f"   {name} red: running it once more to tell a flaky test from a real failure", flush=True)
        t_once = time.time()
        ok2, out2, _ = once(mins * 60 * SLOW)
        if ok2:
            flaky = True
            LEDGER.parent.mkdir(parents=True, exist_ok=True)
            with open(LEDGER, "a") as fl: fl.write(time.strftime("%Y-%m-%d %H:%M") + f"  {name}: red, then green\n" + "\n".join("   " + l for l in [l for l in out.strip().splitlines() if l.strip()][-8:]) + "\n")
    elif not ok and no_retry and not timed and not why and name not in ("build",):
        why = "not run again: " + ("a planted-bug check" if name in PLANTED else "a data-safety check" if (name in DATA_SAFETY or any(DATA_RX.search(l) for l in fails)) else "a check that cannot be flaky")
    tail = [l for l in out.strip().splitlines() if l.strip()][-6:]
    if why: tail = tail + [why]
    if flaky: tail = tail + ["FLAKY: red on the first run, green on the second (see work/flaky-ledger.txt) — blocks a publish"]
    result = "FLAKY" if flaky else "PASS" if ok else "FAIL"
    with _print_lock:
        print(f"{result} {name} ({int(time.time() - t0)} s)", flush=True)
        if result != "PASS": print("   " + "\n   ".join(tail), flush=True)
    rec = dict(name=name, ok=ok and not flaky, result=result, s=int(time.time() - t0), tail=tail, key=k, ok_n=n_ok, fail_n=fail_count(out))
    if k and result == "PASS": GK.save_state({"key": k, "kind": "gate", "name": name, "result": "PASS", "ok_n": n_ok})
    return rec

# ---------- run ----------
T0 = time.time(); STARTED = time.strftime("%Y-%m-%dT%H:%M:%S")
COMMIT, DIRTY = GK.commit_info()
todo = [(n, c, m) for n, c, q, m in CHECKS if not (QUICK and not q) and not ((ONLY and n not in ONLY) or n in SKIP)]
unknown = sorted(set(ONLY or []) - {n for n, *_ in CHECKS}) + sorted(set(SKIP) - {n for n, *_ in CHECKS})
if unknown: print("unknown check names (see CHECKS):", ", ".join(unknown)); sys.exit(2)
res = []
if todo and todo[0][0] == "build":
    r = run_check(*todo[0]); res.append(r); todo = todo[1:]
    if not r["ok"]: todo = []   # nothing else can run on a broken build
DIST_SHA = GK.sha_path(ROOT / "dist/prompt-translator.html")
pool_items = [x for x in todo if x[0] not in EXCLUSIVE]
with _cf.ThreadPoolExecutor(max_workers=max(1, JOBS)) as ex:
    futs = {ex.submit(run_check, *x): x[0] for x in pool_items}
    done = {futs[f]: f.result() for f in _cf.as_completed(futs)}
res += [done[x[0]] for x in pool_items]
for x in todo:
    if x[0] in EXCLUSIVE: res.append(run_check(*x))

# ---------- receipt (J7): data-free, committed ----------
SCOPE = "QUICK" if QUICK else "PARTIAL" if (ONLY or SKIP) else "FULL"
VERSION = GK.pt_version()
label = re.sub(r"[^A-Za-z0-9._-]+", "-", LABEL or ("full" if SCOPE == "FULL" else SCOPE.lower() + "-" + time.strftime("%Y%m%d-%H%M%S")))
receipt = {"version": VERSION, "label": label, "scope": SCOPE, "commit": COMMIT, "code_tree": GK.code_tree(COMMIT), "dirty": DIRTY, "dist_sha256": DIST_SHA,
           "started": STARTED, "seconds": int(time.time() - T0), "args": [a for a in sys.argv[1:]],
           "checks": [{"name": r["name"], "result": r["result"], "seconds": r["s"], "ok": r["ok_n"], "failed": r["fail_n"], "key": r["key"]} for r in res],
           "flaky": [r["name"] for r in res if r["result"] == "FLAKY"],
           "expected_red": (lambda f: len(json.loads(f.read_text()).get("red", [])) if f.exists() else 0)(ROOT / "test/expected_red.json"),   # 2.1 (#21): known reds the 2.1 suites accept, named here so a green gate never hides them
           "preview_sha256": GK.sha_path(ROOT / "dist/prompt-translator-preview.html")}
RDIR = pathlib.Path(_os.environ.get("GATE_RECEIPTS") or ROOT / "receipts") / VERSION
if "--no-receipt" not in sys.argv:
    RDIR.mkdir(parents=True, exist_ok=True)
    (RDIR / f"{label}.json").write_text(json.dumps(receipt, indent=1, ensure_ascii=False) + "\n")

green = all(r["ok"] for r in res)
fl = [r["name"] for r in res if r["result"] == "FLAKY"]
print("\n== release gate:", ("GREEN" if green else "RED") + (" (FLAKY blocks a publish: " + ", ".join(fl) + ")" if fl else ""),
      f"({sum(r['ok'] for r in res)}/{len(res)} passed) · this run: {SCOPE}{' (' + ' '.join(a for a in sys.argv[1:] if a.startswith(('--only', '--skip'))) + ')' if SCOPE == 'PARTIAL' else ''}")
print(f"   commit {COMMIT[:12]}{' + uncommitted changes' if DIRTY else ''} · built file sha256 {DIST_SHA[:16]} · {int(time.time() - T0)} s · known reds accepted by the 2.1 suites: {receipt['expected_red']} (test/expected_red.json)")
for r in res: print(f"  {'✓' if r['ok'] else '!' if r['result'] == 'FLAKY' else '✗'} {r['name']:18} {r['s']:5d} s   {r['tail'][-1][:110] if r['tail'] else ''}")
if "--no-receipt" not in sys.argv:
    word, why, cm = GK.overall(RDIR, [n for n, *_ in CHECKS])
    print(f"\nreceipt: receipts/{VERSION}/{label}.json · all receipts of {VERSION}: {word}" + (f" on commit {cm[:12]}" if word == "FULL" else ""))
    for w in why: print("   " + w)
sys.exit(0 if green and not fl else 1)
