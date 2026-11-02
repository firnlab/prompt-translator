"""Release gate: every check PT has, in one run, with one summary. Run before every publish of main:
    python3 test/release_gate.py            all checks (about 50 minutes; click-everything runs one browser per level side by side)
    python3 test/release_gate.py --quick    static + strings + unit + new-version flows + hunt (about 15-20 minutes)
Everything runs on COPIES of the data with the mock runtime (test/mock.js). It never touches the real artifacts.
A check passes only when its exit code is 0 AND its summary shows no failure (old suites only print counts).
See RELEASE-CHECKS.md for what each check covers and the steps after a release."""
import subprocess, sys, re, time, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
QUICK = "--quick" in sys.argv
ONLY = next((x.split("=", 1)[1].split(",") for x in sys.argv if x.startswith("--only=")), None)   # run a part of the gate (names as in CHECKS)
SKIP = next((x.split("=", 1)[1].split(",") for x in sys.argv if x.startswith("--skip=")), [])
BAD = re.compile(r"failed:\s*[1-9]|FAILS:\s*[1-9]|ERRORS:\s*[1-9]|page errors:\s*[1-9]|ok, [1-9]\d* failed|MISSING\s+[1-9]|BAD\s+[1-9]|UNIQUE PROBLEMS:\s*[1-9]|[1-9]\d* hard|Traceback|Error: ")
import os as _os
SLOW = float(_os.environ.get("GATE_SLOW", "1"))   # time budgets × SLOW on a loaded machine (2 CPUs shared with builders); the checks themselves never change
CHECKS = [  # (name, command, in quick run, minutes allowed)
    ("build",          "python3 build.py", True, 2),
    ("static checks",  "node test/static_checks.js", True, 2),
    ("tests parse",    "python3 -W error -m py_compile test/*.py tools/*.py", True, 2),   # 1.7: the test scripts are parsed like the sources
    ("check the checks","python3 test/check_the_checks.py", True, 3),   # known bugs put back into a copy: every one must be caught
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
    ("changelog", "python3 test/changelog_test.py && python3 tools/changelog.py --check", True, 2),   # CHANGELOG.md is generated and up to date   # update all of your tools to a kit: card = GO, one at a time, two greens, stop on red, others prepared   # R1b: the built file in plain Chromium reads an export, read-only, writes nothing
    ("hunt",           "python3 test/hunt.py", True, 25),
    ("hunt 2",         "python3 test/hunt2.py", True, 20),
    ("check the hunt", "python3 test/check_the_hunts.py", False, 70),   # each hunt-2 check turns red when its bug is put back
    ("check the Pick tests","python3 test/check_the_pick.py", False, 110),   # each planted Pick bug turns its test red (1.9: +12 care bugs, about 3–4 min each)
    ("layout",         "python3 test/layout141.py", False, 15),
    ("migration 1.4.1","python3 test/migrate141.py", False, 10),
    ("migration 1.4",  "python3 test/migrate14.py", False, 10),
    ("flows 1.4",      "python3 test/e2e14.py", False, 20),
    ("smoke",          "python3 test/smoke14.py", False, 10),
    ("flows 1.3",      "python3 test/e2e13.py", False, 20),
    ("flows 1.2",      "python3 test/e2e12_on14.py", False, 20),
    ("click everything", ["python3 test/monkey141.py learn", "python3 test/monkey141.py guided", "python3 test/monkey141.py pro"], False, 75),   # one browser per level, side by side
]
JOBS = int(next((x.split("=", 1)[1] for x in sys.argv if x.startswith("--jobs=")), "2"))   # 1.8: suites side by side (each run has its own page file)
EXCLUSIVE = {"click everything"}   # already runs three browsers: alone, after the others
import concurrent.futures as _cf, threading as _th
_print_lock = _th.Lock()
def run_check(name, cmd, mins):
    t0 = time.time()
    with _print_lock: print(f"… {name}", flush=True)
    cmds = cmd if isinstance(cmd, list) else [cmd]
    def once(limit):
        ps = [subprocess.Popen(c, shell=True, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) for c in cmds]
        try:
            outs = [x.communicate(timeout=max(1, limit))[0] for x in ps]
            out = "\n".join(outs); return all(x.returncode == 0 for x in ps) and not BAD.search(out), out
        except subprocess.TimeoutExpired:
            for x in ps: x.kill()
            return False, f"timed out after {mins} min"
    ok, out = once(mins * 60 * SLOW - (time.time() - t0))
    # a red suite runs once more: green the second time means FLAKY (recorded in the ledger and named in the summary, never silent)
    flaky = False
    if not ok and name not in ("build", "static checks", "check the checks", "strings", "unit") and "timed out" not in out:
        with _print_lock: print(f"   {name} red: running it once more to tell a flaky test from a real failure", flush=True)
        ok2, out2 = once(mins * 60 * SLOW)
        if ok2:
            flaky = True; ok = True
            with open(ROOT / "work" / "flaky-ledger.txt", "a") as fl: fl.write(time.strftime("%Y-%m-%d %H:%M") + f"  {name}: red, then green\n" + "\n".join("   " + l for l in [l for l in out.strip().splitlines() if l.strip()][-8:]) + "\n")
    tail = [l for l in out.strip().splitlines() if l.strip()][-6:]
    if flaky: tail = tail + ["FLAKY: red on the first run, green on the second (see work/flaky-ledger.txt)"]
    with _print_lock:
        print(f"{'FLAKY' if flaky else 'PASS' if ok else 'FAIL'} {name} ({int(time.time() - t0)} s)", flush=True)
        if not ok: print("   " + "\n   ".join(tail), flush=True)
    return (name, ok, int(time.time() - t0), tail)
todo = [(n, c, m) for n, c, q, m in CHECKS if not (QUICK and not q) and not ((ONLY and n not in ONLY) or n in SKIP)]
res = []
if todo and todo[0][0] == "build":
    r = run_check(*todo[0]); res.append(r); todo = todo[1:]
    if not r[1]: todo = []   # nothing else can run on a broken build
pool_items = [x for x in todo if x[0] not in EXCLUSIVE]
with _cf.ThreadPoolExecutor(max_workers=max(1, JOBS)) as ex:
    futs = {ex.submit(run_check, *x): x[0] for x in pool_items}
    done = {futs[f]: f.result() for f in _cf.as_completed(futs)}
res += [done[x[0]] for x in pool_items]
for x in todo:
    if x[0] in EXCLUSIVE: res.append(run_check(*x))
fl = [r[0] for r in res if r[3] and str(r[3][-1]).startswith("FLAKY")]
print("\n== release gate:", ("GREEN" + (" with FLAKY: " + ", ".join(fl) if fl else "")) if all(r[1] for r in res) else "RED", f"({sum(r[1] for r in res)}/{len(res)} passed{', quick run' if QUICK else ''})")
for name, ok, s, tail in res: print(f"  {'✓' if ok else '✗'} {name:18} {s:5d} s   {tail[-1][:110] if tail else ''}")
sys.exit(0 if all(r[1] for r in res) else 1)
