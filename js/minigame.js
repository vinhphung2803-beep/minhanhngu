// ============================================================
// minigame.js - MinigameBase + MinigameManager.
//
// A mini-game is a class extending MinigameBase:
//   constructor(game, level, opts)   begin()   update(dt)   render(ctx)
//   and calls this.finish({ score, stars (0-3, 0 = not passed), stats:{creativity,language,friendship} })
// MinigameManager.register('id', Class) adds it. Chapter 3 can register new ones the same way.
// The manager draws the level-select screen and the result screen, records progress
// through ProgressionManager and reports badges/rewards.
// ============================================================
class MinigameBase {
  constructor(game, level, opts) {
    this.game = game; this.level = level; this.opts = opts || {};
    this.t = 0; this.done = false; this.result = null;
  }
  begin() {}
  update(dt) { this.t += dt; }
  render(ctx) {}
  finish(result) { if (!this.done) { this.done = true; this.result = result; } }
  // helper: stars from a 0..1 quality value and three thresholds
  starsFor(q, th) { return q >= th[2] ? 3 : q >= th[1] ? 2 : q >= th[0] ? 1 : 0; }
}

const MinigameManager = {
  registry: {},
  mode: 'none',                // none | select | play | result
  gameId: null, level: 1, active: null, onExit: null, res: null, rec: null, t: 0,
  buttons: [],

  register(id, cls, meta) { this.registry[id] = Object.assign({ cls }, meta || {}); },
  isOpen() { return this.mode !== 'none'; },

  open(id, onExit) {
    this.gameId = id; this.onExit = onExit; this.mode = 'select'; this.t = 0; this.active = null;
    Sfx.play('ui');
  },
  close() { this.mode = 'none'; this.active = null; const cb = this.onExit; this.onExit = null; if (cb) cb(); },

  levels() { return ProgressionManager.levelCount(this.gameId); },
  levelName(i) { return ((CH2_TEXT.levelNames[this.gameId] || [])[i - 1]) || ('Màn ' + i); },

  startLevel(n) {
    this.level = n;
    const meta = this.registry[this.gameId];
    this.active = new meta.cls(Game, n, { attempt: ProgressionManager.game(this.gameId).plays });
    this.active.begin();
    this.mode = 'play'; this.t = 0;
    Sfx.play('ui');
  },

  // ---------------- update ----------------
  update(dt) {
    this.t += dt;
    if (this.mode === 'select') this.updateSelect();
    else if (this.mode === 'play') {
      const exitBtn = { id: 'exit', x: 300, y: 2, w: 16, h: 16 };
      if (UIManager.click([exitBtn]) || Input.key('Escape')) { this.mode = 'select'; this.active = null; Sfx.play('ui'); return; }
      this.active.update(dt);
      if (this.active.done) this.complete(this.active.result);
    } else if (this.mode === 'result') this.updateResult();
  },

  complete(result) {
    this.res = result;
    this.rec = ProgressionManager.record(this.gameId, this.level, result);
    this.mode = 'result'; this.t = 0; this.active = null;
    Sfx.play(result.stars >= 1 ? 'win' : 'land');
  },

  updateSelect() {
    const n = this.levels(), btns = [];
    const cw = n === 1 ? 200 : 88, gap = 10, total = n * cw + (n - 1) * gap, x0 = Math.round((CONFIG.WIDTH - total) / 2);
    for (let i = 1; i <= n; i++) btns.push({ id: 'lv' + i, x: x0 + (i - 1) * (cw + gap), y: 34, w: cw, h: 104, enabled: ProgressionManager.isLevelUnlocked(this.gameId, i) });
    this.cards = btns;
    this.buttons = [{ id: 'back', x: 10, y: 150, w: 70, h: 22, label: LT('back', 'Back'), icon: 'back' }];
    const c = UIManager.click(this.buttons.concat(btns));
    if (c === 'back' || Input.key('Escape')) { this.close(); return; }
    for (let i = 1; i <= n; i++) if (c === 'lv' + i || (Input.key('Digit' + i) && btns[i - 1].enabled)) this.startLevel(i);
  },

  updateResult() {
    const passed = this.res.stars >= 1;
    const n = this.levels(), hasNext = passed && this.level < n && ProgressionManager.isLevelUnlocked(this.gameId, this.level + 1);
    this.buttons = [{ id: 'retry', x: 24, y: 150, w: 82, h: 22, label: LT('retry', 'Retry'), icon: 'undo' }];
    if (hasNext) this.buttons.push({ id: 'next', x: 119, y: 150, w: 82, h: 22, label: LT('next', 'Next'), icon: 'follow' });
    this.buttons.push({ id: 'hub', x: 214, y: 150, w: 82, h: 22, label: LT('hub', 'Hub'), icon: 'back' });
    if (this.t < 0.6) return;
    const c = UIManager.click(this.buttons);
    if (c === 'retry' || Input.key('KeyR')) this.startLevel(this.level);
    else if (c === 'next' || (hasNext && Input.key('Enter'))) this.startLevel(this.level + 1);
    else if (c === 'hub' || Input.key('Escape')) this.mode = 'select';
  },

  // ---------------- render ----------------
  render(ctx) {
    if (this.mode === 'play' && this.active) {
      this.active.render(ctx);
      UIManager.drawButton(ctx, { x: 300, y: 2, w: 16, h: 16, icon: 'back' });
      return;
    }
    // soft background for select/result
    Renderer.drawBackground(ctx, this.t * 8, this.t);
    UI.dim(ctx, 0.3);
    if (this.mode === 'select') this.renderSelect(ctx);
    else if (this.mode === 'result') this.renderResult(ctx);
  },

  renderSelect(ctx) {
    const id = this.gameId, name = CH2_TEXT.stations[id] || id;
    UI.panel(ctx, 60, 6, 200, 20);
    Text.draw(ctx, name, 160, 12, { align: 'center', color: UIManager.C.ink });
    const n = this.levels();
    (this.cards || []).forEach((c, k) => {
      const i = k + 1, un = c.enabled, hov = un && UIManager.hover(c);
      UI.panel(ctx, c.x, c.y - (hov ? 2 : 0), c.w, c.h, un ? (hov ? '#fff' : UI.C.cream) : '#d9d2e3');
      const cx = c.x + c.w / 2, cy = c.y - (hov ? 2 : 0);
      if (id === 'discover') {
        const ph = ProgressionManager.phase('discover'), total = 4;
        Text.draw(ctx, this.levelName(i), cx, cy + 12, { align: 'center', scale: 2, color: UIManager.C.ink });
        Text.draw(ctx, LT('phase', 'Phase') + ' ' + Math.min(total, ph + 1) + '/' + total, cx, cy + 40, { align: 'center', color: UIManager.C.soft });
        for (let p = 0; p < total; p++) { ctx.fillStyle = p < ph ? UIManager.C.pink : '#e9dff0'; ctx.fillRect(cx - 40 + p * 22, cy + 56, 18, 6); }
      } else {
        Text.draw(ctx, String(i), cx, cy + 8, { align: 'center', scale: 2, color: un ? '#c44d7a' : UIManager.C.soft });
        const lines = UIManager.wrap(this.levelName(i), c.w - 12);
        Text.draw(ctx, lines.join('\n'), cx, cy + 32, { align: 'center', color: un ? UIManager.C.ink : UIManager.C.soft, lineH: 10 });
      }
      UIManager.stars(ctx, cx, cy + 74, ProgressionManager.stars(id, i), 3, 14);
      if (!un) UIManager.icon(ctx, 'lock', cx - 8, cy + 84, 1);
      else {
        const best = ProgressionManager.bestScore(id, i);
        if (best) Text.draw(ctx, String(best), cx, cy + 90, { align: 'center', color: UIManager.C.soft });
        else Text.draw(ctx, hov || id === 'discover' ? LT('start', 'Start') : '', cx, cy + 90, { align: 'center', color: '#c44d7a' });
      }
    });
    UIManager.drawButtons(ctx, this.buttons);
    // stats
    const s = ProgressionManager.stats();
    ['creativity', 'language', 'friendship'].forEach((k, i) => UIManager.statRow(ctx, k, 100 + i * 70 - 6, 160, 64, s[k]));
  },

  renderResult(ctx) {
    const res = this.res, rec = this.rec, passed = res.stars >= 1;
    UI.panel(ctx, 24, 8, 272, 136);
    Text.draw(ctx, passed ? LT('result', 'Result') : LT('wrong', 'Try again'), 160, 15, { align: 'center', scale: 2, color: UIManager.C.ink });
    // stars appear one by one
    const shown = Math.min(res.stars, Math.floor(this.t / 0.45));
    UIManager.stars(ctx, 160, 38, shown, 3, 20);
    Text.draw(ctx, LT('score', 'Score') + ': ' + res.score, 160, 62, { align: 'center', color: UIManager.C.ink });
    if (res.detail) Text.draw(ctx, res.detail, 160, 73, { align: 'center', color: UIManager.C.soft });
    // stat gains
    ['creativity', 'language', 'friendship'].forEach((k, i) => {
      const y = 88 + i * 12, g = rec.gains[k];
      UIManager.statRow(ctx, k, 40, y, 150, ProgressionManager.stats()[k]);
      Text.draw(ctx, g > 0 ? '+' + g : '', 198, y, { color: '#c44d7a' });
      Text.draw(ctx, CH2_TEXT.stats[k], 222, y, { color: UIManager.C.soft });
    });
    // badges / rewards
    let bx = 40;
    rec.newBadges.forEach((b) => { UIManager.badge(ctx, b, bx, 122, 1); bx += 20; });
    rec.newRewards.forEach((r) => { UIManager.icon(ctx, 'sparkle', bx, 122, 1); Text.draw(ctx, (CH2_TEXT.rewards[r] || {}).name || r, bx + 18, 126, { color: '#c44d7a' }); bx += 20 + Text.width((CH2_TEXT.rewards[r] || {}).name || r); });
    UIManager.drawButtons(ctx, this.buttons);
  }
};
