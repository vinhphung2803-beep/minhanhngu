// ============================================================
// renderer.js - World drawing (background, tiles, items, player).
// Menus/HUD/dialogue live in ui.js. Everything is drawn at the
// logical 320x180 size with image smoothing OFF.
// ============================================================
const Renderer = {
  COLORS: { sky: '#CDE8F6', grid: 'rgba(58, 51, 81, 0.18)', hitbox: '#f2688c' },

  render(ctx, game) {
    ctx.imageSmoothingEnabled = false;
    const cx = Math.round(game.camera.x);
    const cy = Math.round(game.camera.y);
    this.drawBackground(ctx, cx, game.time);
    this.drawWorld(ctx, game, cx, cy);
    if (game.debug) this.drawDebug(ctx, game, cx, cy);
  },

  drawWorld(ctx, game, cx, cy) {
    const level = game.level;
    this.drawDecor(ctx, level, cx, cy);
    this.drawLevel(ctx, level, cx, cy);
    this.drawCheckpoints(ctx, level, cx, cy, game.time);
    this.drawExit(ctx, level, cx, cy, game.time);
    this.drawCollectibles(ctx, level, cx, cy, game.time);
    this.drawPlayer(ctx, game.player, game.animator, cx, cy);
    Fx.draw(ctx, cx, cy);
  },

  // ---------- sky, clouds, parallax hills ----------
  drawBackground(ctx, cx, t) {
    const bands = ['#bfe3f5', '#c9e8f6', '#d6ecf5', '#e6f0f0', '#f6efe6', '#ffeedd'];
    const bh = Math.ceil(CONFIG.HEIGHT / bands.length);
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, CONFIG.WIDTH, bh); });

    const cloud = Assets.get('cloud');
    if (cloud) {
      [[20, 18], [140, 34], [250, 12], [330, 40]].forEach(([bx, by], i) => {
        const x = ((bx - t * (3 + i) - cx * 0.08) % 400 + 400) % 400 - 40;
        ctx.drawImage(cloud, Math.round(x), by);
      });
    }
    this.tileX(ctx, Assets.get('hillsFar'), cx * 0.15, 56);
    this.tileX(ctx, Assets.get('hillsNear'), cx * 0.35, 62);
  },

  tileX(ctx, img, scroll, y) {
    if (!img) return;
    const w = img.width;
    let x = -Math.round(scroll % w);
    if (x > 0) x -= w;
    for (; x < CONFIG.WIDTH; x += w) ctx.drawImage(img, x, y);
  },

  // ---------- tiles ----------
  drawLevel(ctx, level, cx, cy) {
    const T = CONFIG.TILE, tiles = Assets.get('tiles');
    const c0 = Math.max(0, Math.floor(cx / T));
    const c1 = Math.min(level.colCount - 1, Math.floor((cx + CONFIG.WIDTH) / T));
    const r0 = Math.max(0, Math.floor(cy / T));
    const r1 = Math.min(level.rowCount - 1, Math.floor((cy + CONFIG.HEIGHT) / T));
    for (let ty = r0; ty <= r1; ty++) {
      for (let tx = c0; tx <= c1; tx++) {
        const k = level.kind[ty][tx];
        if (!k) continue;
        let idx = 1;                                   // dirt
        if (k === '#') idx = level.isSolid(tx, ty - 1) ? 1 : 0;  // grass on top
        else if (k === 'B') idx = 2;
        else if (k === 'W') idx = 3;
        const sx = tx * T - cx, sy = ty * T - cy;
        if (tiles) ctx.drawImage(tiles, idx * T, 0, T, T, sx, sy, T, T);
        else { ctx.fillStyle = '#7d7d8c'; ctx.fillRect(sx, sy, T, T); }
      }
    }
  },

  drawDecor(ctx, level, cx, cy) {
    const img = Assets.get('decor');
    if (!img) return;
    for (const d of level.decor) {
      const sx = d.x - cx;
      if (sx < -32 || sx > CONFIG.WIDTH) continue;
      ctx.drawImage(img, d.frame * 32, 0, 32, 32, Math.round(sx), Math.round(d.y - cy), 32, 32);
    }
  },

  // gates + plates (Chapter 2 social levels)
  drawPuzzle(ctx, level, cx, cy) {
    const img = Assets.get('props'); if (!img) return;
    const T = CONFIG.TILE;
    for (const g of Object.values(level.gates)) {
      const base = g.id === 'X' ? 0 : 3;
      g.tiles.forEach((t) => {
        const sx = t.tx * T - cx, sy = t.ty * T - cy;
        if (!g.open) ctx.drawImage(img, base * 16, 0, 16, 16, sx, sy, 16, 16);
        else { ctx.globalAlpha = 0.28; ctx.drawImage(img, base * 16, 0, 16, 16, sx, sy, 16, 16); ctx.globalAlpha = 1; }
      });
    }
    for (const p of Object.values(level.plates)) {
      const base = p.id === 'x' ? 0 : 3, f = base + (p.pressed ? 2 : 1);
      for (let i = 0; i < p.w / T; i++) ctx.drawImage(img, f * 16, 0, 16, 16, p.x + i * T - cx, p.y - cy, 16, 16);
    }
  },

  drawCheckpoints(ctx, level, cx, cy, t) {
    const img = Assets.get('decor');
    if (!img) return;
    for (const c of level.checkpoints) {
      const sway = c.active ? Math.round(Math.sin(t * 5) * 1) : 0;
      ctx.globalAlpha = c.active ? 1 : 0.55;
      ctx.drawImage(img, 6 * 32, 0, 32, 32, Math.round(c.x - 8 - cx + sway), Math.round(c.y + 16 - 32 - cy), 32, 32);
      ctx.globalAlpha = 1;
    }
  },

  drawExit(ctx, level, cx, cy, t) {
    if (!level.exit) return;
    const arch = Assets.get('arch');
    const e = level.exit;
    const x = Math.round(e.x - cx), y = Math.round(e.y + 16 - cy);
    if (arch) ctx.drawImage(arch, x, y);
    const sp = Assets.get('sparkle');
    if (sp) {
      const f = Math.floor(t * 6) % 4;
      ctx.drawImage(sp, f * 8, 0, 8, 8, x + 4, y - 6 + Math.round(Math.sin(t * 3) * 2), 8, 8);
      ctx.drawImage(sp, ((f + 2) % 4) * 8, 0, 8, 8, x + 20, y - 2 + Math.round(Math.cos(t * 3) * 2), 8, 8);
    }
  },

  // ---------- collectibles ----------
  drawCollectibles(ctx, level, cx, cy, t) {
    const img = Assets.get('items');
    if (!img) return;
    const row = { star: 0, heart: 1, plane: 2 };
    for (const c of level.collectibles) {
      const sx = c.x - cx;
      if (sx < -16 || sx > CONFIG.WIDTH + 16) continue;
      const frame = Math.floor((t + c.phase) * 6) % 4;
      if (!c.taken) {
        const bob = Math.round(Math.sin(t * 3 + c.phase) * 2);
        ctx.drawImage(img, frame * 16, row[c.type] * 16, 16, 16, Math.round(sx - 8), Math.round(c.y - cy - 8 + bob), 16, 16);
      } else if (c.t < 0.4) {                       // pop-up animation: rise + fade
        ctx.globalAlpha = 1 - c.t / 0.4;
        ctx.drawImage(img, frame * 16, row[c.type] * 16, 16, 16, Math.round(sx - 8), Math.round(c.y - cy - 8 - c.t * 40), 16, 16);
        ctx.globalAlpha = 1;
      }
    }
  },

  // ---------- player ----------
  drawPlayer(ctx, p, anim, cx, cy) {
    const sheet = Assets.get(anim.sheetKey || 'baby');
    // Sprite is 32x32; the 16x16 hitbox stays separate. Feet align to the hitbox bottom.
    const drawX = Math.round(p.x + p.w / 2 - 16) - cx;
    const drawY = Math.round(p.y + p.h - 32) - cy;
    if (!sheet) {                                  // fallback while loading
      ctx.fillStyle = '#ffb84d';
      ctx.fillRect(Math.round(p.x) - cx, Math.round(p.y) - cy, p.w, p.h);
      return;
    }
    const f = anim.frameIndex();
    // soft shadow
    ctx.fillStyle = 'rgba(58,42,77,0.18)';
    ctx.fillRect(drawX + 8, Math.round(p.y + p.h) - cy, 16, 1);
    if (p.facing === -1) {
      ctx.save();
      ctx.translate(drawX + 32, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, f * 32, 0, 32, 32, 0, drawY, 32, 32);
      ctx.restore();
    } else {
      ctx.drawImage(sheet, f * 32, 0, 32, 32, drawX, drawY, 32, 32);
    }
  },

  drawDebug(ctx, game, cx, cy) {
    const T = CONFIG.TILE, p = game.player;
    ctx.fillStyle = this.COLORS.grid;
    for (let x = -(cx % T); x < CONFIG.WIDTH; x += T) ctx.fillRect(x, 0, 1, CONFIG.HEIGHT);
    for (let y = -(cy % T); y < CONFIG.HEIGHT; y += T) ctx.fillRect(0, y, CONFIG.WIDTH, 1);
    ctx.strokeStyle = this.COLORS.hitbox;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(p.x) - cx + 0.5, Math.round(p.y) - cy + 0.5, p.w - 1, p.h - 1);
    const lines = ['FPS ' + game.fps, 'state ' + p.state + (p.onGround ? ' (ground)' : ''),
      'anim ' + game.animator.clip + ' f' + game.animator.frameIndex(),
      'x ' + p.x.toFixed(1) + ' y ' + p.y.toFixed(1), 'vx ' + p.vx.toFixed(0) + ' vy ' + p.vy.toFixed(0)];
    lines.forEach((l, i) => Text.draw(ctx, l, 4, 34 + i * 9, { color: '#3a2a4d', lineH: 9 }));
  }
};
