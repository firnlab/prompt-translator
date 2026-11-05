"""Click everything (1.4.1; 2.1 rebuilt on the 2.0 model) on a COPY of the data: on every main screen every visible action button is
clicked once (destructive ones skipped); page errors, console errors, raw string keys, an AI step that never ends and a broken screen
(no .app) are collected per screen + action.
2.1 (J17): the screens are the ones 2.0 has — home, the seven pages, the Pick deck, the filled Pick, the Chat face and each Chat tab —
not the removed 1.x modes (steps / blueprint / journey / swimlanes / express render as Pick). A screen whose action set and markup are
the same at an earlier help level (2.0 reads the level in very few places) is not clicked again at this level.
Run: python3 test/monkey141.py [backup dir | bundle.json] [level ...] [p-<project id> ...]   (default: work/backup-141, all levels,
     every project of the last-used workspace)"""
import json, sys, pathlib, re, hashlib
_ARGS = list(sys.argv[1:])
LEVEL_ORDER = ["learn", "guided", "pro"]
LEVELS = [a for a in _ARGS if a in LEVEL_ORDER] or LEVEL_ORDER
BK = next((a for a in _ARGS if a not in LEVEL_ORDER and not a.startswith("p-")), "work/backup-141")
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
SKIP = re.compile(r"del|remove|reset|lock|restore|wipe|trash|purge|import|export|download|publish|release|runner|logout|first-run|fr-|copy|print|share|rollback|live|pin-set|ws-|kp-apply|tool-report|close-overlay|open-project|new-project|proj-new")
PROJECTS = [a for a in _ARGS if a.startswith("p-")]   # empty: every project of the opened workspace (read from the data, never a fixed id)
RAWKEY = r"""(() => { const txt = (document.querySelector('.app') || document.body).innerText; const m = txt.match(/\b(sk|lm|stc|hq|ls|qt|pt|rc|ex|exa|loop|insp|lvl|keys|pc|ds|xr|rl|sn|wi|vt|rb|rr|fl|gs|gc|pl|jc|seed|sb|pg|vd|crit|q|m141|a141|cl|mk|more|pal|sec|eb|pk|pf|mg|md|nav|c20|m20|st20|face|h20|g20|pt20)\.[a-z0-9_]+(\.[a-z0-9_]+)?\b/g); return m ? [...new Set(m)].filter(x => !/^(q\.e\.|ex\.com)/.test(x)).slice(0, 5) : []; })()"""
# what a screen is: its visible actions (with their target) and its markup, with numbers left out (times, counts that tick)
SIG = r"""(() => { const app = document.querySelector('.app'); if (!app) return 'no-app';
  const acts = [...new Set([...app.querySelectorAll('[data-a]')].filter(e => e.offsetParent && !e.disabled).map(e => e.dataset.a + '|' + (e.dataset.v || '') + '|' + (e.dataset.ref || '')))].sort().join(',');
  return acts + '§' + app.innerHTML.replace(/\d+/g, '#'); })()"""
class PL(list):
    def append(self, x): super().append(x); print("PROBLEM", x, flush=True)
problems = PL()
def screen_setups(pid):
    base = f"UI.modal=null; UI.review=null; UI.finish=null; UI.palette=false; UI.capture=false; openProject('{pid}'); const p=curP();"
    out = [("home", f"(() => {{ {base} face20Set(p, 'pick'); UI.home=true; render(); }})()")]
    for pgid in ["idea", "picks", "try", "design", "review", "build", "run"]:   # the seven pages (PG_PAGES), opened as the track opens them
        out.append(("page-" + pgid, f"(() => {{ {base} face20Set(p, 'pick'); UI.home=false; pgOpen(p, '{pgid}'); render(); }})()"))
    out.append(("pick-deck", f"(() => {{ {base} face20Set(p, 'pick'); UI.home=false; setPhase('require'); render(); }})()"))
    out.append(("pick-filled", f"(() => {{ {base} face20Set(p, 'pick'); UI.home=false; window.__pickFixture(p); UI.pkCands=true; render(); }})()"))   # 1.5.0: every Pick card kind, the try and the research
    out.append(("pick-filled-dump", f"(() => {{ {base} face20Set(p, 'pick'); UI.home=false; window.__pickFixture(p); UI.pkCands=true; UI.pkDump=true; render(); }})()"))
    out.append(("chat", f"(() => {{ {base} face20Set(p, 'chat'); render(); }})()"))
    for tab in ["goal", "map", "decided", "plan", "events"]:   # C20_TABS
        out.append(("chat-" + tab, f"(() => {{ {base} face20Set(p, 'chat'); ACTIONS['c20-tab']({{dataset: {{v: '{tab}'}}}}); render(); }})()"))
    return out
