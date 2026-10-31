"""Check the hunt: put one known bug back at a time (HUNT_MUTATE in hunt2.py) and make sure its check turns red.
Run: python3 test/check_the_hunts.py      (about 20 minutes, 4 browsers side by side; never touches src/ or real data)"""
import subprocess, sys, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "test/hunt2.py").read_text()
names = re.findall(r'^\s+"(\d\d)": ', src.split("MUTATIONS = {")[1].split("\n}")[0], re.M)
missed, done = [], []
for i in range(0, len(names), 4):
    batch = names[i:i + 4]
    ps = {n: subprocess.Popen([sys.executable, "test/hunt2.py"], cwd=ROOT, env={**__import__("os").environ, "HUNT_MUTATE": n}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) for n in batch}
    for n, p in ps.items():
        out = p.communicate(timeout=2400)[0]
        (pathlib.Path("work") / f"mutate_{n}.log").write_text(out)   # for a look when a check is missed
        red = re.search(r"^FAIL\s+" + n + r" ", out, re.M) is not None
        print(("caught " if red else "MISSED ") + "check " + n, flush=True)
        (done if red else missed).append(n)
print(f"{len(done)} of {len(names)} hunt checks turn red when their bug is back")
for m in missed: print("  MISSED check", m)
sys.exit(1 if missed else 0)
