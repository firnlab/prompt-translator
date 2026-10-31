"""Checks that the pages PT's knowledge pack and strings link to still answer (weekly health check).
Collects every https link in src/, asks each once (HEAD, then GET on a 405), and fails only on 404/410 or a dead host.
403/429 count as "answers, but blocks robots" and are reported, not failed. Nothing is written anywhere.
Run: python3 tools/link_check.py"""
import pathlib, re, sys, urllib.request, urllib.error, socket, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
RX = re.compile(r"https://[a-zA-Z0-9][a-zA-Z0-9./_\-]+[a-zA-Z0-9/]")
links = set()
for f in sorted((ROOT / "src").glob("*.js")):
    for m in RX.finditer(f.read_text(errors="ignore")):
        u = m.group(0)
        if len(u) > 14 and "." in u.split("/")[2] and not u.endswith("/"): links.add(u)   # a prefix like …/artifact/ is not a page

def ask(u):
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(u, method=method, headers={"User-Agent": "Mozilla/5.0 (PT link check)"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r: return r.status
        except urllib.error.HTTPError as e:
            if e.code == 405 and method == "HEAD": continue
            return e.code
        except (urllib.error.URLError, socket.timeout, ConnectionError, OSError) as e:
            return "dead: " + str(getattr(e, "reason", e))[:60]
    return "?"

dead, blocked = [], []
for u in sorted(links):
    s = ask(u); time.sleep(0.3)
    if s in (404, 410) or str(s).startswith("dead"): dead.append((u, s))
    elif s in (401, 403, 429, 999): blocked.append((u, s))
print(f"link check: {len(links)} links, {len(dead)} gone, {len(blocked)} block robots")
for u, s in blocked: print(f"  blocks robots ({s}): {u}")
for u, s in dead: print(f"  GONE ({s}): {u}")
sys.exit(1 if dead else 0)
