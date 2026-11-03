// ============================================================
// ui.js - Cozy UI: panels, HUD, dialogue box, and all full-screen
// pages (title, how-to, chapter card, completion, memory lane,
// birthday ending, letter). Pure drawing: the logic is in main.js.
// ============================================================
const UI = {
  C: { ink: '#3a2a4d', cream: '#fff4e6', pink: '#ff8cb4', gold: '#ffd65a', mint: '#8fd3a8', sky: '#96d0ff', lav: '#c8aaff', soft: '#8a7a9d' },

  panel(ctx, x, y, w, h, fill, border) {
    fill = fill || this.C.cream; border = border || this.C.ink;
    ctx.fillStyle = border;
    ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 1, w - 4, h - 2); ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';       // little highlight on top
    ctx.fillRect(x + 3, y + 2, w - 6, 1);
  },

  icon(ctx, type, x, y, t) {
    const img = Assets.get('items');
    if (!img) return;
    const row = { star: 0, heart: 1, plane: 2 }[type];
    ctx.drawImage(img, (Math.floor((t || 0) * 6) % 4) * 16, row * 16, 16, 16, Math.round(x), Math.round(y), 16, 16);
  },

  blink(t) { return Math.floor(t * 2) % 2 === 0; },

  prompt(ctx, str, y, t) {
    if (this.blink(t)) Text.draw(ctx, str, CONFIG.WIDTH / 2, y, { align: 'center', color: this.C.ink });
  },

  // ---------- HUD ----------
  hud(ctx, game) {
    const lv = game.level, c = game.counts, t = game.time;
    this.panel(ctx, 3, 3, 138, 18);
    ['star', 'heart', 'plane'].forEach((k, i) => {
      const x = 6 + i * 45;
      this.icon(ctx, k, x - 1, 4, t);
      Text.draw(ctx, c[k] + '/' + lv.totals[k], x + 17, 8, { color: this.C.ink });
    });
    const label = 'Tuổi ' + game.age;
    const w = Text.width(label) + 14;
    this.panel(ctx, CONFIG.WIDTH - w - 3, 3, w, 18, '#fff0f6');
    Text.draw(ctx, label, CONFIG.WIDTH - w / 2 - 3, 8, { align: 'center', color: '#c44d7a' });
    // progress bar along the bottom of the age badge
    const prog = Math.min(1, game.player.x / lv.widthPx);
    ctx.fillStyle = this.C.ink; ctx.fillRect(CONFIG.WIDTH - w - 3, 22, w, 3);
    ctx.fillStyle = this.C.pink; ctx.fillRect(CONFIG.WIDTH - w - 2, 23, Math.round((w - 2) * prog), 1);
  },

  toast(ctx, game) {
    const tt = game.toast;
    if (!tt) return;
    const lines = tt.text.split('\n');
    const w = Math.max(...lines.map((l) => Text.width(l))) + 16, h = lines.length * 11 + 8;
    const a = Math.min(1, tt.t * 4, (tt.life - tt.t) * 4);
    ctx.globalAlpha = Math.max(0, a);
    const y = 28 + (1 - Math.min(1, tt.t * 6)) * -6;
    this.panel(ctx, Math.round(CONFIG.WIDTH / 2 - w / 2), Math.round(y), w, h);
    Text.draw(ctx, tt.text, CONFIG.WIDTH / 2, Math.round(y) + 5, { align: 'center', color: this.C.ink });
    ctx.globalAlpha = 1;
  },

  // ---------- dialogue (blocking) ----------
  dialogue(ctx, d, t) {
    const x = 14, y = 116, w = 292, h = 58;
    this.panel(ctx, x, y, w, h);
    const line = d.lines[d.idx];
    Text.draw(ctx, line, x + 12, y + 18, { chars: Math.floor(d.t * 38), color: this.C.ink, lineH: 12 });
    if (d.t * 38 >= line.length && this.blink(t * 1.5)) {
      ctx.fillStyle = this.C.pink;
      ctx.fillRect(x + w - 16, y + h - 14, 7, 1); ctx.fillRect(x + w - 15, y + h - 13, 5, 1);
      ctx.fillRect(x + w - 14, y + h - 12, 3, 1); ctx.fillRect(x + w - 13, y + h - 11, 1, 1);
    }
  },

  // ---------- fade ----------
  fade(ctx, a) {
    if (a <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = this.C.ink;
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.globalAlpha = 1;
  },

  dim(ctx, a) {
    ctx.fillStyle = 'rgba(58,42,77,' + a + ')';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  },

  // ---------- title ----------
  title(ctx, game) {
    const t = game.time;
    Renderer.drawBackground(ctx, t * 12, t);
    const tiles = Assets.get('tiles'), T = 16;
    const off = -Math.floor((t * 24) % T);
    for (let x = off; x < CONFIG.WIDTH; x += T) {
      ctx.drawImage(tiles, 0, 0, 16, 16, x, 148, 16, 16);
      ctx.drawImage(tiles, 16, 0, 16, 16, x, 164, 16, 16);
    }
    // decorations drifting by
    const dec = Assets.get('decor');
    [[60, 0], [120, 3], [200, 1], [260, 2], [330, 4]].forEach(([bx, f], i) => {
      const x = ((bx - t * 24) % 400 + 400) % 400 - 40;
      ctx.drawImage(dec, f * 32, 0, 32, 32, Math.round(x), 116, 32, 32);
    });
    Renderer.drawPlayer(ctx, game.titleP, game.animator, 0, 0);
    // title text
    Text.draw(ctx, 'CMSN CON', 160, 20, { align: 'center', scale: 2, color: this.C.ink, shadow: this.C.cream });
    Text.draw(ctx, 'THƯ BÉO PHÌ', 160, 42, { align: 'center', scale: 2, color: '#e0508a', shadow: this.C.cream });
    Text.draw(ctx, 'Một trò chơi nhỏ cho sinh nhật tuổi 19 của bạn', 160, 76, { align: 'center', color: this.C.ink, shadow: this.C.cream });
    this.prompt(ctx, 'Nhấn ENTER, SPACE hoặc chạm để bắt đầu', 98, t);
    if (game.save.done) Text.draw(ctx, 'B: xem thẳng màn kết sinh nhật', 160, 174, { align: 'center', color: this.C.cream, shadow: this.C.ink });
  },

  select(ctx, game, items) {
    Renderer.drawBackground(ctx, game.time * 6, game.time);
    this.dim(ctx, 0.3);
    this.panel(ctx, 40, 14, 240, 150);
    Text.draw(ctx, 'Chọn chương', 160, 26, { align: 'center', scale: 2, color: this.C.ink });
    items.forEach((it, i) => {
      const sel = i === game.selIndex;
      this.panel(ctx, 60, 56 + i * 22, 200, 19, !it.enabled ? '#d9d2e3' : (sel ? '#ffd9e8' : '#fff'));
      Text.draw(ctx, it.label, 72, 61 + i * 22, { color: it.enabled ? this.C.ink : this.C.soft });
      if (!it.enabled && Assets.get('icons')) UIManager.icon(ctx, 'lock', 238, 55 + i * 22, 1, 0.7);
    });
    Text.draw(ctx, 'Lên / Xuống + ENTER, hoặc chạm', 160, 150, { align: 'center', color: this.C.soft });
  },

  howto(ctx, game) {
    Renderer.drawBackground(ctx, game.time * 6, game.time);
    this.dim(ctx, 0.25);
    this.panel(ctx, 30, 14, 260, 152);
    Text.draw(ctx, 'Cách chơi', 160, 34, { align: 'center', scale: 2, color: this.C.ink });
    const rows = [
      ['A / D  or  \u2190 \u2192', 'bò'], ['SPACE / W / \u2191', 'nhảy'],
      ['R', 'về điểm lưu'], ['M', 'bật / tắt nhạc']
    ];
    rows.forEach(([k, v], i) => {
      Text.draw(ctx, k.replace('\u2190 \u2192', '< >').replace('\u2191', 'UP'), 48, 62 + i * 13, { color: '#c44d7a' });
      Text.draw(ctx, v, 160, 62 + i * 13, { color: this.C.ink });
    });
    Text.draw(ctx, 'Hãy nhặt những thứ bạn gặp trên đường:', 160, 122, { align: 'center', color: this.C.ink });
    ['star', 'heart', 'plane'].forEach((k, i) => this.icon(ctx, k, 128 + i * 24, 128, game.time));
    this.prompt(ctx, 'Nhấn ENTER hoặc chạm', 156, game.time);
  },

  chapterCard(ctx, game, ch) {
    Renderer.drawBackground(ctx, game.time * 6, game.time);
    this.dim(ctx, 0.35);
    const a = Math.min(1, game.stateT * 2);
    ctx.globalAlpha = a;
    Text.draw(ctx, 'CHƯƠNG ' + ch.id, 160, 62, { align: 'center', color: this.C.gold, shadow: this.C.ink });
    Text.draw(ctx, ch.title, 160, 80, { align: 'center', scale: 2, color: this.C.cream, shadow: this.C.ink });
    Text.draw(ctx, ch.ages, 160, 108, { align: 'center', color: this.C.pink, shadow: this.C.ink });
    ctx.globalAlpha = 1;
  },

  complete(ctx, game, ch) {
    Renderer.drawBackground(ctx, game.time * 8, game.time);
    this.dim(ctx, 0.2);
    this.panel(ctx, 40, 12, 240, 156);
    Text.draw(ctx, 'Hoàn thành chương ' + ch.id + '!', 160, 24, { align: 'center', scale: 2, color: this.C.ink });
    Text.draw(ctx, ch.title, 160, 48, { align: 'center', color: '#c44d7a' });
    const kinds = [['star', 'Sao của sự tò mò'], ['heart', 'Tim của lòng tốt'], ['plane', 'Máy bay của trí tưởng tượng']];
    kinds.forEach(([k, label], i) => {
      const y = 62 + i * 18;
      this.icon(ctx, k, 64, y - 4, game.time);
      Text.draw(ctx, label, 86, y + 1, { color: this.C.ink });
      Text.draw(ctx, game.counts[k] + '/' + game.level.totals[k], 258, y + 1, { align: 'right', color: this.C.ink });
    });
    Text.draw(ctx, ch.complete.join('\n'), 160, 128, { align: 'center', color: this.C.soft });
    this.prompt(ctx, 'Nhấn ENTER để tiếp tục', 158, game.time);
  },

  memory(ctx, game, ch) {
    // dusk gradient that slowly warms up with each chapter
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    const tints = [['#cfd9ff', '#ffe9f0'], ['#d9d0ff', '#ffe3ea'], ['#e6c8ff', '#ffe0d6'], ['#f3c4e0', '#ffe8c8'], ['#ffc9d4', '#fff0c8']];
    const p = tints[Math.min(tints.length - 1, game.memIndex)];
    g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    for (let i = 0; i < 30; i++) {                       // twinkling dots
      const x = (i * 97) % CONFIG.WIDTH, y = (i * 53) % 120;
      if (Math.floor(game.time * 2 + i) % 3) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x, y, 1, 1); }
    }
    const a = Math.min(1, game.stateT * 2.5);
    ctx.globalAlpha = a;
    this.panel(ctx, 24, 18, 272, 136);
    Text.draw(ctx, 'Chương ' + ch.id + ' - ' + ch.ages, 160, 38, { align: 'center', color: '#c44d7a' });
    Text.draw(ctx, ch.title, 160, 58, { align: 'center', scale: 2, color: this.C.ink });
    Text.draw(ctx, ch.card, 160, 80, { align: 'center', color: this.C.ink, lineH: 12 });
    if (ch.quote) Text.draw(ctx, '"' + ch.quote + '"', 160, 106, { align: 'center', color: this.C.soft, lineH: 11 });
    if (typeof WIP_LABEL !== 'undefined' && WIP_LABEL) Text.draw(ctx, WIP_LABEL, 160, 144, { align: 'center', color: this.C.soft });
    ctx.globalAlpha = 1;
    this.prompt(ctx, 'Nhấn ENTER', 160, game.time);
  },

  // ---------- birthday ending ----------
  ending(ctx, game) {
    const t = game.stateT;
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT);
    g.addColorStop(0, '#2b2250'); g.addColorStop(0.6, '#7a4f8f'); g.addColorStop(1, '#f2a7b8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    for (let i = 0; i < 50; i++) {
      const x = (i * 71) % CONFIG.WIDTH, y = (i * 37) % 110;
      if (Math.floor(game.time * 3 + i * 0.7) % 4) { ctx.fillStyle = i % 5 ? '#fff4e6' : '#ffd65a'; ctx.fillRect(x, y, 1, 1); }
    }
    Fx.draw(ctx, 0, 0);
    const fadeIn = (at) => Math.max(0, Math.min(1, (t - at) * 1.5));
    ctx.globalAlpha = fadeIn(0.5);
    Text.draw(ctx, ENDING.line1, 160, 40, { align: 'center', color: this.C.cream, shadow: this.C.ink });
    ctx.globalAlpha = fadeIn(3.2);
    Text.draw(ctx, ENDING.line2, 160, 62, { align: 'center', color: '#e8d8ff', shadow: this.C.ink });
    ctx.globalAlpha = fadeIn(5.5);
    Text.draw(ctx, ENDING.line3, 160, 84, { align: 'center', scale: 2, color: this.C.gold, shadow: this.C.ink });
    ctx.globalAlpha = 1;
    this.cake(ctx, 144, 120, game.time);
    if (t > 7.5) {
      const hasLetter = typeof LETTER_PAGES !== 'undefined' && LETTER_PAGES.length;
      if (this.blink(game.time)) Text.draw(ctx, (hasLetter ? 'L: đọc thư của mình    ' : '') + 'R: chơi lại', 160, 164, { align: 'center', color: this.C.cream, shadow: this.C.ink });
    }
  },

  cake(ctx, x, y, t) {
    const o = this.C.ink;
    ctx.fillStyle = o; ctx.fillRect(x - 1, y + 20, 34, 12); ctx.fillRect(x + 3, y + 8, 26, 14);
    ctx.fillStyle = '#ffc9d9'; ctx.fillRect(x, y + 21, 32, 10);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 21, 32, 3);
    ctx.fillStyle = '#ff8cb4'; ctx.fillRect(x + 4, y + 9, 24, 12);
    ctx.fillStyle = '#fff4e6'; ctx.fillRect(x + 4, y + 9, 24, 3);
    [[6, 15], [13, 17], [20, 15], [25, 17]].forEach(([dx, dy]) => { ctx.fillStyle = '#ffd65a'; ctx.fillRect(x + dx, y + dy, 2, 2); });
    ctx.fillStyle = '#96d0ff'; ctx.fillRect(x + 15, y + 2, 2, 7);
    ctx.fillStyle = Math.floor(t * 6) % 2 ? '#ffd65a' : '#ffae5a';
    ctx.fillRect(x + 15, y - 2 + (Math.floor(t * 6) % 2), 2, 3);
    ctx.fillStyle = '#fff4e6'; ctx.fillRect(x + 15, y - 1, 1, 1);
  },

  letter(ctx, game) {
    ctx.fillStyle = '#3a2a4d'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    this.panel(ctx, 20, 10, 280, 160, '#fffaf0');
    const page = LETTER_PAGES[game.letterPage];
    Text.draw(ctx, page, 38, 36, { color: this.C.ink, lineH: 13, chars: Math.floor(game.stateT * 60) });
    if (typeof LETTER_FROM !== 'undefined') Text.draw(ctx, LETTER_FROM, 282, 132, { align: 'right', color: '#c44d7a' });
    Text.draw(ctx, (game.letterPage + 1) + '/' + LETTER_PAGES.length, 38, 150, { color: this.C.soft });
    if (this.blink(game.time)) Text.draw(ctx, game.letterPage < LETTER_PAGES.length - 1 ? 'ENTER: tiếp' : 'ENTER: quay lại', 282, 150, { align: 'right', color: this.C.soft });
  }
};
