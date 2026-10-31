"""1.4.1 click-everything test on a COPY of the real data: on every main screen, at all three levels, every visible
action button is clicked once (destructive ones skipped); page errors, console errors, raw string keys and a broken
screen (no .app) are collected per screen + action. Run: python3 test/monkey141.py [backup dir] [level ...]"""
import json, sys, pathlib, re
BK = "work/backup-141"
LEVELS = [a for a in sys.argv[1:] if a in ("learn", "guided", "pro")] or ["learn", "guided", "pro"]
_ARGS = list(sys.argv[1:])
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
SKIP = re.compile(r"del|remove|reset|lock|restore|wipe|trash|purge|import|export|download|publish|release|runner|logout|first-run|fr-|copy|print|share|rollback|live|pin-set|ws-|kp-apply|tool-report|close-overlay|open-project|new-project|proj-new")
PROJECTS = [a for a in _ARGS if a.startswith("p-")] or ["p-mvf7qpwqud0aj", "p-mvhd7ldwitz15", "p-mvdsdqnoyglbu"]
PHASES = ["capture", "understand", "interview", "assume", "require", "arch", "build", "review", "test", "launch", "release", "operate"]
RAWKEY = r"""(() => { const txt = (document.querySelector('.app') || document.body).innerText; const m = txt.match(/\b(sk|lm|stc|hq|ls|qt|pt|rc|ex|exa|loop|insp|lvl|keys|pc|ds|xr|rl|sn|wi|vt|rb|rr|fl|gs|gc|pl|jc|seed|sb|pg|vd|crit|q|m141|a141|cl|mk|more|pal|sec|eb|pk|pf|mg|md|nav)\.[a-z0-9_]+(\.[a-z0-9_]+)?\b/g); return m ? [...new Set(m)].filter(x => !/^(q\.e\.|ex\.com)/.test(x)).slice(0, 5) : []; })()"""
class PL(list):
    def append(self, x): super().append(x); print("PROBLEM", x, flush=True)
problems = PL()
def screen_setups(pid):
    out = [("home", f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); UI.home=true; render(); }})()")]
    for ph in PHASES:
        out.append((ph, f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); const p=curP(); p.mode='steps'; UI.home=false; setPhase('{ph}'); render(); }})()"))
    for m in ["blueprint", "journey", "swimlanes", "express", "pick"]:
        out.append(("mode-" + m, f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); const p=curP(); UI.home=false; setPhase('require'); p.mode='{m}'; render(); }})()"))
    out.append(("mode-pick-filled", f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); const p=curP(); UI.home=false; p.mode='pick'; window.__pickFixture(p); UI.pkCands=true; render(); }})()"))   # 1.5.0: every Pick card kind, the try and the research
    return out
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for lv in LEVELS:
        for pid in PROJECTS:
            ctx = new_ctx(b)
            for attempt in range(3):
                try: pg = open_page(ctx); break
                except Exception as e: print("open_page retry", attempt, str(e)[:120], flush=True); pg.wait_for_timeout(3000) if 'pg' in dir() else None
            watch(pg); pg.wait_for_timeout(300)
            pg.evaluate(f"(() => {{ WS.settings.help = '{lv}'; WS.settings.levelAsked = WS.settings.levelAsked || 'test'; }})()")
            for name, js in screen_setups(pid):
                try: pg.evaluate(js); pg.wait_for_timeout(150)
                except Exception as e: problems.append([lv, pid, name, "setup", str(e)[:200]]); continue
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
    b.close()
uniq = {}
for p in problems: uniq.setdefault((p[3], p[4][:120]), p)
print("UNIQUE PROBLEMS:", len(uniq))
for k, p in list(uniq.items())[:80]: print("  ", p)
