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
    ("hunt",           "python3 test/hunt.py", True, 25),
    ("hunt 2",         "python3 test/hunt2.py", True, 20),
    ("check the hunt", "python3 test/check_the_hunts.py", False, 70),   # each hunt-2 check turns red when its bug is put back
    ("check the Pick tests","python3 test/check_the_pick.py", False, 60),   # each planted Pick bug turns its test red
    ("layout",         "python3 test/layout141.py", False, 15),
    ("migration 1.4.1","python3 test/migrate141.py", False, 10),
    ("migration 1.4",  "python3 test/migrate14.py", False, 10),
    ("flows 1.4",      "python3 test/e2e14.py", False, 20),
    ("smoke",          "python3 test/smoke14.py", False, 10),
    ("flows 1.3",      "python3 test/e2e13.py", False, 20),
    ("flows 1.2",      "python3 test/e2e12_on14.py", False, 20),
    ("click everything", ["python3 test/monkey141.py learn", "python3 test/monkey141.py guided", "python3 test/monkey141.py pro"], False, 75),   # one browser per level, side by side
]
res = []
for name, cmd, quick, mins in CHECKS:
    if QUICK and not quick: continue
    if (ONLY and name not in ONLY) or name in SKIP: continue
    t0 = time.time(); print(f"… {name}", flush=True)
    try:
        cmds = cmd if isinstance(cmd, list) else [cmd]
        ps = [subprocess.Popen(c, shell=True, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) for c in cmds]
        outs = [x.communicate(timeout=max(1, mins * 60 * SLOW - (time.time() - t0)))[0] for x in ps]
        out = "\n".join(outs); ok = all(x.returncode == 0 for x in ps) and not BAD.search(out)
    except subprocess.TimeoutExpired as e:
        for x in ps: x.kill()
        out = f"timed out after {mins} min"; ok = False
    # a red suite runs once more: green the second time means FLAKY (recorded in the ledger and named in the summary, never silent)
    flaky = False
    if not ok and name not in ("build", "static checks", "check the checks", "strings", "unit") and "timed out" not in out:
        print(f"   {name} red: running it once more to tell a flaky test from a real failure", flush=True)
        try:
            ps = [subprocess.Popen(c, shell=True, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) for c in cmds]
            out2 = "\n".join(x.communicate(timeout=mins * 60 * SLOW)[0] for x in ps); ok2 = all(x.returncode == 0 for x in ps) and not BAD.search(out2)
        except subprocess.TimeoutExpired:
            for x in ps: x.kill()
            ok2 = False; out2 = "timed out on the second run"
        if ok2:
            flaky = True; ok = True
            with open(ROOT / "work" / "flaky-ledger.txt", "a") as fl: fl.write(time.strftime("%Y-%m-%d %H:%M") + f"  {name}: red, then green\n" + "\n".join("   " + l for l in [l for l in out.strip().splitlines() if l.strip()][-8:]) + "\n")
    tail = [l for l in out.strip().splitlines() if l.strip()][-6:]
    if flaky: tail = tail + ["FLAKY: red on the first run, green on the second (see work/flaky-ledger.txt)"]
    res.append((name, ok, int(time.time() - t0), tail))
    print(f"{'FLAKY' if flaky else 'PASS' if ok else 'FAIL'} {name} ({int(time.time() - t0)} s)", flush=True)
    if not ok: print("   " + "\n   ".join(tail), flush=True)
    if name == "build" and not ok: break   # nothing else can run on a broken build
fl = [r[0] for r in res if r[3] and str(r[3][-1]).startswith("FLAKY")]
print("\n== release gate:", ("GREEN" + (" with FLAKY: " + ", ".join(fl) if fl else "")) if all(r[1] for r in res) else "RED", f"({sum(r[1] for r in res)}/{len(res)} passed{', quick run' if QUICK else ''})")
for name, ok, s, tail in res: print(f"  {'✓' if ok else '✗'} {name:18} {s:5d} s   {tail[-1][:110] if tail else ''}")
sys.exit(0 if all(r[1] for r in res) else 1)