def sig_at(pg, lv, js):
    pg.evaluate(f"(() => {{ WS.settings.help = '{lv}'; }})()"); pg.evaluate(js); pg.wait_for_timeout(60)
    return hashlib.sha1(pg.evaluate(SIG).encode()).hexdigest()
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for lv in LEVELS:
        earlier = LEVEL_ORDER[:LEVEL_ORDER.index(lv)]
        pids = PROJECTS
        if not pids:
            ctx = new_ctx(b); pg = open_page(ctx); pids = pg.evaluate("WS.projects.map(p => p.id)"); ctx.close()
        clicked = skipped = 0
        for pid in pids:
            ctx = new_ctx(b)
            for attempt in range(3):
                try: pg = open_page(ctx); break
                except Exception as e: print("open_page retry", attempt, str(e)[:120], flush=True); pg.wait_for_timeout(3000) if 'pg' in dir() else None
            watch(pg); pg.wait_for_timeout(300)
            pg.evaluate(f"(() => {{ WS.settings.help = '{lv}'; WS.settings.levelAsked = WS.settings.levelAsked || 'test'; }})()")
            for name, js in screen_setups(pid):
                # J17: the same screen (same actions, same markup) at an earlier level was clicked by that level's run — not again here
                if earlier:
                    try:
                        mine = sig_at(pg, lv, js)
                        if any(sig_at(pg, e, js) == mine for e in earlier):
                            skipped += 1; pg.evaluate(f"(() => {{ WS.settings.help = '{lv}'; }})()"); continue
                    except Exception: pass   # the setup itself is checked (and reported) below
                    pg.evaluate(f"(() => {{ WS.settings.help = '{lv}'; }})()")
                try: pg.evaluate(js); pg.wait_for_timeout(150)
                except Exception as e: problems.append([lv, pid, name, "setup", str(e)[:200]]); continue
                if not pg.evaluate("!!document.querySelector('.app') && !document.querySelector('.fatal')"): problems.append([lv, pid, name, "setup", "screen broken"]); continue
                clicked += 1
                acts = pg.evaluate("""[...document.querySelectorAll('.app [data-a]')].filter(e => e.offsetParent && !e.disabled).map((e, i) => { e.dataset.mk = 'm' + i; return {mk: 'm' + i, a: e.dataset.a}; })""")
                seen = set()
                for x in acts:
                    if x["a"] in seen or SKIP.search(x["a"]): continue
                    seen.add(x["a"])
                    n0 = len(errors)
                    try:
                        pg.evaluate(js); pg.wait_for_timeout(60)
                        pg.evaluate("""(a) => { const e = [...document.querySelectorAll('.app [data-a="' + a + '"]')].find(e => e.offsetParent && !e.disabled); if (e) e.click(); }""", x["a"])
                        pg.wait_for_timeout(120)
                        try: pg.wait_for_function("!window.AI || AI.running.size === 0", timeout=15000)
                        except Exception: problems.append([lv, pid, name, x["a"], "AI still running after 15 s"])
                        ok = pg.evaluate("!!document.querySelector('.app') && !document.querySelector('.fatal')")
                        raw = pg.evaluate(RAWKEY)
                        if not ok: problems.append([lv, pid, name, x["a"], "screen broken"])
                        if raw: problems.append([lv, pid, name, x["a"], "raw keys " + ",".join(raw)])
                    except Exception as e:
                        problems.append([lv, pid, name, x["a"], "exception " + str(e)[:200]])
                    if len(errors) > n0: problems.append([lv, pid, name, x["a"], " | ".join(errors[n0:])[:400]])
                    pg.keyboard.press("Escape")
            ctx.close()
            print(lv, pid, "problems so far:", len(problems), flush=True)
        print(f"{lv}: {clicked} screens clicked, {skipped} the same as at {'/'.join(earlier) or '-'} (not clicked again)", flush=True)
    b.close()
uniq = {}
for p in problems: uniq.setdefault((p[3], p[4][:120]), p)
print("UNIQUE PROBLEMS:", len(uniq))
for k, p in list(uniq.items())[:80]: print("  ", p)
