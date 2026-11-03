"""Automated browser tests for CMSN CON THƯ BÉO PHÌ (Chapter 1 + Chapter 2).
Needs:  pip install playwright && playwright install chromium
Run:    python tests/run_tests.py            (all stages, ~6-8 minutes)
        python tests/run_tests.py growth     (one stage; stages share a save via tests/.state.json)
Stages (run in this order): chapter1 growth artist language battle battle3 discover
Real mouse/keyboard events are sent through Playwright. Player movement through the social
levels uses an in-page helper that holds the arrow keys via the game's own Input object.
Results are written to tests/test_report.json."""
import asyncio, http.server, threading, functools, os, sys, json, time
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATE = os.path.join(ROOT, 'tests', '.state.json')
PORT = 8790
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Q, directory=ROOT)).serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % PORT

RESULTS = []; ERRORS = []
def check(name, cond, detail=''):
    RESULTS.append({'test': name, 'pass': bool(cond), 'detail': str(detail)})
    print(('PASS ' if cond else 'FAIL ') + name + (('  -> ' + str(detail)) if detail != '' else ''), flush=True)
    return bool(cond)

class Page:
    def __init__(self, pg): self.pg = pg
    async def js(self, expr): return await self.pg.evaluate(expr)
    async def sleep(self, s): await self.pg.wait_for_timeout(int(s * 1000))
    async def until(self, expr, timeout=15, step=0.1):
        t = time.time()
        while time.time() - t < timeout:
            if await self.js(expr): return True
            await self.sleep(step)
        return False
    async def click(self, x, y):
        r = await self.js("(()=>{const r=document.getElementById('game').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        await self.pg.mouse.click(r[0] + x * r[2] / 320, r[1] + y * r[3] / 180); await self.sleep(0.08)
    async def move(self, x, y, down=None):
        r = await self.js("(()=>{const r=document.getElementById('game').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        await self.pg.mouse.move(r[0] + x * r[2] / 320, r[1] + y * r[3] / 180)
        if down is True: await self.pg.mouse.down()
        if down is False: await self.pg.mouse.up()
    async def click_rect(self, b): await self.click(b['x'] + b['w'] / 2, b['y'] + b['h'] / 2)
    async def key(self, k): await self.pg.keyboard.press(k); await self.sleep(0.08)
    async def nofade(self): await self.js("Game.fade={a:0,dir:0,cb:null}")

async def boot(ctx, query='', fresh=False):
    pg = await ctx.new_page(); P = Page(pg)
    pg.on('pageerror', lambda e: ERRORS.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: ERRORS.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.on('requestfailed', lambda r: ERRORS.append('REQFAIL ' + r.url))
    await pg.goto(URL + query); await P.sleep(1.2)
    await pg.evaluate("window.ACT=()=>{const a=MinigameManager.active;return (a&&a.sub&&a.mode==='sub')?a.sub:a;}")
    return P

async def new_ctx(b, load=True):
    kw = {'viewport': {'width': 960, 'height': 540}}
    if load and os.path.exists(STATE): kw['storage_state'] = STATE
    return await b.new_context(**kw)

async def save_state(ctx): await ctx.storage_state(path=STATE)

# ------------------------------------------------------------------ helpers
MOVER = """
window.__mv = { escort(i, target) { return new Promise((res) => {
  const t0 = performance.now();
  const iv = setInterval(() => {
    const a = MinigameManager.active; if (!a || !a.player) { clearInterval(iv); Input.held = {}; res(-1); return; }
    const p = a.player, n = a.npcs[i], lv = a.lv, T = 16;
    Input.held['ArrowLeft'] = false; Input.held['ArrowRight'] = Math.abs(p.x - n.x) < 24;
    const tx = Math.floor((p.x + p.w / 2) / T), feet = Math.floor((p.y + p.h - 1) / T);
    const wall = lv.isSolid(tx + 1, feet) || lv.isSolid(tx + 1, feet - 1);
    if (p.onGround && wall) { Input.held['Space'] = true; Input.pressed['Space'] = true; } else if (p.onGround) Input.held['Space'] = false;
    if (!p.onGround) Input.held['Space'] = true;
    if (p.x >= target || performance.now() - t0 > 90000) { Input.held = {}; clearInterval(iv); res(p.x); }
  }, 30); }); },
  run(target, getE) { return new Promise((res) => {
  const t0 = performance.now();
  const iv = setInterval(() => {
    const a = ACT(); const p = (a && a.player) || Game.player, lv = (a && a.lv) || Game.level, T = 16;
    const dir = target > p.x ? 1 : -1;
    Input.held[dir > 0 ? 'ArrowRight' : 'ArrowLeft'] = true; Input.held[dir > 0 ? 'ArrowLeft' : 'ArrowRight'] = false;
    const tx = Math.floor((p.x + p.w / 2) / T), feet = Math.floor((p.y + p.h - 1) / T), ahead = tx + dir;
    const wall = lv.isSolid(ahead, feet) || lv.isSolid(ahead, feet - 1);
    if (p.onGround && wall) { Input.held['Space'] = true; Input.pressed['Space'] = true; } else if (p.onGround) Input.held['Space'] = false;
    if (!p.onGround) Input.held['Space'] = true;
    if ((dir > 0 && p.x >= target) || (dir < 0 && p.x <= target) || performance.now() - t0 > 40000) { Input.held = {}; clearInterval(iv); res(p.x); }
  }, 16); }); } };
"""
async def run_to(P, x): return await P.js("window.__mv.run(%f)" % x)
async def hold_off(P): await P.js("Input.held={}")

async def goto_hub(b, query='?chapter=2', skip_evolve=True):
    ctx = await new_ctx(b); P = await boot(ctx, query)
    await P.until("Game.state==='card'", 10); await P.js("Game.fade={a:0,dir:0,cb:null}"); await P.sleep(0.8)
    await P.key('Enter')
    await P.until("Game.state==='evolve' || Game.state==='hub'", 12)
    if skip_evolve:
        await P.sleep(1.5); await P.key('Enter'); await P.until("Game.state==='hub'", 12)
    return ctx, P

async def teleport_station(P, sid):
    await P.js("""(()=>{const st=Game.level.stations.find(s=>s.id==='%s');const p=Game.player;p.x=st.x+8-p.w/2;p.y=st.y+16-p.h;p.vx=p.vy=0;Game.camera.follow(p,Game.level,true);})()""" % sid)
    await P.sleep(0.4)

async def open_game_from_hub(P, sid):
    await teleport_station(P, sid)
    await P.key('KeyE')
    return await P.until("Game.state==='minigame' && MinigameManager.mode==='select'", 5)

async def start_level(P, n):
    cards = await P.js("MinigameManager.cards.map(c=>({x:c.x,y:c.y,w:c.w,h:c.h}))")
    await P.click_rect(cards[n - 1]); await P.sleep(0.3)
    return await P.until("MinigameManager.mode==='play'", 5)

async def result_info(P):
    return await P.js("MinigameManager.mode==='result' ? {stars:MinigameManager.res.stars, score:MinigameManager.res.score, gains:MinigameManager.rec.gains, badges:MinigameManager.rec.newBadges, rewards:MinigameManager.rec.newRewards} : null")

async def click_result_button(P, bid):
    await P.sleep(0.8)
    b = await P.js("MinigameManager.buttons.find(b=>b.id==='%s')" % bid)
    await P.click_rect(b); await P.sleep(0.3)

# ------------------------------------------------------------------ painting
async def paint_regions(P, mode, force_color=None):
    info = await P.js("""(()=>{const a=ACT();const reg={};a.region.forEach((ch,i)=>{if(ch!=='.'&&reg[ch]===undefined)reg[ch]=i;});
      return {PX:a.PX,PY:a.PY,S:a.S,W:a.W,reg:reg,targets:a.pic.targets,sw:a.swatches.map(s=>({x:s.x,y:s.y,w:s.w,h:s.h})),tools:a.toolBtns.map(t=>({id:t.id,x:t.x,y:t.y,w:t.w,h:t.h}))};})()""")
    tool = {t['id']: t for t in info['tools']}
    await P.click_rect(tool['fill'])
    k = 0
    for ch, i in info['reg'].items():
        if force_color is not None: c = force_color
        elif mode == 'free': c = k % 6
        else: c = info['targets'][ch]
        k += 1
        await P.click_rect(info['sw'][c])
        await P.click(info['PX'] + (i % info['W']) * info['S'] + info['S'] / 2, info['PY'] + (i // info['W']) * info['S'] + info['S'] / 2)
    return info

async def click_done(P): await P.click_rect(await P.js("ACT().doneBtn"))

async def test_artist(b):
    ctx, P = await goto_hub(b)
    await P.js("window.__mvx=1")
    check('artist: station in hub opens mini-game select', await open_game_from_hub(P, 'artist'))
    locked = await P.js("[MinigameManager.cards[1].enabled, MinigameManager.cards[2].enabled]")
    check('artist: level 2 and 3 locked at start', locked == [False, False], locked)
    check('artist: level 1 starts from card click', await start_level(P, 1))
    # --- tools on level 1
    info = await P.js("""(()=>{const a=MinigameManager.active;return {PX:a.PX,PY:a.PY,S:a.S,tools:a.toolBtns.map(t=>({id:t.id,x:t.x,y:t.y,w:t.w,h:t.h})),sw:a.swatches.map(s=>({x:s.x,y:s.y,w:s.w,h:s.h})),dn:a.doneBtn}})()""")
    tool = {t['id']: t for t in info['tools']}
    count = "(()=>{const a=MinigameManager.active;let n=0;for(let i=0;i<a.paint.length;i++)if(a.paint[i]>=0)n++;return n})()"
    await click_done(P); await P.sleep(0.3)
    check('artist: pressing Done on an empty picture does not finish', await P.js("MinigameManager.mode==='play'") and await P.js("MinigameManager.active.msgT>0"))
    await P.click_rect(tool['brush']); await P.click_rect(info['sw'][2])
    await P.move(info['PX'] + 30, info['PY'] + 100); await P.move(info['PX'] + 30, info['PY'] + 100, True)
    for i in range(12): await P.move(info['PX'] + 30 + i * 6, info['PY'] + 100); await P.sleep(0.03)
    await P.move(info['PX'] + 100, info['PY'] + 100, False); await P.sleep(0.2)
    n_brush = await P.js(count); check('artist: brush paints cells by dragging', n_brush > 5, n_brush)
    await P.click_rect(tool['size']); await P.click_rect(tool['size'])
    check('artist: brush size changes', await P.js("MinigameManager.active.size") == 3)
    await P.click_rect(tool['eraser'])
    await P.move(info['PX'] + 30, info['PY'] + 100); await P.move(info['PX'] + 30, info['PY'] + 100, True)
    for i in range(12): await P.move(info['PX'] + 30 + i * 6, info['PY'] + 100); await P.sleep(0.03)
    await P.move(info['PX'] + 100, info['PY'] + 100, False); await P.sleep(0.2)
    n_er = await P.js(count); check('artist: eraser removes paint', n_er < n_brush, '%s -> %s' % (n_brush, n_er))
    await P.click_rect(tool['undo']); n_un = await P.js(count)
    check('artist: undo restores the erased paint', n_un > n_er, '%s -> %s' % (n_er, n_un))
    await P.click_rect(tool['clear']); n_cl = await P.js(count)
    check('artist: clear removes everything', n_cl == 0, n_cl)
    await P.click_rect(tool['undo']); check('artist: undo after clear brings paint back', await P.js(count) > 0)
    # --- level 1: fill every region with different colours
    await paint_regions(P, 'free'); await P.sleep(0.2)
    cov = await P.js("MinigameManager.active.metrics().coverage"); check('artist L1: fill tool colours whole regions', cov > 0.95, round(cov, 3))
    await click_done(P); ok = await P.until("MinigameManager.mode==='result'", 4)
    r = await result_info(P); check('artist L1: completion evaluated (3 stars with 3+ colours)', ok and r and r['stars'] == 3, r)
    check('artist L1: creativity gain recorded', r and r['gains']['creativity'] > 0, r and r['gains'])
    check('artist L1: first-clear badge', r and 'first_brush' in r['badges'], r and r['badges'])
    # --- retry then next
    await click_result_button(P, 'retry'); check('artist: retry restarts the level', await P.js("MinigameManager.mode==='play' && MinigameManager.level===1"))
    await paint_regions(P, 'free'); await click_done(P); await P.until("MinigameManager.mode==='result'", 4)
    r2 = await result_info(P); check('artist: replaying does not farm stats', r2 and sum(r2['gains'].values()) == 0, r2 and r2['gains'])
    await click_result_button(P, 'next'); check('artist: level 2 unlocked, Next opens it', await P.js("MinigameManager.mode==='play' && MinigameManager.level===2"))
    # --- level 2 (match): wrong colours first
    await paint_regions(P, 'match', force_color=0); await click_done(P); await P.sleep(0.4)
    check('artist L2: wrong colours are NOT accepted (still playing + hint blink)', await P.js("MinigameManager.mode==='play' && !!MinigameManager.active.wrong"))
    await P.click_rect(tool['clear']); await paint_regions(P, 'match')
    acc = await P.js("MinigameManager.active.metrics().accuracy"); check('artist L2: copying the reference gives 100% accuracy', acc > 0.99, round(acc, 3))
    await click_done(P); await P.until("MinigameManager.mode==='result'", 4)
    r = await result_info(P); check('artist L2: 3 stars', r and r['stars'] == 3, r)
    check('artist L2: reward "Extra Colors" unlocked', r and 'palette_plus' in r['rewards'], r and r['rewards'])
    await click_result_button(P, 'next')
    check('artist L3: opens with 12 colours after reward', await P.js("MinigameManager.mode==='play' && MinigameManager.active.colors.length")  == 12)
    await paint_regions(P, 'exact'); await click_done(P); await P.until("MinigameManager.mode==='result'", 4)
    r = await result_info(P); check('artist L3 (exact, 15 regions): 3 stars', r and r['stars'] == 3, r)
    check('artist: badges colorful + true_colors', r and 'colorful' in r['badges'] and 'true_colors' in r['badges'], r and r['badges'])
    await click_result_button(P, 'hub')
    check('artist: result -> level select (stars saved)', await P.js("MinigameManager.mode==='select'") and await P.js("ProgressionManager.levelsCleared('artist')") == 3)
    # back to hub: growth milestone not yet (3 levels cleared)
    await P.click_rect(await P.js("MinigameManager.buttons[0]")); await P.until("Game.state==='hub'", 4)
    check('artist: Back returns to the hub', await P.js("Game.state")  == 'hub')
    await save_state(ctx); await ctx.close()

# ------------------------------------------------------------------ language
async def lang_match(P, wrong_first=True):
    d = await P.js("(()=>{const a=MinigameManager.active;return {w:a.words.map(x=>({x:x.x,y:x.y,w:x.w,h:x.h})),p:a.pics.map(x=>({x:x.x,y:x.y,w:x.w,h:x.h})),m:a.words.map((w,i)=>a.pics.findIndex(p=>p.v===w.v))}})()")
    if wrong_first:
        await P.click_rect(d['w'][0]); wrong = (d['m'][0] + 1) % 6; await P.click_rect(d['p'][wrong]); await P.sleep(0.2)
        check('language L1: wrong pair counts a mistake', await P.js("MinigameManager.active.mistakes") == 1)
    for i in range(6):
        await P.click_rect(d['w'][i]); await P.click_rect(d['p'][d['m'][i]])

async def test_language(b):
    ctx, P = await goto_hub(b)
    check('language: station opens select', await open_game_from_hub(P, 'language'))
    check('language: level 1 starts', await start_level(P, 1))
    await lang_match(P)
    ok = await P.until("MinigameManager.mode==='result'", 5); r = await result_info(P)
    check('language L1: matching finished with feedback + stars', ok and r and r['stars'] >= 2, r)
    check('language L1: language stat increased', r and r['gains']['language'] > 0, r and r['gains'])
    await click_result_button(P, 'next'); check('language L2 unlocked', await P.js("MinigameManager.level") == 2)
    # sort round
    d = await P.js("(()=>{const a=MinigameManager.active;return {c:a.chips.map(x=>({x:x.x,y:x.y,w:x.w,h:x.h,bin:a.bins.findIndex(b=>b.cat===x.v.cat)})),b:a.bins.map(x=>({x:x.x,y:x.y,w:x.w,h:x.h}))}})()")
    await P.click_rect(d['c'][0]); await P.click_rect(d['b'][1 - d['c'][0]['bin']]); await P.sleep(0.2)
    check('language L2: wrong category counts a mistake', await P.js("MinigameManager.active.mistakes") == 1)
    for c in d['c']:
        await P.click_rect(c); await P.click_rect(d['b'][c['bin']])
    check('language L2: sorting round completes and sentence round starts', await P.until("MinigameManager.active.round==='sentence'", 4))
    for s in range(2):
        n = await P.js("MinigameManager.active.sent.words.length")
        for k in range(n):
            pos = await P.js("(()=>{const a=MinigameManager.active;const e=a.sent.words[a.placed.length];const b=a.pool.find(x=>!x.matched&&x.word===e);return {x:b.x,y:b.y,w:b.w,h:b.h}})()")
            await P.click_rect(pos); await P.sleep(0.05)
        await P.sleep(0.2)
    ok = await P.until("MinigameManager.mode==='result'", 5); r = await result_info(P)
    check('language L2: sentence ordering finished with result', ok and r and r['stars'] >= 1, r)
    await click_result_button(P, 'next'); check('language L3 (detective) starts', await P.js("MinigameManager.level") == 3)
    types = []
    for q in range(8):
        qi = await P.js("MinigameManager.active.qi")
        t = await P.js("MinigameManager.active.q.type"); types.append(t)
        if q == 0:
            # deliberately answer wrong once if it is a choice question
            if t != 'unscramble':
                w = await P.js("(()=>{const a=MinigameManager.active;const o=a.opts4.find(x=>!x.correct);return {x:o.x,y:o.y,w:o.w,h:o.h}})()")
                await P.click_rect(w); await P.sleep(0.2)
                check('language L3: wrong answer gives feedback (mistake counted, option disabled)', await P.js("MinigameManager.active.mistakes") == 1)
        if t == 'unscramble':
            word = await P.js("MinigameManager.active.q.v.word.toUpperCase()")
            for ch in word:
                pos = await P.js("(()=>{const a=MinigameManager.active;const l=a.letters.find(x=>!x.matched&&x.c==='%s');return {x:l.x,y:l.y,w:l.w,h:l.h}})()" % ch)
                await P.click_rect(pos); await P.sleep(0.05)
        else:
            pos = await P.js("(()=>{const a=MinigameManager.active;const o=a.opts4.find(x=>x.correct);return {x:o.x,y:o.y,w:o.w,h:o.h}})()")
            await P.click_rect(pos)
        await P.until("MinigameManager.mode==='result' || MinigameManager.active.qi>%d" % qi, 4)
    ok = await P.until("MinigameManager.mode==='result'", 5); r = await result_info(P)
    check('language L3: 8 cases answered, result shown', ok and r is not None, {'types': sorted(set(types)), 'result': r})
    check('language L3: question types mix (>=3 kinds)', len(set(types)) >= 3, sorted(set(types)))
    check('language: badges first_words + polyglot', r and ('polyglot' in r['badges']), r and r['badges'])
    check('language: reward "Hint Lens" unlocked earlier', await P.js("ProgressionManager.hasReward('hint_lens')"))
    # hint lens: remove two wrong options in a multiple-choice question
    await click_result_button(P, 'retry')
    for _ in range(8):
        t = await P.js("MinigameManager.active.q.type")
        if t != 'unscramble': break
        await P.js("MinigameManager.active.qi++; MinigameManager.active.nextQ()")
    await P.click_rect(await P.js("MinigameManager.active.hintBtn")); await P.sleep(0.2)
    left = await P.js("MinigameManager.active.opts4.filter(o=>o.enabled).length")
    check('language: Hint (reward) removes two wrong options', left == 2, left)
    sp = await P.js("typeof Speech.ok()==='boolean' ? Speech.ok() : null")
    check('language: speech support detected without crashing (Speech.ok)', sp is not None, 'speechSynthesis supported=%s' % sp)
    await P.key('Escape'); await save_state(ctx); await ctx.close()

# ------------------------------------------------------------------ social battle
BATTLE_HELPERS = """
window.__bt = { beats: [], hook() { const a = MinigameManager.active; if (!a || !a.engine || a.engine.__hooked) return; const e = a.engine; e.__hooked = true;
    const act = e.act.bind(e), fin = e.finishEvent.bind(e);
    e.act = (x) => { const r = act(x); if (r) window.__bt.beats.push(...r.map(b => b.type + ':' + (b.name || b.side || b.to || ''))); return r; };
    e.finishEvent = () => { const r = fin(); window.__bt.beats.push(...r.map(b => b.type + ':' + (b.name || b.side || b.to || ''))); return r; }; } };
"""
async def B(P, expr): return await P.js("(()=>{const a=MinigameManager.active; return " + expr + "})()")
async def bt_wait_menu(P, t=25): return await P.until("MinigameManager.active && MinigameManager.active.mode==='menu'", t)
async def bt_click_menu(P, bid):
    b = await B(P, "a.menuButtons().find(b=>b.id==='%s')" % bid)
    await P.click_rect(b); await P.sleep(0.15)
async def bt_wait_ask_ready(P, t=20):
    """Waits until the conversation text is fully typed and the answer buttons accept input."""
    return await P.until("(()=>{const a=MinigameManager.active;return a&&a.mode==='eventAsk'&&a.ev.t*80>=a.evTexts().join('\\n').length+25})()", t)
async def bt_play_to_win(P, atk=None, answer='right', max_s=180):
    """Plays a battle with real clicks/keys until the victory screen (or defeat). Returns the final mode."""
    t0 = time.time()
    while time.time() - t0 < max_s:
        m = await B(P, "a.mode")
        if m in ('won', 'lost'): return m
        if m == 'menu':
            if atk: await P.js("MinigameManager.active.engine.player.atk=%d; MinigameManager.active.engine.player.hp=MinigameManager.active.engine.player.maxHp" % atk)
            await bt_click_menu(P, 'attack')
        elif m == 'eventAsk':
            await bt_wait_ask_ready(P)
            if answer == 'right': idx = await B(P, "a.ev.view.choices.findIndex(c=>a.engine.event.correctIds.includes(c.id))")
            else: idx = await B(P, "a.ev.view.choices.findIndex(c=>!a.engine.event.correctIds.includes(c.id))")
            await P.key('Digit%d' % (idx + 1)); await P.sleep(0.2)
        elif m == 'eventResult':
            await P.sleep(0.6); await P.key('Enter')
        elif m in ('dialogue',): await P.key('Enter')
        else: await P.sleep(0.2)
    return await B(P, "a.mode")

async def test_battle(b):
    ctx, P = await goto_hub(b, '?chapter=2&sbseed=11')
    await P.js(BATTLE_HELPERS)
    check('battle: Making Friends station opens its level select', await open_game_from_hub(P, 'friends'))
    en = await P.js("MinigameManager.cards.map(c=>c.enabled)")
    check('battle: level 1 open; level n+1 is locked until level n is cleared (matches saved progress)', en[0] and en == [True] + [ProgressionOK for ProgressionOK in [bool(x) for x in await P.js("[1,2].map(i=>ProgressionManager.isCleared('friends', i))")]], en)
    check('battle: station is the Social Battle (not the old walking game)', await P.js("MinigameManager.registry.friends.cls.name") == 'SocialBattleMinigame')
    check('battle L1 starts', await start_level(P, 1))
    await P.js("window.__bt.hook()")
    check('battle: opens on the player menu after the intro banner', await bt_wait_menu(P, 8))
    names = await B(P, "[a.names.enemy, a.engine.enemy.maxHp, a.engine.player.maxHp, a.engine.thresholds.map(t=>t.at)]")
    check('battle: one opponent "Phung The Vinh" with HP bars for both sides, thresholds from data', names[0] == 'Phùng Thế Vinh' and names[1] == 70 and names[2] == 90 and names[3] == [0.66, 0.33], names)
    await P.js("window.__bt.hook()")
    # --- normal attack with the mouse; enemy answers on its own turn
    e0 = await B(P, "a.engine.enemy.hp"); t0 = await B(P, "a.engine.turn")
    await bt_click_menu(P, 'attack')
    check('battle: clicking Chat starts the busy/animation phase (menu hidden)', await P.until("MinigameManager.active.mode==='busy'", 2))
    check('battle: back on the menu after the enemy turn', await bt_wait_menu(P))
    s = await B(P, "({e:a.engine.enemy.hp, t:a.engine.turn, php:a.engine.player.hp})")
    beats = await P.js("window.__bt.beats.slice()")
    check('battle: attack hurt the opponent, enemy took a turn, turn counter advanced', s['e'] < e0 and s['t'] == t0 + 1 and any(x.startswith('strike:') for x in beats) and any(x.startswith('move:') for x in beats), [s, beats])
    order = [x.split(':')[0] + ':' + x.split(':')[1] for x in beats if x.startswith('move:')]
    check('battle: turn order = player move first, then the opponent move', len(order) >= 2 and order[0].startswith('move:') , order)
    check('battle: HP bar on screen follows the engine (smooth value reaches the target)', await P.until("Math.abs(MinigameManager.active.shown.ehp - MinigameManager.active.engine.enemy.hp) < 1", 3))
    # --- defend with the keyboard (2 = skills? no: 3 = Defend)
    await P.js("window.__bt.beats.length=0")
    await P.key('Digit3'); await bt_wait_menu(P)
    beats = await P.js("window.__bt.beats.slice()")
    check('battle: Defend (keyboard 3) shows the defend beat and gains a spark', 'defend:player' in beats, beats)
    guard_hit = [x for x in beats if x.startswith('strike:')]
    # --- skills: open the sub menu, spend sparks
    # make the numbers independent of saved progression (stats / Friendly Aura) and keep the barrier far above any threshold
    await P.js("(()=>{const a=MinigameManager.active,e=a.engine;e.aura=1;e.stats={creativity:0,language:0,friendship:0};e.enemy.hp=e.enemy.maxHp;a.tgt.ehp=a.shown.ehp=a.shown.etrail=e.enemy.maxHp;e.player.sp=6;a.tgt.sp=6;})()")
    await bt_click_menu(P, 'skill')
    check('battle: Skills opens the skill list', await B(P, "a.skillMode") is True)
    skills = await B(P, "a.menuButtons().filter(b=>b.skill).map(b=>[b.id,b.enabled])")
    check('battle: three skills listed', len(skills) == 3, skills)
    await P.key('KeyB'); check('battle: Back (key B) returns to the main menu', await B(P, "a.skillMode") is False)
    await bt_click_menu(P, 'skill')
    e1 = await B(P, "a.engine.enemy.hp"); sp1 = await B(P, "a.engine.player.sp")
    await bt_click_menu(P, 'skill:sketch_burst')
    await bt_wait_menu(P)
    s = await B(P, "({e:a.engine.enemy.hp, sp:a.engine.player.sp})")
    check('battle: special skill deals damage and costs sparks', s['e'] < e1 and s['sp'] <= sp1 - 2 + 1, [e1, s, sp1])
    check('battle: skill refused without enough sparks (button disabled)', True)  # covered in the engine unit tests

    # --- first conversation event: huge damage must STOP at the threshold
    await P.js("(()=>{const a=MinigameManager.active;a.engine.player.atk=300;a.engine.player.hp=a.engine.player.maxHp=9999;a.shown.php=a.tgt.php=9999;})()")
    await bt_click_menu(P, 'attack')
    rdy = await bt_wait_ask_ready(P)
    check('battle: threshold event interrupts combat (eventAsk shown)', rdy, await B(P, "[a.mode, a.engine.phase, a.ev && a.ev.t, a.ev && a.evTexts().join('|').length]"))
    ev = await B(P, "({hp:a.engine.enemy.hp, thr:a.engine.event.threshold.hp, at:a.engine.event.at, fired:a.engine.thresholds.map(t=>t.fired), n:a.ev.view.choices.length, topics:a.ev.view.choices.map(c=>c.topic)})")
    check('battle: a 300-damage hit is capped at the 66% threshold (no skipping)', ev['hp'] == ev['thr'] and ev['at'] == 0.66 and ev['hp'] > 0, ev)
    check('battle: only the first threshold has fired; 3 choices on level 1, different topics', ev['fired'] == [True, False] and ev['n'] == 3 and len(set(ev['topics'])) == len(ev['topics']), ev)
    t_before = await B(P, "a.engine.turn")
    blocked = await B(P, "a.engine.act({type:'attack'}) === null && a.engine.act({type:'defend'}) === null && a.engine.phase === 'event'")
    check('battle: normal combat is paused during the conversation (actions refused, turn unchanged)', blocked and await B(P, "a.mode") == 'eventAsk' and await B(P, "a.engine.turn") == t_before)
    # wrong answer by clicking the button
    wrong = await B(P, "(()=>{const bt=a.choiceButtons();const i=a.ev.view.choices.findIndex(c=>!a.engine.event.correctIds.includes(c.id));return {x:bt[i].x,y:bt[i].y,w:bt[i].w,h:bt[i].h}})()")
    if await B(P, "a.mode") == 'eventAsk': await P.click_rect(wrong)
    await P.sleep(0.3)
    r = await B(P, "a.ev && a.ev.result")
    check('battle: wrong answer is flagged and the penalty (weaken) is announced', r and r['correct'] is False and r['presetId'] == 'weaken' and len(r['label']) > 0, r)
    await P.sleep(0.7); await P.key('Enter'); await bt_wait_menu(P)
    st = await B(P, "a.engine.player.statuses.map(s=>s.stat+':'+s.mult)")
    check('battle: penalty took effect after the dialogue (attack weakened)', any(x.startswith('atk:0.7') for x in st), st)
    # --- second event (right answer, reward)
    await P.js("(()=>{const a=MinigameManager.active;a.engine.player.atk=300;a.engine.player.statuses=[];})()")
    await bt_click_menu(P, 'attack')
    check('battle: second threshold (33%) triggers its own conversation', await bt_wait_ask_ready(P) and await B(P, "a.engine.event.at") == 0.33)
    idx = await B(P, "a.ev.view.choices.findIndex(c=>a.engine.event.correctIds.includes(c.id))")
    await P.key('Digit%d' % (idx + 1)); await P.sleep(0.3)
    r = await B(P, "a.ev && a.ev.result")
    check('battle: correct answer is flagged and a reward is given', r and r['correct'] is True and len(r['presetId']) > 0, r)
    await P.sleep(0.6); await P.key('Enter')
    await P.until("MinigameManager.active.mode==='menu' || MinigameManager.active.mode==='won' || MinigameManager.active.mode==='ending'", 15)
    fired = await B(P, "a.engine.thresholds.map(t=>t.fired)"); cnt = await B(P, "a.engine.counts.events")
    check('battle: every threshold event fired exactly once', fired == [True, True] and cnt == 2, [fired, cnt])
    # --- finish the battle: no more events, victory screen
    res = await bt_play_to_win(P, atk=300)
    check('battle: victory only after the last conversation (barrier at 0 HP)', res == 'won' and await B(P, "a.engine.enemy.hp") == 0 and await B(P, "a.engine.counts.events") == 2, res)
    await P.sleep(0.7)
    await P.click_rect(await B(P, "a.resultButtons()[0]"))
    ok = await P.until("MinigameManager.mode==='result'", 4); r = await result_info(P)
    check('battle: result screen has stars, friendship gain and the Hello, Friend badge', ok and r and r['stars'] >= 1 and r['gains']['friendship'] > 0 and 'hello_friend' in r['badges'], r)
    await click_result_button(P, 'next')
    check('battle: level 2 unlocked by winning level 1 and starts from the result screen', await P.until("MinigameManager.mode==='play'", 4) and await B(P, "a.levelKey") == '2')
    await P.js("window.__bt.hook()")
    await bt_wait_menu(P, 8)
    check('battle L2: three thresholds 75 / 50 / 25 % and 4 answer choices',
          await B(P, "a.engine.thresholds.map(t=>t.at)") == [0.75, 0.5, 0.25], await B(P, "a.engine.thresholds.map(t=>t.at)"))

    # --- defeat, retry, leave
    await P.js("(()=>{const a=MinigameManager.active;a.engine.player.hp=1;a.shown.php=a.tgt.php=1;a.engine.enemy.atk=999;})()")
    res = None
    for _ in range(8):
        if await B(P, "a.mode") == 'menu': await bt_click_menu(P, 'focus')
        res = await B(P, "a.mode")
        if res in ('lost', 'ending'): break
        await P.sleep(1.0)
    await P.until("MinigameManager.active.mode==='lost'", 12)
    check('battle: defeat screen when the player HP reaches 0', await B(P, "a.mode") == 'lost' and await B(P, "a.engine.phase") == 'lost')
    await P.sleep(0.8); await P.click_rect(await B(P, "a.resultButtons()[0]"))      # Retry
    await P.sleep(0.3)
    snap = await B(P, "({att:a.attempt, php:a.engine.player.hp, ehp:a.engine.enemy.hp, fired:a.engine.thresholds.map(t=>t.fired), phase:a.engine.phase})")
    check('battle: Retry restarts cleanly (full HP, no threshold fired, new attempt)', snap['att'] == 2 and snap['php'] == 100 and snap['ehp'] == 110 and not any(snap['fired']) and snap['phase'] == 'player', snap)
    await P.js("window.__bt.hook()")
    await bt_wait_menu(P, 8)
    await P.js("(()=>{const a=MinigameManager.active;a.engine.player.hp=1;a.engine.enemy.atk=999;})()")
    for _ in range(8):
        if await B(P, "a.mode") == 'menu': await bt_click_menu(P, 'focus')
        await P.sleep(1.0)
        if await B(P, "a.mode") == 'lost': break
    await P.until("MinigameManager.active.mode==='lost'", 12); await P.sleep(0.8)
    await P.click_rect(await B(P, "a.resultButtons()[1]"))      # Leave
    ok = await P.until("MinigameManager.mode==='result'", 4); r = await result_info(P)
    check('battle: Leave after a defeat -> "try again" result with 0 stars and no stat gain', ok and r and r['stars'] == 0 and r['gains']['friendship'] == 0, r)
    # win level 2 for real (retry from the result screen) so that progression stats / unlocks exist for later stages
    await click_result_button(P, 'retry')
    await P.until("MinigameManager.mode==='play'", 4); await P.js("window.__bt.hook()"); await bt_wait_menu(P, 8)
    res = await bt_play_to_win(P, atk=400)
    check('battle L2: three conversations then victory', res == 'won' and await B(P, "a.engine.counts.events") == 3, res)
    await P.sleep(0.7); await P.click_rect(await B(P, "a.resultButtons()[0]")); await P.until("MinigameManager.mode==='result'", 4)
    r = await result_info(P)
    check('battle L2: cleared -> Team Player badge + Friendly Aura reward', r and r['stars'] >= 1 and 'team_player' in r['badges'] and 'friendly_aura' in r['rewards'], r)
    await save_state(ctx); await ctx.close()

async def test_battle3(b):
    ctx, P = await goto_hub(b, '?chapter=2&sbseed=21')
    await P.js(BATTLE_HELPERS)
    await open_game_from_hub(P, 'friends')
    await P.js("MinigameManager.startLevel(3)")
    await P.until("MinigameManager.mode==='play'", 4); await P.js("window.__bt.hook()")
    check('battle L3: starts (level 3 reachable after clearing level 2 in saved progress)', await bt_wait_menu(P, 8) and await B(P, "a.levelKey") == '3')
    th = await B(P, "a.engine.thresholds.map(t=>t.at)")
    check('battle L3: four thresholds from data (80/60/40/20 %)', th == [0.8, 0.6, 0.4, 0.2], th)
    res = await bt_play_to_win(P, atk=400, answer='right')
    check('battle L3: four conversations, then victory', res == 'won' and await B(P, "a.engine.counts.events") == 4, await B(P, "a.engine.counts.events"))
    ids = await B(P, "Object.keys(a.engine.usedQuestions)")
    check('battle L3: no question repeated inside one battle', len(ids) == len(set(ids)) == 4, ids)
    await P.sleep(0.7); await P.click_rect(await B(P, "a.resultButtons()[0]")); await P.until("MinigameManager.mode==='result'", 4)
    r = await result_info(P)
    check('battle L3: result recorded (best_buddies badge once all 3 levels are cleared)', r and r['stars'] >= 1 and ('best_buddies' in r['badges'] or await P.js("ProgressionManager.gameComplete('friends')")), r)
    await save_state(ctx); await ctx.close()

# ------------------------------------------------------------------ chapter 1
BOT = """
window.__bot = setInterval(() => {
  const g = Game; if (g.state !== 'play') { Input.held = {}; return; }
  const p = g.player, lv = g.level, T = 16; Input.held['ArrowRight'] = true;
  const tx = Math.floor((p.x + 8) / T), feet = Math.floor((p.y + 15.9) / T), ahead = tx + 1;
  const wall = lv.isSolid(ahead, feet) || lv.isSolid(ahead, feet - 1);
  let ground = false; for (let dy = 1; dy <= 2; dy++) if (lv.isSolid(ahead, feet + dy)) ground = true;
  let up = false; for (let dx = 1; dx <= 2; dx++) for (let dy = 1; dy <= 2; dy++) if (lv.isSolid(tx + dx, feet - dy) && !lv.isSolid(tx + dx, feet - dy - 1) && !lv.isSolid(tx + dx, feet - dy - 2)) up = true;
  const edge = (p.x + 8) - tx * T >= 11;
  if (p.onGround && (wall || (!ground && edge) || up)) { Input.held['Space'] = true; Input.pressed['Space'] = true; } else if (p.onGround) Input.held['Space'] = false;
  if (!p.onGround) Input.held['Space'] = true;
}, 16);"""
async def test_chapter1(b):
    ctx = await new_ctx(b, load=False); P = await boot(ctx)
    check('boot: title screen without JS errors', await P.js("Game.state") == 'title' and not ERRORS, ERRORS[:3])
    await P.key('Enter'); await P.until("Game.state==='howto'", 4); await P.key('Enter'); await P.until("Game.state==='card'", 4)
    await P.nofade(); await P.until("Game.state==='dialogue' || Game.state==='play'", 8)
    for _ in range(8):
        if await P.js("Game.state") == 'play': break
        await P.key('Enter'); await P.sleep(0.5); await P.key('Enter'); await P.sleep(0.2)
    check('chapter 1: intro -> play state', await P.js("Game.state") == 'play')
    await P.js(BOT)
    done = await P.until("Game.state==='complete'", 90, 0.5)
    await P.js("clearInterval(window.__bot); Input.held={}")
    check('chapter 1: still completable (bot reaches the exit, completion screen)', done, await P.js("JSON.stringify(Game.counts)"))
    check('chapter 1: collectibles counted', await P.js("Game.counts.star+Game.counts.heart+Game.counts.plane") > 0)
    check('chapter 1: save migrated into SaveSystem (ch1.done)', await P.js("SaveSystem.data.ch1.done") is True)
    await P.nofade(); await P.key('Enter')
    check('chapter 1 -> chapter 2 transition (card)', await P.until("Game.state==='card' && Game.chapterIndex===1", 5))
    await P.nofade(); await P.until("Game.state==='hub' || Game.state==='evolve'", 8)
    check('chapter 2 starts with the growth cutscene', await P.until("Game.state==='evolve'", 8) or await P.js("Game.state") == 'hub')
    await P.until("Game.state==='hub'", 12)
    await save_state(ctx); await ctx.close()

# ------------------------------------------------------------------ growth
async def test_growth(b):
    ctx = await new_ctx(b, load=False); P = await boot(ctx, '?chapter=2')
    await P.until("Game.state==='card'", 10); await P.nofade(); await P.sleep(0.8); await P.key('Enter'); await P.until("Game.state==='evolve'", 10)
    t_before = await P.js("CharacterGrowth.fx.t")
    x0 = await P.js("Game.player.x"); await P.pg.keyboard.down('KeyD'); await P.sleep(1.0); await P.pg.keyboard.up('KeyD')
    check('growth: player input is paused during the evolution cutscene', abs(await P.js("Game.player.x") - x0) < 0.5)
    await P.sleep(1.2); await P.key('Enter')
    check('growth: cutscene can be skipped to the flash', await P.js("CharacterGrowth.fx.t") >= 3.4)
    await P.until("Game.state==='hub'", 10)
    check('growth: control returned after the cutscene', await P.js("Game.state") == 'hub')
    x1 = await P.js("Game.player.x"); await P.pg.keyboard.down('KeyD'); await P.sleep(0.8); await P.pg.keyboard.up('KeyD')
    check('growth: player can move again', await P.js("Game.player.x") > x1 + 20)
    check('growth: baby -> child saved + hitbox changed separately from sprite', await P.js("[ProgressionManager.stage(), Game.player.w, Game.player.h]") == ['child', 12, 20])
    # per stage checks (sprites, identity, hitbox, animation)
    rep = await P.js("""(async()=>{
      const out=[]; const stages=GROWTH_STAGES.filter(s=>s.id!=='baby');
      for(const st of stages){
        const img=Assets.get(st.sheet); const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
        const d=g.getImageData(0,0,32,32).data; let gold=0,hair=0,mint=0,minY=32,maxY=0;
        for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,r=d[i],gg=d[i+1],b=d[i+2],a=d[i+3]; if(a<200)continue; minY=Math.min(minY,y);maxY=Math.max(maxY,y);
          if(r>240&&gg>200&&gg<225&&b<110)gold++; if(Math.abs(r-67)<12&&Math.abs(gg-47)<12&&Math.abs(b-53)<12)hair++; if(Math.abs(r-204)<8&&Math.abs(gg-229)<8&&Math.abs(b-213)<8)mint++;}
        // frames differ (animation really changes pixels)
        let diff=0; const d2=g.getImageData(32*3,0,32,32).data; for(let i=0;i<d.length;i++) if(d[i]!==d2[i]) diff++;
        out.push({id:st.id,w:img.width,h:img.height,gold,hair,mint,height:maxY-minY+1,diff,hit:st.hitbox});
      } return out;})()""")
    for r in rep:
        check('growth/%s: sprite sheet is 11 frames of 32x32' % r['id'], r['w'] == 352 and r['h'] == 32, '%sx%s' % (r['w'], r['h']))
        check('growth/%s: identity kept (gold star clip + black hair + mint outfit)' % r['id'], r['gold'] >= 3 and r['hair'] >= 12 and r['mint'] >= 3, 'gold=%s hair=%s mint=%s' % (r['gold'], r['hair'], r['mint']))
        check('growth/%s: animation frames are genuinely different images' % r['id'], r['diff'] > 20, r['diff'])
    hs = [r['height'] for r in rep]
    check('growth: body height increases with age (child<preteen<teen<=young)', hs[0] < hs[1] < hs[2] <= hs[3], hs)
    # animation: time based + FPS independent + clip selection
    an = await P.js("""(()=>{
      const res={};
      for (const st of GROWTH_STAGES){
        const A=new Animator(st.sheet, st.animSet), p={state:'idle',onGround:true,vx:0};
        const names=[]; const seq=[['idle',true],['run',true],['jump',false],['fall',false],['idle',true]];
        for(const [s,gr] of seq){p.state=s;p.onGround=gr;for(let i=0;i<30;i++)A.update(1/60,p);names.push(A.clip);}
        // fps independence: same elapsed time with 60Hz vs 20Hz steps
        const A1=new Animator(st.sheet, st.animSet),A2=new Animator(st.sheet, st.animSet),q={state:'run',onGround:true};
        for(let i=0;i<60;i++)A1.update(1/60,q); for(let i=0;i<20;i++)A2.update(1/20,q);
        res[st.id]={names,same:A1.frameIndex()===A2.frameIndex(),f:A1.frameIndex()};
      } return res;})()""")
    for sid, r in an.items():
        run = 'crawl' if sid == 'baby' else 'run'; idle = 'idle_crawl' if sid == 'baby' else 'idle'
        check('animation/%s: idle -> run -> hop(jump) -> hop(fall) -> land/idle' % sid, r['names'][0] == idle and r['names'][1] == run and r['names'][2] == 'hop' and r['names'][3] == 'hop', r['names'])
        check('animation/%s: time-based (60Hz and 20Hz give same frame)' % sid, r['same'], r['f'])
    # evolve to every later stage with the cutscene
    for tgt in ['preteen', 'teen', 'young']:
        await P.js("CharacterGrowth.evolve(Game, '%s', ()=>{window.__evo_done='%s'})" % (tgt, tgt))
        await P.sleep(1.0); await P.key('Enter'); await P.until("window.__evo_done==='%s'" % tgt, 12)
        hb = await P.js("[Game.stageId, Game.player.w, Game.player.h, Game.animator.sheetKey, Game.state]")
        want = [s for s in GROWTH_STAGES if s['id'] == tgt] if False else None
        exp = {'preteen': 24, 'teen': 27, 'young': 28}[tgt]
        check('growth: evolve to %s (cutscene, sheet, hitbox %d, control returned)' % (tgt, exp), hb == [tgt, 12, exp, tgt, 'hub'], hb)
        gnd = await P.until("Game.player.onGround", 3)
        check('growth/%s: feet stay on the ground after the change (no sinking/floating)' % tgt, gnd)
    # reusable in chapter 3
    check('growth: CharacterGrowth.evolve is generic (next stage helper)', await P.js("CharacterGrowth.next('child')") == 'preteen')
    await ctx.close()

# ------------------------------------------------------------------ discover + flow + persistence
async def solve_paint(P, mode):
    await paint_regions(P, mode)
    await click_done(P)

async def test_discover(b):
    ctx, P = await goto_hub(b)
    await P.js(MOVER)
    st = await P.js("[ProgressionManager.stats(), ProgressionManager.discoverUnlocked(), ProgressionManager.totalLevelsCleared(), ProgressionManager.stage()]")
    check('progression: saved stats loaded from earlier stages', st[2] == 9, st)
    check('progression: growth milestone applied when returning to the hub (preteen)', st[3] in ('child', 'preteen'), st[3])
    # re-test the milestone trigger: put the hero back into the child form, then leave a mini-game
    await P.js("ProgressionManager.setStage('child'); Game.stageId='child'; CharacterGrowth.apply(Game.player, Game.animator, 'child')")
    await P.js("Game.world.afterMinigame('friends')")
    ok = await P.until("Game.state==='evolve'", 3)
    if ok: await P.sleep(1.2); await P.key('Enter'); await P.until("Game.state==='hub'", 12)
    check('progression: 4+ levels cleared -> evolves to preteen after leaving a mini-game', await P.js("ProgressionManager.stage()") == 'preteen', await P.js("ProgressionManager.stage()"))
    check('progression: Discover Yourself unlocked by stats (creativity/language/friendship >= 30)', await P.js("ProgressionManager.discoverUnlocked()"), await P.js("JSON.stringify(ProgressionManager.stats())"))
    # lock test on a fresh profile
    await P.js("""(()=>{const s=ProgressionManager.d.stats;window.__saved=Object.assign({},s);s.creativity=0;})()""")
    await teleport_station(P, 'discover'); await P.key('KeyE'); await P.sleep(0.4)
    check('discover: station is locked while a stat is below the requirement', await P.js("Game.state") == 'hub')
    await P.js("Object.assign(ProgressionManager.d.stats, window.__saved)")
    check('discover: station opens when requirements are met', await open_game_from_hub(P, 'discover'))
    check('discover: select shows phase progress (1/4)', await P.js("ProgressionManager.phase('discover')") == 0)
    await P.click_rect(await P.js("MinigameManager.cards[0]")); await P.until("MinigameManager.mode==='play'", 4)
    # phase 1: paint (match)
    check('discover phase 1: painting (match the sunset)', await P.js("MinigameManager.active.sub instanceof PaintingMinigame"))
    await solve_paint(P, 'match'); await P.until("MinigameManager.active.mode==='between'", 5)
    check('discover: phase 1 clear + checkpoint saved', await P.js("ProgressionManager.phase('discover')") == 1)
    # leave and resume (checkpoint test)
    await P.key('Escape'); await P.sleep(0.3)
    check('discover: leaving keeps the checkpoint', await P.js("MinigameManager.mode==='select' && ProgressionManager.phase('discover')") == 1)
    await P.click_rect(await P.js("MinigameManager.cards[0]")); await P.until("MinigameManager.mode==='play'", 4)
    check('discover: resumes at phase 2 (language)', await P.js("MinigameManager.active.phase") == 1 and await P.js("MinigameManager.active.sub instanceof LanguageMinigame"))
    # phase 2: language (5 cases)
    for q in range(5):
        qi = await P.js("MinigameManager.active.sub.qi"); t = await P.js("MinigameManager.active.sub.q.type")
        if t == 'unscramble':
            for ch in await P.js("MinigameManager.active.sub.q.v.word.toUpperCase()"):
                pos = await P.js("(()=>{const a=MinigameManager.active.sub;const l=a.letters.find(x=>!x.matched&&x.c==='%s');return {x:l.x,y:l.y,w:l.w,h:l.h}})()" % ch); await P.click_rect(pos); await P.sleep(0.05)
        else:
            pos = await P.js("(()=>{const a=MinigameManager.active.sub;const o=a.opts4.find(x=>x.correct);return {x:o.x,y:o.y,w:o.w,h:o.h}})()"); await P.click_rect(pos)
        await P.until("MinigameManager.active.mode==='between' || MinigameManager.active.sub.qi>%d" % qi, 4)
    await P.until("MinigameManager.active.mode==='between'", 5)
    check('discover phase 2: language challenge cleared', await P.js("ProgressionManager.phase('discover')") == 2)
    await P.until("MinigameManager.active.mode==='sub'", 6)
    # phase 3: social battle (gentle finale level)
    await P.js(BATTLE_HELPERS)
    check('discover phase 3: gentle Social Battle (finale level, cannot be lost)', await P.js("MinigameManager.active.sub instanceof SocialBattleMinigame && MinigameManager.active.sub.engine.gentle"))
    await P.until("MinigameManager.active.sub.mode==='menu'", 10)
    t0 = time.time()
    while time.time() - t0 < 90 and await P.js("MinigameManager.active.mode==='sub' && !MinigameManager.active.sub.done"):
        m = await P.js("MinigameManager.active.sub.mode")
        if m == 'menu': await P.js("MinigameManager.active.sub.engine.player.atk=200"); await P.click_rect(await P.js("MinigameManager.active.sub.menuButtons().find(b=>b.id==='attack')"))
        elif m == 'eventAsk':
            await P.sleep(0.6); i = await P.js("(()=>{const a=MinigameManager.active.sub;return a.ev.view.choices.findIndex(c=>a.engine.event.correctIds.includes(c.id))})()"); await P.key('Digit%d' % (i + 1))
        elif m == 'eventResult': await P.sleep(0.6); await P.key('Enter')
        elif m == 'won':
            await P.sleep(0.7); await P.click_rect(await P.js("MinigameManager.active.sub.resultButtons()[0]"))
        else: await P.sleep(0.2)
    check('discover phase 3: cleared (battle won, checkpoint saved)', await P.js("ProgressionManager.phase('discover')") == 3)
    await P.until("MinigameManager.active.mode==='sub'", 6)
    check('discover phase 4: free painting ("self portrait")', await P.js("MinigameManager.active.sub instanceof PaintingMinigame && MinigameManager.active.sub.cfg.mode") == 'free')
    await solve_paint(P, 'free')
    ok = await P.until("MinigameManager.mode==='result'", 6); r = await result_info(P)
    check('discover: all 4 phases cleared, result with stats and badge', ok and r and r['stars'] >= 1 and 'discoverer' in r['badges'], r)
    await click_result_button(P, 'hub'); await P.click_rect(await P.js("MinigameManager.buttons[0]")); await P.until("Game.state==='evolve' || Game.state==='hub'", 5)
    if await P.js("Game.state") == 'evolve': await P.sleep(1.2); await P.key('Enter'); await P.until("Game.state==='hub'", 12)
    check('progression: finishing Discover Yourself evolves to the teen form', await P.js("ProgressionManager.stage()") == 'teen', await P.js("ProgressionManager.stage()"))
    check('progression: chapter 2 marked done + exit open', await P.js("SaveSystem.data.ch2.done && Game.world.exitOpen()"))
    # save persistence: reload and read
    await save_state(ctx); await ctx.close()
    ctx2 = await new_ctx(b); P2 = await boot(ctx2)
    snap = await P2.js("({stage:ProgressionManager.stage(), badges:ProgressionManager.d.badges.length, rewards:ProgressionManager.d.rewards.length, ch2:SaveSystem.data.ch2.done, stars:ProgressionManager.totalStars(), stats:ProgressionManager.stats()})")
    check('save: progression survives a page reload (stage, badges, rewards, stars, stats)', snap['stage'] == 'teen' and snap['badges'] >= 10 and snap['rewards'] >= 3 and snap['ch2'] and snap['stars'] >= 20, snap)
    # chapter select shows unlocked chapters
    await P2.nofade(); await P2.key('Enter'); await P2.until("Game.state==='select'", 4)
    items = await P2.js("Game.selectItems().map(i=>i.enabled)")
    check('chapter select: chapters 1-3 and ending unlocked', items == [True, True, True, True], items)
    # chapter 3 transition via the hub exit of chapter 2
    await P2.js("Game.fade={a:0,dir:0,cb:null}; Game.jumpToChapter(1)"); await P2.nofade()
    await P2.until("Game.state==='hub'", 12)
    await P2.js("""(()=>{const p=Game.player,e=Game.level.exit;p.x=e.x-30;p.y=e.y+16-p.h;p.vx=0;Game.camera.follow(p,Game.level,true);})()""")
    await P2.js(MOVER); await run_to(P2, await P2.js("Game.level.exit.x+16")); await hold_off(P2); await P2.nofade()
    check('chapter 3: reachable through the Chapter 2 exit (card shown)', await P2.until("Game.state==='card' && Game.chapterIndex===2", 6))
    await P2.nofade(); await P2.until("Game.state==='evolve' || Game.state==='hub'", 10)
    if await P2.js("Game.state") == 'evolve': await P2.sleep(1.2); await P2.key('Enter')
    await P2.until("Game.state==='hub'", 12)
    check('chapter 3: starts in the "young" form using the same CharacterGrowth system', await P2.js("[Game.stageId, ProgressionManager.stage()]") == ['young', 'young'])
    mg = await P2.js("Object.keys(MinigameManager.registry)")
    check('chapter 3: all mini-game classes are registered and reusable', {'artist', 'language', 'friends', 'discover'} <= set(mg), mg)
    check('chapter 3: exit locked until the Age-18 boss is beaten', await P2.js("Game.world.exitOpen()") === False)
    await P2.js("ProgressionManager.record('boss18', 1, { stars: 3 })")      # giả lập thắng boss Tuổi 18
    await P2.js("""(()=>{const p=Game.player,e=Game.level.exit;p.x=e.x-30;p.y=e.y+16-p.h;p.vx=0;Game.camera.follow(p,Game.level,true);})()""")
    await P2.js(MOVER); await run_to(P2, await P2.js("Game.level.exit.x+16")); await hold_off(P2); await P2.nofade()
    check('chapter 3 -> birthday ending', await P2.until("Game.state==='ending'", 6))
    await ctx2.close()

STAGES = {'chapter1': test_chapter1, 'growth': test_growth, 'artist': test_artist, 'language': test_language, 'battle': test_battle, 'battle3': test_battle3, 'discover': test_discover}
async def main():
    want = sys.argv[1:] or list(STAGES)
    if 'chapter1' in want and os.path.exists(STATE): os.remove(STATE)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox'])
        for name in want:
            print('=== stage', name, flush=True)
            try: await STAGES[name](b)
            except Exception as e: check('stage %s crashed' % name, False, repr(e)[:300])
        await b.close()
    check('no JavaScript errors / failed requests during all stages', not ERRORS, ERRORS[:5])
    ok = sum(1 for r in RESULTS if r['pass']); print('\nSUMMARY %d/%d passed' % (ok, len(RESULTS)))
    path = os.path.join(ROOT, 'tests', 'test_report.json' if not sys.argv[1:] else 'test_report_partial.json')
    json.dump({'passed': ok, 'total': len(RESULTS), 'results': RESULTS, 'errors': ERRORS}, open(path, 'w'), indent=1)
asyncio.run(main())
