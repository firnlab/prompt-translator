#!/usr/bin/env python3
"""The publish manifest against the live artifacts (2.1.1, RT-11, cause 111).

A cloud session cannot add a local (host:) tool to an artifact's manifest: the platform refuses the publish (422, 7 Nov 2026) and
the owner has to publish from a local task in the desktop app. The gate must say so BEFORE the GO, so this check compares the host
tools in CAPABILITIES-2.0.json with the host set recorded for the live main and preview artifacts in releases.json (`hosts` per
artifact, kept from 2.1.0 on) and prints one line per artifact:
    equal                     -> "cloud publish ok"
    adds a tool               -> "publish from a local task (or omit `capabilities` to keep the live set)"
    removes a tool only       -> "cloud publish untested for removals (probe T1-T5) - omit `capabilities` to be safe"
    no record                 -> "no host set recorded - add it to releases.json"
Exit code 0 whatever the verdict (the owner decides where to publish); 1 only when a file cannot be read; the last printed line is the
gate's summary line. `--selftest` plants a manifest that adds, removes and equals a tool in a temporary copy and checks the verdicts.
Data-free; under 1 s."""
import json, pathlib, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def host_set(manifest):
    out = {}
    for s in (manifest.get("mcp") or {}).get("servers") or []:
        name = str(s.get("server") or "")
        if name.startswith("host:"): out[name[5:]] = sorted(str(t) for t in (s.get("tools") or []))
    return out


def verdict(manifest_hosts, live_hosts):
    if live_hosts is None: return "no record", "no host set recorded - add `hosts` to releases.json"
    added = [f"{h}:{t}" for h, ts in manifest_hosts.items() for t in ts if t not in (live_hosts.get(h) or [])]
    removed = [f"{h}:{t}" for h, ts in live_hosts.items() for t in ts if t not in (manifest_hosts.get(h) or [])]
    if added: return "adds", f"adds {', '.join(added)}: publish from a local task (or omit `capabilities` to keep the live set)"
    if removed: return "removes", f"removes {', '.join(removed)}: cloud publish untested for removals (probe T1-T5) - omit `capabilities` to be safe"
    return "equal", "equals the live set: cloud publish ok"


def check(root):
    man = json.loads((root / "CAPABILITIES-2.0.json").read_text())
    rel = json.loads((root / "releases.json").read_text())
    last = rel[-1] if rel else {}
    mh = host_set(man)
    lines = []
    for which in ("main", "preview"):
        live = (last.get(which) or {}).get("hosts")
        kind, text = verdict(mh, live)
        lines.append((which, kind, f"{which} ({last.get('version', '?')} live): manifest {text}"))
    return lines


def selftest():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        base = {"mcp": {"servers": [{"server": "host:claude_browser", "tools": ["navigate", "find"]}, {"server": "Claude Code Remote", "tools": ["fire_trigger"]}]}}
        rel = [{"version": "9.9.9", "main": {"hosts": {"claude_browser": ["find", "navigate"]}}, "preview": {"hosts": {"claude_browser": ["navigate"]}}}]
        (tmp / "releases.json").write_text(json.dumps(rel))
        (tmp / "CAPABILITIES-2.0.json").write_text(json.dumps(base))
        got = {w: k for w, k, _ in check(tmp)}
        assert got == {"main": "equal", "preview": "adds"}, got
        base["mcp"]["servers"][0]["tools"].append("form_input")
        (tmp / "CAPABILITIES-2.0.json").write_text(json.dumps(base))
        got = {w: k for w, k, _ in check(tmp)}
        assert got == {"main": "adds", "preview": "adds"}, got
        base["mcp"]["servers"][0]["tools"] = ["navigate"]
        (tmp / "CAPABILITIES-2.0.json").write_text(json.dumps(base))
        got = {w: k for w, k, _ in check(tmp)}
        assert got == {"main": "removes", "preview": "equal"}, got
        rel[0]["main"].pop("hosts")
        (tmp / "releases.json").write_text(json.dumps(rel))
        got = {w: k for w, k, _ in check(tmp)}
        assert got["main"] == "no record", got
    print("manifest check self-test: adds / removes / equal / no record all told apart")
    return 0


def main():
    if "--selftest" in sys.argv: return selftest()
    try: lines = check(ROOT)
    except (OSError, ValueError) as e:
        print(f"manifest check: cannot read the files ({e})"); return 1
    for _, _, text in lines[:-1]: print(text)
    print(" · ".join(t for _, _, t in lines) if len(lines) > 1 else lines[0][2])
    return 0


if __name__ == "__main__": sys.exit(main())
