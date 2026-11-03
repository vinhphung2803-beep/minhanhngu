// ============================================================
// text.js - Pixel text drawing from the bitmap atlas (assets/ui/font.png).
// Text.draw(ctx, 'hello', x, y, {color, align, shadow})
// ============================================================
const Text = {
  map: null,
  _tint: {},

  init() {
    this.map = {};
    [...FONT_DATA.chars].forEach((ch, i) => { this.map[ch] = i; });
  },

  _atlas(color) {
    if (this._tint[color]) return this._tint[color];
    const src = Assets.get('font');
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    this._tint[color] = c;
    return c;
  },

  width(str, scale = 1) {
    let w = 0;
    for (const ch of str) w += (FONT_DATA.widths[this.map[ch]] ?? 5);
    return w * scale;
  },

  // Draws one line. Returns its width.
  line(ctx, str, x, y, color, scale = 1) {
    const atlas = this._atlas(color);
    const { cw, ch, cols } = FONT_DATA;
    let cx = Math.round(x);
    for (const c of str) {
      const i = this.map[c];
      if (i === undefined) { cx += 5 * scale; continue; }
      if (c !== ' ') ctx.drawImage(atlas, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch, cx, Math.round(y) - 3 * scale, cw * scale, ch * scale);
      cx += FONT_DATA.widths[i] * scale;
    }
    return cx - x;
  },

  // opts: color, align ('left'|'center'|'right'), shadow (color), lineH, chars (typewriter limit)
  draw(ctx, str, x, y, opts = {}) {
    const color = opts.color || '#3a2a4d';
    const sc = opts.scale || 1;
    const lineH = opts.lineH || 11 * sc;
    let remaining = opts.chars === undefined ? Infinity : opts.chars;
    str.split('\n').forEach((ln, i) => {
      const shown = remaining >= ln.length ? ln : ln.slice(0, Math.max(0, remaining));
      remaining -= ln.length + 1;
      if (!shown) return;
      const w = this.width(ln, sc);
      let lx = x;
      if (opts.align === 'center') lx = x - Math.floor(w / 2);
      else if (opts.align === 'right') lx = x - w;
      const ly = y + i * lineH;
      if (opts.shadow) this.line(ctx, shown, lx, ly + sc, opts.shadow, sc);
      this.line(ctx, shown, lx, ly, color, sc);
    });
  }
};
