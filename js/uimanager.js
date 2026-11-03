// ============================================================
// uimanager.js - UIManager: shared widgets for every Chapter 2 screen
// (buttons, icons, stars, bars, badge pop-ups, pointer helpers).
// It builds on UI.panel / Text from ui.js / text.js - no second UI system.
// Buttons are plain objects: { id, x, y, w, h, label, icon, enabled, selected }.
// ============================================================
const UIManager = {
  toasts: [],
  C: { ink: '#3a2a4d', cream: '#fff4e6', pink: '#ff8cb4', gold: '#ffd65a', mint: '#8fd3a8', sky: '#96d0ff', lav: '#c8aaff', soft: '#8a7a9d', bad: '#f06478' },

  // ----- images -----
  icon(ctx, name, x, y, scale, alpha) {
    const img = Assets.get('icons'); if (!img) return;
    const i = ICON_INDEX[name]; if (i === undefined) return;
    const s = scale || 1;
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(img, i * 16, 0, 16, 16, Math.round(x), Math.round(y), 16 * s, 16 * s);
    ctx.globalAlpha = 1;
  },
  badge(ctx, id, x, y, scale, alpha) {
    const img = Assets.get('badges'); if (!img) return;
    const i = BADGE_ICON_INDEX[id]; if (i === undefined) return;
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(img, i * 16, 0, 16, 16, Math.round(x), Math.round(y), 16 * (scale || 1), 16 * (scale || 1));
    ctx.globalAlpha = 1;
  },
  vocab(ctx, name, x, y, scale) {
    const img = Assets.get('vocab'); if (!img) return;
    const i = VOCAB_ICON_INDEX[name]; if (i === undefined) return;
    ctx.drawImage(img, i * 16, 0, 16, 16, Math.round(x), Math.round(y), 16 * (scale || 1), 16 * (scale || 1));
  },
  star(ctx, x, y, size, filled) {
    const img = Assets.get('items'); if (!img) return;
    ctx.globalAlpha = filled ? 1 : 0.25;
    ctx.drawImage(img, 0, 0, 16, 16, Math.round(x), Math.round(y), size, size);
    ctx.globalAlpha = 1;
  },
  stars(ctx, cx, y, n, max, size) {
    max = max || 3; size = size || 16;
    const x0 = cx - (max * size + (max - 1) * 2) / 2;
    for (let i = 0; i < max; i++) this.star(ctx, x0 + i * (size + 2), y, size, i < n);
  },

  // ----- shapes -----
  bar(ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = this.C.ink; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e9dff0'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = color || this.C.pink; ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * Math.max(0, Math.min(1, frac))), h - 2);
  },
  keycap(ctx, label, x, y) {
    const w = Text.width(label) + 6;
    UI.panel(ctx, x, y, w, 12, '#fff', this.C.ink);
    Text.draw(ctx, label, x + 3, y + 2, { color: this.C.ink });
    return w;
  },
  wrap(str, maxW) {
    const out = []; let line = '';
    for (const word of String(str).split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (Text.width(t) > maxW && line) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    return out;
  },

  // ----- buttons -----
  hover(b) { return Input.inRect(b.x, b.y, b.w, b.h); },
  drawButton(ctx, b) {
    const en = b.enabled !== false, hov = en && this.hover(b);
    const press = hov && Input.pointer.down ? 1 : 0;
    const fill = !en ? '#d9d2e3' : (b.selected ? '#ffd9e8' : (hov ? '#ffffff' : this.C.cream));
    UI.panel(ctx, b.x, b.y + press, b.w, b.h, fill);
    let tx = b.x + 4;
    const hasIcon = b.icon && b.h >= 16;
    if (hasIcon) { this.icon(ctx, b.icon, b.x + 3, b.y + Math.floor((b.h - 16) / 2) + press, 1, en ? 1 : 0.5); tx = b.x + 21; }
    if (b.label) {
      const cx = hasIcon ? b.x + 21 + (b.w - 21) / 2 : b.x + b.w / 2;
      Text.draw(ctx, b.label, Math.round(cx), b.y + Math.floor((b.h - 8) / 2) + press, { align: 'center', color: en ? this.C.ink : this.C.soft });
    }
  },
  drawButtons(ctx, list) { list.forEach((b) => this.drawButton(ctx, b)); },
  // returns the id of the clicked (pressed this step) enabled button, if any
  click(list) {
    if (!Input.pointer.pressed) return null;
    for (const b of list) if (b.enabled !== false && this.hover(b)) return b.id;
    return null;
  },

  // ----- badge pop-ups -----
  notifyBadge(id) { this.toasts.push({ id, t: 0, life: 3.4 }); },
  update(dt) {
    if (this.toasts.length) { this.toasts[0].t += dt; if (this.toasts[0].t > this.toasts[0].life) this.toasts.shift(); }
  },
  drawToasts(ctx) {
    const t = this.toasts[0]; if (!t) return;
    const a = Math.min(1, t.t * 4, (t.life - t.t) * 4);
    const name = AchievementManager.name(t.id);
    const w = Math.max(120, Text.width(name) + 40);
    const x = Math.round(CONFIG.WIDTH / 2 - w / 2), y = Math.round(4 - (1 - Math.min(1, t.t * 5)) * 24);
    ctx.globalAlpha = Math.max(0, a);
    UI.panel(ctx, x, y, w, 26, '#fff0c8');
    this.badge(ctx, t.id, x + 5, y + 5, 1);
    Text.draw(ctx, LT('newBadge', 'New badge!'), x + 25, y + 3, { color: '#c44d7a' });
    Text.draw(ctx, name, x + 25, y + 14, { color: this.C.ink });
    ctx.globalAlpha = 1;
  },

  // ----- stat bars (used in hub HUD + result screen) -----
  statRow(ctx, key, x, y, w, value) {
    const colors = { creativity: this.C.pink, language: this.C.sky, friendship: this.C.mint };
    const icons = { creativity: 'brush', language: 'book', friendship: 'heart' };
    this.icon(ctx, icons[key], x, y - 3, 1);
    this.bar(ctx, x + 18, y + 1, w - 18, 7, value / PROGRESSION.statCap, colors[key]);
  }
};
