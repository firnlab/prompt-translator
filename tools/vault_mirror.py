"""Firnlab vault: pin, download, checksum and licence-check every tool in vault/vault.json, then attach the files to one GitHub
release (vault-YYYY-MM-DD) and write vault/lock.json. Runs inside GitHub Actions (.github/workflows/vault.yml) with the
workflow's own token — no key of ours. Exit 1 when a licence does not match what we expect or a download fails.
    python3 tools/vault_mirror.py --check     resolve + licence check only (no download, no release)
    python3 tools/vault_mirror.py             full run (needs gh and GITHUB_TOKEN)"""
import re, json, os, sys, hashlib, pathlib, subprocess, urllib.request, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
V = json.loads((ROOT / "vault/vault.json").read_text())
CHECK = "--check" in sys.argv
TOK = os.environ.get("GITHUB_TOKEN", "")
def api(url):
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "firnlab-vault", **({"Authorization": "Bearer " + TOK} if TOK else {})})
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read().decode())
def fetch(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "firnlab-vault", **({"Authorization": "Bearer " + TOK} if TOK else {})})
    h = hashlib.sha256(); n = 0
    with urllib.request.urlopen(req, timeout=600) as r, open(dest, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b); h.update(b); n += len(b)
    return h.hexdigest(), n
def licence_text(repo, ref):
    for name in ("LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING", "LICENSE-MIT", "LICENSE-APACHE"):
        try:
            req = urllib.request.Request(f"https://raw.githubusercontent.com/{repo}/{ref}/{name}", headers={"User-Agent": "firnlab-vault"})
            with urllib.request.urlopen(req, timeout=60) as r: return name, r.read().decode("utf-8", "replace")
        except Exception: continue
    return "", ""
out = pathlib.Path("work/vault"); out.mkdir(parents=True, exist_ok=True)
lock = {"checked": datetime.date.today().isoformat(), "tools": []}; red = []
for tool in V["tools"]:
    repo = tool["repo"]; entry = {"id": tool["id"], "repo": repo}
    try:
        try: rel = api(f"https://api.github.com/repos/{repo}/releases/latest"); tag = rel["tag_name"]
        except Exception: rel = None; tag = api(f"https://api.github.com/repos/{repo}")["default_branch"]
        entry["tag"] = tag
        name, text = licence_text(repo, tag)
        entry["licence_file"] = name; entry["licence_head"] = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[email]", " ".join(text.split()))[:120]  # licence contact addresses stay out of the public repo (data guard)
        exp = tool.get("licence", "")
        entry["licence_ok"] = (not exp) or (exp.lower() in text.lower())
        if not entry["licence_ok"]: red.append(f"{tool['id']}: expected '{exp}', LICENSE says: {entry['licence_head'][:80]}")
        if not CHECK:
            files = []
            src = f"https://api.github.com/repos/{repo}/tarball/{tag}"; dest = out / f"{tool['id']}-{tag.replace('/', '_')}.tar.gz"
            sha, n = fetch(src, dest); files.append({"file": dest.name, "sha256": sha, "bytes": n, "from": src})
            if tool.get("mirror") == "release" and rel:
                for a in rel.get("assets", []):
                    if a["size"] > 1900 * 1024 * 1024: continue
                    d2 = out / f"{tool['id']}-{a['name']}"; sha, n = fetch(a["browser_download_url"], d2); files.append({"file": d2.name, "sha256": sha, "bytes": n, "from": a["browser_download_url"]})
            entry["files"] = files
    except Exception as e:
        entry["error"] = str(e)[:200]; red.append(f"{tool['id']}: {e}")
    lock["tools"].append(entry); print(("red  " if entry.get("error") or not entry.get("licence_ok", True) else "ok   ") + tool["id"].ljust(20) + str(entry.get("tag", "")).ljust(24) + (entry.get("licence_head", "")[:60]), flush=True)
(ROOT / "vault/lock.json").write_text(json.dumps(lock, indent=1, ensure_ascii=False) + "\n")
if not CHECK and not red:
    tag = "vault-" + lock["checked"]
    # a second run on the same day must not fail or overwrite: earlier releases are kept, the new one gets -2, -3, …
    n = 1
    while subprocess.run(["gh", "release", "view", tag], capture_output=True).returncode == 0:
        n += 1; tag = f"vault-{lock['checked']}-{n}"
    files = [str(out / f["file"]) for t in lock["tools"] for f in t.get("files", [])]
    notes = "Firnlab vault mirror " + lock["checked"] + "\n\n" + "\n".join(f"- {t['id']} {t.get('tag', '')} · {t.get('licence_file', '')}: {t.get('licence_head', '')[:70]}" for t in lock["tools"])
    subprocess.run(["gh", "release", "create", tag, "--title", tag, "--notes", notes, *files], check=True)
print("\n== vault:", "RED" if red else "GREEN", f"({len(lock['tools']) - len(red)}/{len(lock['tools'])})")
for r in red: print("  ✗", r)
sys.exit(1 if red else 0)
