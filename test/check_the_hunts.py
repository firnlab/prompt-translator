"""Check the hunt: put one known bug back at a time (HUNT_MUTATE in hunt.py and hunt2.py) and make sure its own check turns red.
2.1 (J2, J4): both hunt files have one planted bug per check (1-21 in hunt.py, 22-31 in hunt2.py); a mutant runs only the check it is
named for (plus the setup that check needs) and stops at that check's FAIL, so each run takes a minute or two instead of the whole hunt.
With --clean each check first runs alone without its bug (HUNT_ONLY): a check already red on the clean copy proves nothing, so its
mutant counts as not proven (an expected-red check, e.g. 14 until PLAN-2.1 C1, shows up here).
Run: python3 test/check_the_hunts.py [backup dir | bundle.json] [--jobs=N] [--only=1,14,24] [--clean]
     (never touches src/ or real data; the data argument is passed on to both hunts, default as theirs: work/backup-141)"""
import subprocess, sys, pathlib, re, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
JOBS = int(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--jobs=")), "2"))   # 2 CPUs on the gate machine
CLEAN = "--clean" in sys.argv
ONLY = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--only=")), None)
def names_in(f):
    src = (ROOT / "test" / f).read_text()
    return re.findall(r'^\s+"(\d{1,2})": ', src.split("MUTATIONS = {")[1].split("\n}")[0], re.M)
todo = [(f, n) for f in ("hunt.py", "hunt2.py") for n in names_in(f) if not ONLY or n in ONLY]
(ROOT / "work").mkdir(exist_ok=True)
def run(batch, var, tag):
    ps = {(f, n): subprocess.Popen([sys.executable, "test/" + f] + ARGS[:1], cwd=ROOT, env={**{k: v for k, v in os.environ.items() if k not in ("HUNT_MUTATE", "HUNT_ONLY")}, var: n}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) for f, n in batch}
    res = {}
    for (f, n), p in ps.items():
        try: out = p.communicate(timeout=1800)[0]
        except subprocess.TimeoutExpired:
            p.kill(); out = p.communicate()[0] + "\n(timed out after 30 min)"
        (ROOT / "work" / f"{tag}_{f.split('.')[0]}_{n}.log").write_text(out)   # for a look when a check is missed
        res[(f, n)] = (re.search(r"^FAIL\s+" + n + r" ", out, re.M) is not None, re.search(r"^ok\s+" + n + r" ", out, re.M) is not None)
    return res
missed, done = [], []
if CLEAN:
    unproven = []
    for i in range(0, len(todo), JOBS):
        for (f, n), (red, green) in run(todo[i:i + JOBS], "HUNT_ONLY", "clean").items():
            if not green:
                print(f"UNPROVEN {f} check {n}: red (or not run) without its bug, so its bug cannot prove it", flush=True); unproven.append((f, n))
    missed += [f"{f} {n} (clean run red)" for f, n in unproven]
    todo = [x for x in todo if x not in unproven]
for i in range(0, len(todo), JOBS):
    for (f, n), (red, _) in run(todo[i:i + JOBS], "HUNT_MUTATE", "mutate").items():
        # the planted bug must be caught by its own check: another check's red, a crash or a timeout is not a catch
        print(("caught " if red else "MISSED ") + f"{f} check {n}", flush=True)
        (done if red else missed).append(f"{f} {n}")
print(f"{len(done)} of {len(done) + len(missed)} hunt checks turn red when their bug is back")
for m in missed: print("  MISSED check", m)
sys.exit(1 if missed else 0)
