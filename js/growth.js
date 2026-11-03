// ============================================================
// growth.js - CharacterGrowth: stages + the "evolution" cutscene.
//
//   CharacterGrowth.apply(player, animator, 'teen')   instant change (hitbox + sprite sheet)
//   CharacterGrowth.evolve(Game, 'teen', onDone)      cutscene, then control is returned
//
// Cutscene timeline (all time-based):
//   0.0-0.6  pause: world dims, character moves to the centre
//   0.6-3.6  white silhouette flickers between old and new form (faster and faster),
//            light rays + sparkles spiral in
//   3.6-4.1  white flash, the form is swapped under the flash
//   4.1-5.8  new form revealed with a ring burst; age label appears
//   5.8-6.4  fade out -> control returns
// Press ENTER during the silhouette phase to skip to the flash.
// ============================================================
const CharacterGrowth = {
  stages: GROWTH_STAGES,
  fx: null,
  _sil: {},

  get(id) { return this.stages.find((s) => s.id === id) || this.stages[0]; },
  index(id) { return Math.max(0, this.stages.findIndex((s) => s.id === id)); },
  next(id) { return this.stages[Math.min(this.stages.length - 1, this.index(id) + 1)].id; },
  age(id) { return this.get(id).age; },

  // Instantly switch the sprite sheet and hitbox while keeping the feet in place.
  apply(player, animator, id) {
    const st = this.get(id);
    const cx = player.x + player.w / 2, bottom = player.y + player.h, spawnBottom = player.spawnY + player.h;
    player.w = st.hitbox.w; player.h = st.hitbox.h;
    player.x = cx - player.w / 2; player.y = bottom - player.h;
    player.spawnY = spawnBottom - player.h;
    player.spawnX = player.spawnX + (0);                      // centre stays, spawn x is a left edge
    animator.setSheet(st.sheet, st.animSet);
    return st;
  },

  evolve(game, toId, onDone) {
    this.fx = { t: 0, from: game.stageId, to: toId, onDone, swapped: false, parts: [], prevState: game.state, skipped: false };
    Sfx.play('checkpoint');
    game.setState('evolve');
  },

  update(dt, game) {
    const f = this.fx; if (!f) return;
    f.t += dt;
    if (!f.skipped && f.t > 1.0 && f.t < 3.5 && (Input.key('Enter') || Input.key('Space') || Input.pointer.pressed)) { f.t = 3.5; f.skipped = true; }
    // particles
    if (f.t > 0.6 && f.t < 3.6 && Math.random() < 0.7) {
      const a = Math.random() * 6.283, r = 110 + Math.random() * 30;
      f.parts.push({ x: 160 + Math.cos(a) * r, y: 84 + Math.sin(a) * r * 0.6, vx: 0, vy: 0, age: 0, life: 1.1, mode: 'in', a, r, c: Math.random() < 0.5 ? '#fff4be' : '#c8e8ff' });
    }
    for (const p of f.parts) {
      p.age += dt;
      if (p.mode === 'in') { p.r *= (1 - dt * 1.8); p.a += dt * 2.5; p.x = 160 + Math.cos(p.a) * p.r; p.y = 84 + Math.sin(p.a) * p.r * 0.6; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
    }
    f.parts = f.parts.filter((p) => p.age < p.life);
    if (!f.swapped && f.t >= 3.7) {
      f.swapped = true;
      this.apply(game.player, game.animator, f.to);
      game.stageId = f.to;
      Sfx.play('win');
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * 6.283, s = 40 + Math.random() * 90;
        f.parts.push({ x: 160, y: 84, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, age: 0, life: 1.2 + Math.random() * 0.6, mode: 'out', c: ['#ffd65a', '#ff8cb4', '#96d0ff', '#fff4e6'][i % 4] });
      }
    }
    if (f.t >= 6.4) {
      const cb = f.onDone; this.fx = null;
      game.state = f.prevState; game.stateT = 0;
      if (cb) cb();
    }
  },

  // white silhouette of frame 0 of a sheet, cached
  silhouette(sheetKey) {
    if (this._sil[sheetKey]) return this._sil[sheetKey];
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(Assets.get(sheetKey), 0, 0, 32, 32, 0, 0, 32, 32);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, 32, 32);
    this._sil[sheetKey] = c; return c;
  },

  render(ctx, game) {
    const f = this.fx; if (!f) return;
    const t = f.t, W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const from = this.get(f.from), to = this.get(f.to);
    const dim = t < 0.6 ? t / 0.6 * 0.82 : (t > 5.8 ? Math.max(0, 0.82 * (1 - (t - 5.8) / 0.6)) : 0.82);
    ctx.fillStyle = 'rgba(29,21,48,' + dim.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    const cx = 160, cy = 84, S = 3;
    // rays
    if (t > 0.5 && t < 5.8) {
      const k = t < 3.6 ? Math.min(1, (t - 0.5)) : Math.max(0, 1 - (t - 4.0) / 1.5);
      ctx.fillStyle = 'rgba(255,244,214,' + (0.16 * k).toFixed(3) + ')';
      for (let i = 0; i < 14; i++) {
        const a = i * (Math.PI * 2 / 14) + t * 0.5, w = 0.1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - w) * 260, cy + Math.sin(a - w) * 260); ctx.lineTo(cx + Math.cos(a + w) * 260, cy + Math.sin(a + w) * 260); ctx.closePath(); ctx.fill();
      }
    }
    const feetY = cy + 16 * S + 6;
    const drawSprite = (img, sx, sy, sw, sh, scale) => ctx.drawImage(img, sx, sy, sw, sh, Math.round(cx - sw * scale / 2), Math.round(feetY - sh * scale), sw * scale, sh * scale);
    const pulse = 1 + (t > 0.6 && t < 3.6 ? Math.sin(t * 14) * 0.0 : 0);
    if (t < 0.6) {
      drawSprite(Assets.get(from.sheet), 0, 0, 32, 32, S);
    } else if (t < 3.7) {
      const p = (t - 0.6) / 3.0, period = 0.5 - 0.44 * p * p;
      const showNew = Math.floor((t - 0.6) / Math.max(0.05, period)) % 2 === 1;
      const glow = Math.round(3 + Math.sin(t * 10) * 1);
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 30 + glow * 3, 40 + glow * 2, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
      drawSprite(this.silhouette(showNew ? to.sheet : from.sheet), 0, 0, 32, 32, S);
    } else if (t >= 4.1) {
      const k = Math.min(1, (t - 4.1) / 0.5), bounce = 1 + Math.max(0, Math.sin((t - 4.1) * 8)) * 0.0;
      if (k < 1) { ctx.globalAlpha = 1 - k; drawSprite(this.silhouette(to.sheet), 0, 0, 32, 32, S); ctx.globalAlpha = 1; }
      ctx.globalAlpha = k; drawSprite(Assets.get(to.sheet), 0, 0, 32, 32, S); ctx.globalAlpha = 1;
      // expanding ring
      const rr = (t - 4.1) * 110;
      if (rr < 170) { ctx.strokeStyle = 'rgba(255,244,190,' + Math.max(0, 1 - rr / 170).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 10, rr, 0, 6.283); ctx.stroke(); }
      // age label (number only; extra text comes from data/text_ch2.js)
      if (t > 4.5) {
        ctx.globalAlpha = Math.min(1, (t - 4.5) * 2);
        Text.draw(ctx, 'Tuổi ' + to.age, cx, 142, { align: 'center', scale: 2, color: '#ffd65a', shadow: '#3a2a4d' });
        const extra = (typeof CH2_TEXT !== 'undefined' && CH2_TEXT.growthLabel && CH2_TEXT.growthLabel[to.id]) || '';
        if (extra) Text.draw(ctx, extra, cx, 162, { align: 'center', color: '#fff4e6', shadow: '#3a2a4d' });
        ctx.globalAlpha = 1;
      }
    }
    // particles
    for (const p of f.parts) { ctx.globalAlpha = Math.max(0, Math.min(1, (p.life - p.age) * 2)); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.mode === 'in' ? 2 : 2, 2); }
    ctx.globalAlpha = 1;
    // flash
    if (t > 3.45 && t < 4.3) {
      const a = t < 3.8 ? (t - 3.45) / 0.35 : Math.max(0, 1 - (t - 3.8) / 0.5);
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, a).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    }
  }
};
