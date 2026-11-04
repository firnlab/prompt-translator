"""1.4.1 layout check on a COPY of the real data: at phone, laptop and wide widths, on every main screen:
no sideways scroll, nothing clipped without a "more", no text cut with "…" in the queue, no button covered by a bar,
the dialog's buttons never under the status bar. Run: python3 test/layout141.py [backup dir]"""
import json, pathlib, sys
sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
AUDIT = r"""(() => {
  const out = {hscroll: 0, clipped: [], cut: [], covered: [], modalCovered: 0};
  const m = document.querySelector('.main');
  if (m && m.scrollWidth > m.clientWidth + 2) out.hscroll = m.scrollWidth - m.clientWidth;
  if (document.documentElement.scrollWidth > innerWidth + 2) out.hscroll = Math.max(out.hscroll, document.documentElement.scrollWidth - innerWidth);
  for (const el of document.querySelectorAll('.app *')){
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (!/hidden|clip/.test(cs.overflowY)) continue;
    if (el.clientHeight <= 0 || el.scrollHeight <= el.clientHeight + 4) continue;
    if (el.matches('[data-clamp]') && el.nextElementSibling && el.nextElementSibling.classList.contains('morebtn')) continue;
    if (el.matches('.clamp3,.app,.main,.rail,.drawer,.dr-body,.dock-notes,svg *,.tstream,.mapwrap *,.bp-node *,.lanes *,.sr20')) continue;   // .sr20: text for screen readers only, clipped on purpose
    if (el.closest('.bp-node,.lpart,.sbar,.ver-chip')) continue;
    if (el.matches('.ititle') && el.closest('.irow:not(.open)')) continue;   // a closed row opens with a click (aria-expanded)
    out.clipped.push((el.className && el.className.baseVal === undefined ? String(el.className) : el.tagName).split(' ').slice(0, 2).join('.') + ':' + (el.scrollHeight - el.clientHeight));
  }
  for (const el of document.querySelectorAll('.qrow *, .ilist *, .rpage *, .finish *')){
    if (el.children.length) continue; const s = (el.textContent || '').trim();
    if (s.length > 30 && /…$/.test(s)) out.cut.push(s.slice(-50));
  }
  const vis = b => b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth;
  const mr = m ? m.getBoundingClientRect() : null;
  for (const el of document.querySelectorAll('.main button, .main a, .sbar button, .modal button, .drawer button')){
    if (el.closest('details:not([open]) > :not(summary)')) continue;   // inside a closed menu: not shown
    const b = el.getBoundingClientRect(); if (!vis(b)) continue;
    const x = b.left + b.width / 2, y = b.top + b.height / 2; if (y > innerHeight - 1 || x > innerWidth - 1) continue;
    const sc = el.closest('.main, .dr-body, .modal'); if (sc){ const r = sc.getBoundingClientRect(); if (y < r.top || y > r.bottom || x < r.left || x > r.right || b.bottom > r.bottom + 1 || b.top < r.top - 1) continue; }   // scrolled (partly) out of its own area: the bar below it is not covering it
    const top = document.elementFromPoint(x, y); if (!top) continue;
    if (top === el || el.contains(top) || top.contains(el)) continue;
    if (top.closest('.overlay') && !el.closest('.overlay')) continue;   // a dialog on top is expected
    if (top.closest('details.more[open] .menu')) continue;             // an open menu is expected
    if (top.closest('.rpage>.row:first-child, .rvbar, .navbar14, .spine2')) continue;
    if (top.closest('.toasts')) continue;                               // a toast is short-lived and dismissable
    if (innerWidth < 600 && top.closest('.drawer') && !el.closest('.drawer')) continue;   // the phone panel is a full sheet   // a sticky bar the content scrolls under
    out.covered.push((el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ← ' + (top.className && top.className.baseVal === undefined ? String(top.className).split(' ')[0] : top.tagName));
  }
  const mo = document.querySelector('.overlay .modal'), sb = document.querySelector('.sbar');
  if (mo && sb){ const a = mo.getBoundingClientRect(), c = sb.getBoundingClientRect(); const z1 = +getComputedStyle(document.querySelector('.overlay')).zIndex, z2 = +getComputedStyle(sb).zIndex; if (a.bottom > c.top && z2 >= z1) out.modalCovered = 1; }
  out.clipped = [...new Set(out.clipped)].slice(0, 12); out.cut = out.cut.slice(0, 6); out.covered = [...new Set(out.covered)].slice(0, 8);
  return out;
})()"""
SCREENS = [
  ("cockpit", "go('cockpit')"),
  ("home", "UI.home=true; UI.finish=null; render()"),
  ("page details/capture", "UI.home=false; setPhase('capture'); pgShowPhase(curP(), 'capture')"),
  ("page details/require", "UI.home=false; setPhase('require'); pgShowPhase(curP(), 'require')"),
  ("page details/assume", "UI.home=false; setPhase('assume'); pgShowPhase(curP(), 'assume')"),
  ("page details/test", "UI.home=false; setPhase('test'); pgShowPhase(curP(), 'test')"),
  ("page details/arch", "UI.home=false; setPhase('arch'); pgShowPhase(curP(), 'arch')"),
  ("chat", "UI.home=false; face20Set(curP(), 'chat')"),
  ("chat workspace", "UI.home=false; face20Set(curP(), 'chat'); c20St(curP()).tab='decided'; render()"),
  ("pick", "face20Set(curP(), 'pick'); UI.home=false; setPhase('require'); render()"),
  ("pick filled", "face20Set(curP(), 'pick'); UI.home=false; window.__pickFixture(curP()); UI.pkCands=true; UI.pkDump=true; render()"),
  ("inspector", "UI.home=false; setPhase('capture'); pgShowPhase(curP(), 'capture'); UI.drawer=true; UI.panelTab='details'; UI.inspRef='intake:raw'; render()"),
  ("finish", "face20Set(curP(), 'pick'); UI.home=false; ACTIONS['finish-open']()"),
  ("review page", "UI.finish=null; UI.drawer=false; (async () => { await updateAffected(curP(), ['req:R1'], {before: {'req:R1': 'x'}}); })()"),
  ("dialog", "UI.modal=null; UI.review=null; UI.home=true; render(); ACTIONS['goal-reuse'] ? ACTIONS['goal-reuse']() : null"),
]
res = {}
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w in (390, 1024, 1440, 1920):
        ctx = new_ctx(b, w=w, h=860 if w > 600 else 780); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
        for name, js in SCREENS:
            try:
                pg.evaluate(js); pg.wait_for_timeout(500)
                a = pg.evaluate(AUDIT)
            except Exception as e:
                a = {"error": str(e)[:200]}
            bad = a.get("error") or a["hscroll"] or a["clipped"] or a["cut"] or a["covered"] or a["modalCovered"]
            check(f"layout {w} {name}", not bad, json.dumps(a, ensure_ascii=False)[:700])
        ctx.close()
    b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
for e in errors[:10]: print("  ERR", e)
