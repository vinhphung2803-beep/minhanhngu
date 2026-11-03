// ============================================================
// paint.js - PaintingMinigame ("The Little Artist")
// Tools: Fill (whole region), Brush (freehand, 3 sizes), Eraser, Undo, Clear.
// Pictures are paint-by-region grids from data/paintings.js ('.' = outline, cannot be painted).
// Modes: free (just colour it), match (copy the reference), exact (strict).
// Mouse/touch: tap/drag.  Keyboard: arrows move, SPACE paints, 1-8 colours, T tool, Z undo.
// Reusable: DiscoverMinigame creates it with opts.cfg to build its own phases.
// ============================================================
class PaintingMinigame extends MinigameBase {
  constructor(game, level, opts) {
    super(game, level, opts);
    this.cfg = (opts && opts.cfg) || PAINT_LEVELS[level];
    const pic = PAINTINGS[this.cfg.painting];
    this.pic = pic; this.W = pic.w; this.H = pic.h;
    this.S = 4; this.PX = 8; this.PY = 30;
    this.cell = new Int16Array(this.W * this.H);           // region index (0 = outline) as char code
    this.region = [];                                       // char per cell ('.' = outline)
    this.counts = {};
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const ch = pic.rows[y][x]; this.region.push(ch);
      if (ch !== '.') this.counts[ch] = (this.counts[ch] || 0) + 1;
    }
    this.total = Object.values(this.counts).reduce((a, b) => a + b, 0);
    this.paint = new Int8Array(this.W * this.H).fill(-1);
    this.colors = PAINT_COLORS.slice(0, ProgressionManager.hasReward('palette_plus') ? 12 : 8);
    this.color = 0; this.tool = 'fill'; this.size = 1;
    this.undo = []; this.last = null; this.stroke = false;
    this.cur = { x: 24, y: 15 }; this.keyT = 0;
    this.msg = ''; this.msgT = 0; this.wrong = null; this.attempts = 0;
    this.cv = document.createElement('canvas'); this.cv.width = this.W; this.cv.height = this.H;
    this.ref = document.createElement('canvas'); this.ref.width = this.W; this.ref.height = this.H;
    this.buildRef(); this.redraw();
    this.layout();
  }

  layout() {
    const rx = 206;
    this.swatches = this.colors.map((c, i) => ({ id: 'sw' + i, x: rx + (i % 4) * 27, y: 88 + Math.floor(i / 4) * 17, w: 25, h: 15 }));
    const tools = [['fill', 'bucket'], ['brush', 'brush'], ['eraser', 'eraser'], ['undo', 'undo'], ['clear', 'trash'], ['size', 'sparkle']];
    this.toolBtns = tools.map(([id, ic], i) => ({ id, icon: ic, x: rx + i * 18, y: 141, w: 18, h: 18 }));
    this.doneBtn = { id: 'done', x: 8, y: 155, w: 92, h: 20, label: LT('done', 'Done'), icon: 'check' };
  }

  buildRef() {
    const g = this.ref.getContext('2d');
    for (let i = 0; i < this.region.length; i++) {
      const ch = this.region[i], x = i % this.W, y = Math.floor(i / this.W);
      g.fillStyle = ch === '.' ? '#3a2a4d' : (this.pic.targets[ch] !== undefined ? PAINT_COLORS[this.pic.targets[ch]] : '#e6e0ee');
      g.fillRect(x, y, 1, 1);
    }
  }

  redraw() {
    const g = this.cv.getContext('2d');
    for (let i = 0; i < this.region.length; i++) {
      const x = i % this.W, y = Math.floor(i / this.W);
      g.fillStyle = this.region[i] === '.' ? '#3a2a4d' : (this.paint[i] >= 0 ? PAINT_COLORS[this.paint[i]] : '#e6e0ee');
      g.fillRect(x, y, 1, 1);
    }
  }

  snapshot() { this.undo.push(this.paint.slice()); if (this.undo.length > 25) this.undo.shift(); }

  cellAt(px, py) {
    const x = Math.floor((px - this.PX) / this.S), y = Math.floor((py - this.PY) / this.S);
    return (x >= 0 && y >= 0 && x < this.W && y < this.H) ? { x, y } : null;
  }

  applyFill(c) {
    const ch = this.region[c.y * this.W + c.x]; if (ch === '.') return false;
    const val = this.tool === 'eraser' ? -1 : this.color;
    let changed = false;
    for (let i = 0; i < this.region.length; i++) if (this.region[i] === ch && this.paint[i] !== val) { this.paint[i] = val; changed = true; }
    return changed;
  }

  stamp(c) {
    const val = this.tool === 'eraser' ? -1 : this.color, r = this.size - 1;
    let changed = false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > r + (r > 1 ? 1 : 0)) continue;
      const x = c.x + dx, y = c.y + dy; if (x < 0 || y < 0 || x >= this.W || y >= this.H) continue;
      const i = y * this.W + x; if (this.region[i] === '.') continue;
      if (this.paint[i] !== val) { this.paint[i] = val; changed = true; }
    }
    return changed;
  }

  act(c, pressedNow) {
    if (this.tool === 'fill' || (this.tool === 'eraser' && this.size === 0)) { if (pressedNow) { this.snapshot(); if (this.applyFill(c)) { this.redraw(); Sfx.play('ui'); this.burst(c); } } return; }
    if (pressedNow) { this.snapshot(); this.last = null; }
    // interpolate between the previous and current cell so fast strokes leave no gaps
    const from = this.last || c, n = Math.max(Math.abs(c.x - from.x), Math.abs(c.y - from.y), 1);
    let ch = false;
    for (let i = 0; i <= n; i++) ch = this.stamp({ x: Math.round(from.x + (c.x - from.x) * i / n), y: Math.round(from.y + (c.y - from.y) * i / n) }) || ch;
    this.last = c;
    if (ch) this.redraw();
  }

  burst(c) { Fx.burst(this.PX + c.x * this.S, this.PY + c.y * this.S, [PAINT_COLORS[this.color], '#fff4e6'], 6, 30); }

  // ---------- evaluation ----------
  metrics() {
    let painted = 0, correct = 0; const used = new Set(); const wrongRegions = new Set();
    for (let i = 0; i < this.region.length; i++) {
      const ch = this.region[i]; if (ch === '.') continue;
      if (this.paint[i] >= 0) { painted++; used.add(this.paint[i]); }
      if (this.cfg.mode === 'free') { if (this.paint[i] >= 0) correct++; }
      else if (this.paint[i] === this.pic.targets[ch]) correct++;
      else wrongRegions.add(ch);
    }
    return { coverage: painted / this.total, accuracy: correct / this.total, colors: used.size, wrongRegions };
  }

  evaluate() {
    const m = this.metrics(), th = this.cfg.thresholds;
    const q = this.cfg.mode === 'free' ? m.coverage : m.accuracy;
    let stars = this.starsFor(q, th);
    if (this.cfg.mode === 'free' && stars === 3 && m.colors < (this.cfg.minColors || 3)) stars = 2;
    if ((this.opts.assist || this.attempts >= 2) && stars === 0 && q >= th[0] - 0.1) stars = 1;      // gentler on repeated attempts
    return { m, stars, q };
  }

  // ---------- update ----------
  update(dt) {
    super.update(dt);
    if (this.msgT > 0) this.msgT -= dt;
    if (this.wrong) { this.wrong.t -= dt; if (this.wrong.t <= 0) this.wrong = null; }
    const p = Input.pointer;
    const click = UIManager.click(this.swatches.concat(this.toolBtns, [this.doneBtn]));
    if (click) this.onButton(click);
    // pointer painting
    const c = this.cellAt(p.x, p.y);
    if (p.pressed && c && !click) { this.stroke = true; this.act(c, true); }
    else if (this.stroke && p.down && c && (this.tool === 'brush' || this.tool === 'eraser')) this.act(c, false);
    if (!p.down) { this.stroke = false; this.last = null; }
    this.keyboard(dt);
  }

  keyboard(dt) {
    for (let i = 1; i <= this.colors.length && i <= 9; i++) if (Input.key('Digit' + i)) this.color = i - 1;
    if (Input.key('KeyT')) this.onButton(this.tool === 'fill' ? 'brush' : 'fill');
    if (Input.key('KeyZ')) this.onButton('undo');
    const dir = [['ArrowLeft', -1, 0], ['ArrowRight', 1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1], ['KeyA', -1, 0], ['KeyD', 1, 0], ['KeyW', 0, -1], ['KeyS', 0, 1]];
    this.keyT -= dt;
    for (const [k, dx, dy] of dir) {
      if (Input.key(k) || (Input.held[k] && this.keyT <= 0)) {
        this.cur.x = Math.max(0, Math.min(this.W - 1, this.cur.x + dx)); this.cur.y = Math.max(0, Math.min(this.H - 1, this.cur.y + dy));
        this.keyT = Input.key(k) ? 0.28 : 0.05;
        if (Input.held['Space'] && (this.tool === 'brush' || this.tool === 'eraser')) this.act({ x: this.cur.x, y: this.cur.y }, false);
      }
    }
    if (Input.key('Space')) { this.stroke = false; this.act({ x: this.cur.x, y: this.cur.y }, true); }
  }

  onButton(id) {
    if (id.startsWith('sw')) { this.color = parseInt(id.slice(2), 10); if (this.tool === 'eraser') this.tool = 'fill'; Sfx.play('ui'); return; }
    if (id === 'fill' || id === 'brush' || id === 'eraser') { this.tool = id; Sfx.play('ui'); }
    else if (id === 'size') { this.size = this.size % 3 + 1; Sfx.play('ui'); }
    else if (id === 'undo') { if (this.undo.length) { this.paint = this.undo.pop(); this.redraw(); Sfx.play('ui'); } }
    else if (id === 'clear') { this.snapshot(); this.paint.fill(-1); this.redraw(); Sfx.play('land'); }
    else if (id === 'done') this.submit();
  }

  submit() {
    const { m, stars, q } = this.evaluate();
    this.attempts++;
    if (stars < 1) {
      this.msg = this.cfg.mode === 'free' ? Math.round(m.coverage * 100) + '% / ' + Math.round(this.cfg.thresholds[0] * 100) + '%' : LT('accuracy', 'Accuracy') + ' ' + Math.round(m.accuracy * 100) + '%';
      this.msgT = 2.5; Sfx.play('land');
      if (this.cfg.mode !== 'free') this.wrong = { regions: m.wrongRegions, t: 2.5 };     // gentle hint: blink the wrong regions
      return;
    }
    const base = this.cfg.gain || 10;
    const score = this.cfg.mode === 'free' ? Math.round(m.coverage * 700 + Math.min(m.colors, 6) * 50) : Math.round(m.accuracy * 1000);
    this.finish({ score, stars, stats: { creativity: base + 2 * stars + (this.cfg.mode === 'free' ? Math.min(m.colors, 6) : 0) },
      detail: this.cfg.mode === 'free' ? m.colors + ' colors' : LT('accuracy', 'Accuracy') + ' ' + Math.round(m.accuracy * 100) + '%' });
  }

  // ---------- render ----------
  render(ctx) {
    ctx.fillStyle = '#f7ecd9'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.fillStyle = '#efe0c4'; for (let y = 0; y < CONFIG.HEIGHT; y += 8) ctx.fillRect(0, y, CONFIG.WIDTH, 1);
    Text.draw(ctx, (this.opts.title || (MinigameManager.levelName ? MinigameManager.levelName(this.level) : '')), 8, 6, { color: UIManager.C.ink });
    UI.panel(ctx, this.PX - 3, this.PY - 3, this.W * this.S + 6, this.H * this.S + 6, '#fff');
    ctx.drawImage(this.cv, 0, 0, this.W, this.H, this.PX, this.PY, this.W * this.S, this.H * this.S);
    // blinking hint for wrong regions
    if (this.wrong && Math.floor(this.t * 5) % 2 === 0) {
      ctx.fillStyle = 'rgba(240,100,120,0.55)';
      for (let i = 0; i < this.region.length; i++) if (this.wrong.regions.has(this.region[i])) ctx.fillRect(this.PX + (i % this.W) * this.S, this.PY + Math.floor(i / this.W) * this.S, this.S, this.S);
    }
    // brush cursor
    const pc = this.cellAt(Input.pointer.x, Input.pointer.y) || this.cur;
    const r = (this.tool === 'fill') ? 0 : this.size - 1;
    ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 1;
    ctx.strokeRect(this.PX + (pc.x - r) * this.S + 0.5, this.PY + (pc.y - r) * this.S + 0.5, (2 * r + 1) * this.S - 1, (2 * r + 1) * this.S - 1);
    // right column
    const m = this.metrics();
    if (this.cfg.mode === 'free') {
      UI.panel(ctx, 204, 20, 108, 64);
      Text.draw(ctx, LT('progress', 'Progress'), 258, 25, { align: 'center', color: UIManager.C.soft });
      UIManager.bar(ctx, 212, 38, 92, 8, m.coverage, UIManager.C.mint);
      Text.draw(ctx, Math.round(m.coverage * 100) + '%', 258, 49, { align: 'center', color: UIManager.C.ink });
      Text.draw(ctx, m.colors + ' ' + 'colors', 258, 62, { align: 'center', color: '#c44d7a' });
      for (let i = 0; i < Math.min(m.colors, 6); i++) { ctx.fillStyle = UIManager.C.gold; ctx.fillRect(220 + i * 13, 74, 9, 6); }
    } else {
      UI.panel(ctx, 204, 18, 108, 66);
      ctx.drawImage(this.ref, 0, 0, this.W, this.H, 210, 22, 96, 60);
      Text.draw(ctx, LT('reference', 'Picture'), 258, 8, { align: 'center', color: UIManager.C.soft });
    }
    this.swatches.forEach((b, i) => {
      UI.panel(ctx, b.x, b.y, b.w, b.h, PAINT_COLORS[i]);
      if (i === this.color) { ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 2; ctx.strokeRect(b.x - 0.5, b.y - 0.5, b.w + 1, b.h + 1); ctx.fillStyle = '#fff'; ctx.fillRect(b.x + 10, b.y + 5, 5, 5); }
    });
    this.toolBtns.forEach((b) => { b.selected = (b.id === this.tool); UIManager.drawButton(ctx, b); });
    // brush size dots on the size button
    const sb = this.toolBtns[5]; for (let i = 0; i < this.size; i++) { ctx.fillStyle = '#3a2a4d'; ctx.fillRect(sb.x + 3 + i * 4, sb.y + 14, 3, 2); }
    UIManager.drawButton(ctx, this.doneBtn);
    if (this.cfg.mode !== 'free') Text.draw(ctx, Math.round(m.accuracy * 100) + '%', 108, 161, { color: UIManager.C.ink });
    if (this.msgT > 0) { UI.panel(ctx, 70, 80, 120, 22, '#fff0f6'); Text.draw(ctx, this.msg, 130, 87, { align: 'center', color: '#c44d7a' }); }
    Fx.draw(ctx, 0, 0);
  }
}
MinigameManager.register('artist', PaintingMinigame);
