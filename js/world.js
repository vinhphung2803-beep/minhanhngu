// ============================================================
// world.js - ChapterWorld: a walkable chapter map with stations (Chapter 2 hub,
// Chapter 3 placeholder). It re-uses Player, Physics, Camera, Animator, Level and
// Renderer from Chapter 1 - there is no second control system.
//
// A new chapter = new ChapterWorld(config) + a level in data/. Config:
//   id, rows, startStage (growth stage on arrival), text (CH2_TEXT / CH3_TEXT),
//   exitTo ('ending' or a chapter index), exitNeedsDiscover (exit opens after Discover Yourself)
// ============================================================
class ChapterWorld {
  constructor(cfg) { this.cfg = cfg; this.mode = 'walk'; this.focus = null; this.t = 0; this.exitMsg = 0; }

  get game() { return Game; }
  chapterKey() { return 'ch' + this.cfg.id; }

  enter() {
    const g = Game;
    g.level = new Level(this.cfg.rows, {});
    g.player = new Player(g.level.spawn.x, g.level.spawn.y);
    g.animator = new Animator();
    const cur = ProgressionManager.stage();
    CharacterGrowth.apply(g.player, g.animator, cur);
    g.stageId = cur;
    g.player.reset();
    g.camera = new Camera(); g.camera.follow(g.player, g.level, true);
    Fx.list = []; Fx.floaters = [];
    this.mode = 'walk'; this.focus = null; this.t = 0;
    const sv = SaveSystem.data[this.chapterKey()]; if (sv) { sv.started = true; SaveSystem.save(); }
    AchievementManager.check();
  }

  // Runs the arrival cutscene (growth into the chapter's first form), then dialogue.
  startSequence() {
    const cur = ProgressionManager.stage();
    if (CharacterGrowth.index(cur) < CharacterGrowth.index(this.cfg.startStage)) this.growTo(this.cfg.startStage, () => {});
    else this.afterGrowthChecks();
  }

  growTo(stageId, then) {
    CharacterGrowth.evolve(Game, stageId, () => {
      ProgressionManager.setStage(stageId);
      AchievementManager.check();
      const lines = ((this.cfg.text.afterGrowth || {})[stageId]) || [];
      const proceed = () => { const nxt = ProgressionManager.pendingGrowth(); if (nxt && this.cfg.id === 2) this.growTo(nxt, then); else { if (then) then(); this.finaleCheck(); } };
      if (lines.length) Game.say(lines, () => { Game.setState('hub'); proceed(); }); else proceed();
    });
  }

  afterGrowthChecks() { const nxt = ProgressionManager.pendingGrowth(); if (nxt && this.cfg.id === 2) this.growTo(nxt); else this.finaleCheck(); }

  // when returning from a mini-game
  afterMinigame(id) {
    if (id === 'boss18') { this.bossVictory(); return; }
    const nxt = ProgressionManager.pendingGrowth();
    const seen = ProgressionManager.d.seen;
    const lines = (CH2_TEXT.afterGame || {})[id] || [];
    const key = 'complete_' + id;
    const go = () => { if (nxt && this.cfg.id === 2) this.growTo(nxt); else this.finaleCheck(); };
    if (ProgressionManager.gameComplete(id) && !seen[key]) {
      seen[key] = true; SaveSystem.save();
      if (lines.length) { Game.say(lines, () => { Game.setState('hub'); go(); }); return; }
    }
    go();
  }

  // Chapter 3: thắng Tuổi 18 -> hiệu ứng trưởng thành sang tuổi 19 -> hoàn thành chương
  bossVictory() {
    if (ProgressionManager.isCleared('boss18', 1) && CharacterGrowth.index(ProgressionManager.stage()) < CharacterGrowth.index('adult')) this.growTo('adult', () => {});
    else this.finaleCheck();
  }

  finaleCheck() {
    if (this.cfg.id === 3) {
      const sv3 = SaveSystem.data.ch3;
      if (ProgressionManager.isCleared('boss18', 1) && !sv3.done) {
        sv3.done = true; SaveSystem.save(); AchievementManager.check();
        Sfx.play('win'); Fx.confetti(40);
        if ((CH3_TEXT.finale || []).length) Game.say(CH3_TEXT.finale, () => Game.setState('hub'));
      }
      return;
    }
    if (this.cfg.id !== 2) return;
    const sv = SaveSystem.data.ch2;
    if (ProgressionManager.discoverDone() && !sv.done) {
      sv.done = true; SaveSystem.save(); AchievementManager.check();
      Sfx.play('win'); Fx.confetti(40);
      if ((CH2_TEXT.finale || []).length) Game.say(CH2_TEXT.finale, () => Game.setState('hub'));
    }
  }

  exitOpen() {
    if (this.cfg.exitNeedsBoss) return ProgressionManager.isCleared('boss18', 1);
    return !this.cfg.exitNeedsDiscover || ProgressionManager.discoverDone();
  }

  // ---------------- update ----------------
  update(dt) {
    const g = Game, p = g.player, lv = g.level;
    this.t += dt;
    if (this.exitMsg > 0) this.exitMsg -= dt;
    if (this.mode === 'progress') { this.updateProgress(); return; }
    const was = p.onGround;
    p.update(dt, lv);
    if (was && !p.onGround && p.vy < 0) Sfx.play('hop');
    if (g.animator.update(dt, p) === 'land') { Sfx.play('land'); Fx.dust(p.x + p.w / 2, p.y + p.h); }
    g.camera.follow(p, lv);
    if (ProgressionManager.hasReward('sparkle_trail') && Math.abs(p.vx) > 5 && Math.random() < 0.25) Fx.burst(p.x + p.w / 2, p.y + p.h - 2, ['#ffd65a', '#ff8cb4', '#fff4e6'], 1, 12);

    // station focus
    this.focus = null;
    const pc = p.x + p.w / 2;
    for (const st of lv.stations) if (Math.abs(pc - (st.x + 8)) < 26 && p.onGround) this.focus = st;
    const act = Input.wasPressed('KeyE') || Input.wasPressed('Enter') || Input.wasPressed('ArrowDown');
    if (this.focus && act) {
      if (this.stationLocked(this.focus)) Sfx.play('land');
      else { Sfx.play('ui'); g.openMinigame(this.focus.id); return; }
    }
    // exit
    const e = lv.exit;
    if (e && p.x + p.w > e.x + 6 && p.x < e.x + e.w - 6 && p.y + p.h > e.y) {
      if (this.exitOpen()) { g.worldExit(this.cfg); return; }
      this.exitMsg = 1.2;
    }
    // progress screen
    if (Input.key('KeyP') || UIManager.click([{ id: 'p', x: 298, y: 158, w: 18, h: 18 }])) { this.mode = 'progress'; Sfx.play('ui'); }
  }

  stationLocked(st) { return st.id === 'discover' && !ProgressionManager.discoverUnlocked(); }

  updateProgress() {
    if (Input.key('KeyP') || Input.key('Escape') || Input.key('Enter') || UIManager.click([{ id: 'back', x: 12, y: 150, w: 70, h: 20 }])) { this.mode = 'walk'; Sfx.play('ui'); }
  }

  // ---------------- render ----------------
  render(ctx) {
    const g = Game, lv = g.level, p = g.player;
    const cx = Math.round(g.camera.x), cy = Math.round(g.camera.y);
    Renderer.drawBackground(ctx, cx, g.time);
    Renderer.drawDecor(ctx, lv, cx, cy); Renderer.drawLevel(ctx, lv, cx, cy);
    this.drawStations(ctx, lv, cx, cy);
    if (lv.exit) {
      if (!this.exitOpen()) ctx.globalAlpha = 0.4;
      Renderer.drawExit(ctx, lv, cx, cy, g.time); ctx.globalAlpha = 1;
      if (!this.exitOpen()) UIManager.icon(ctx, 'lock', lv.exit.x + 8 - cx, lv.exit.y + 24 - cy, 1);
    }
    Renderer.drawPlayer(ctx, p, g.animator, cx, cy);
    Fx.draw(ctx, cx, cy);
    this.drawHud(ctx);
    if (this.mode === 'progress') this.drawProgress(ctx);
  }

  drawStations(ctx, lv, cx, cy) {
    const img = Assets.get('stations'); if (!img) return;
    const idx = { artist: 0, language: 1, friends: 2, discover: 3, boss18: 3 }, ic = { artist: 'brush', language: 'book', friends: 'heart', discover: 'sparkle', boss18: 'medal' };
    for (const st of lv.stations) {
      const sx = Math.round(st.x - 8 - cx), sy = Math.round(st.y - 16 - cy);
      if (sx < -40 || sx > CONFIG.WIDTH + 8) continue;
      const locked = this.stationLocked(st);
      ctx.globalAlpha = locked ? 0.55 : 1; ctx.drawImage(img, idx[st.id] * 32, 0, 32, 32, sx, sy, 32, 32); ctx.globalAlpha = 1;
      const bob = Math.round(Math.sin(Game.time * 3 + st.x) * 2);
      if (locked) UIManager.icon(ctx, 'lock', sx + 8, sy + 8, 1); else UIManager.icon(ctx, ic[st.id], sx + 8, sy - 22 + bob, 1);
      // little stars = levels cleared
      const n = st.id === 'discover' ? (ProgressionManager.discoverDone() ? 3 : 0) : (st.id === 'boss18' ? ProgressionManager.stars('boss18', 1) : ProgressionManager.levelsCleared(st.id));
      for (let i = 0; i < 3; i++) UIManager.star(ctx, sx + 4 + i * 8, sy - 6, 8, i < n);
    }
  }

  drawHud(ctx) {
    const g = Game, s = ProgressionManager.stats();
    UI.panel(ctx, 3, 3, 92, 38);
    ['creativity', 'language', 'friendship'].forEach((k, i) => UIManager.statRow(ctx, k, 8, 8 + i * 10, 84, s[k]));
    const age = CharacterGrowth.age(g.stageId);
    UI.panel(ctx, CONFIG.WIDTH - 52, 3, 49, 18, '#fff0f6');
    Text.draw(ctx, 'Tuổi ' + age, CONFIG.WIDTH - 27, 8, { align: 'center', color: '#c44d7a' });
    UI.panel(ctx, CONFIG.WIDTH - 52, 23, 49, 18);
    UIManager.icon(ctx, 'medal', CONFIG.WIDTH - 50, 24, 1);
    Text.draw(ctx, ProgressionManager.d.badges.length + '/' + BADGES.length, CONFIG.WIDTH - 30, 28, { color: UIManager.C.ink });
    UIManager.drawButton(ctx, { x: 298, y: 158, w: 18, h: 18, icon: 'medal' });
    // station prompt
    if (this.focus && this.mode === 'walk') {
      const st = this.focus, name = CH2_TEXT.stations[st.id] || st.id, locked = this.stationLocked(st);
      if (!locked) {
        const w = Text.width(name) + 40;
        UI.panel(ctx, Math.round(160 - w / 2), 150, w, 22);
        UIManager.keycap(ctx, 'E', Math.round(160 - w / 2) + 6, 155);
        Text.draw(ctx, name, Math.round(160 + 10), 158, { align: 'center', color: UIManager.C.ink });
      } else {
        UI.panel(ctx, 70, 128, 180, 46);
        Text.draw(ctx, name + ' - ' + LT('locked', 'Locked'), 160, 132, { align: 'center', color: UIManager.C.ink });
        const need = PROGRESSION.discoverRequires, cur = ProgressionManager.stats();
        ['creativity', 'language', 'friendship'].forEach((k, i) => {
          const x = 78 + i * 58; UIManager.icon(ctx, { creativity: 'brush', language: 'book', friendship: 'heart' }[k], x, 143, 1);
          Text.draw(ctx, Math.min(cur[k], need[k]) + '/' + need[k], x + 18, 148, { color: cur[k] >= need[k] ? '#3f8f5f' : UIManager.C.bad });
        });
      }
    }
    if (this.exitMsg > 0 && !this.exitOpen()) { UI.panel(ctx, 100, 150, 120, 20, '#fff0f6'); UIManager.icon(ctx, 'lock', 104, 152, 1); Text.draw(ctx, LT('exitChapter', 'Chapter exit') + ' - ' + LT('locked', 'Locked'), 166, 156, { align: 'center', color: UIManager.C.ink }); }
  }

  drawProgress(ctx) {
    UI.dim(ctx, 0.55);
    UI.panel(ctx, 6, 4, 308, 172, '#fff8ee');
    Text.draw(ctx, LT('progress', 'Progress'), 14, 10, { scale: 2, color: UIManager.C.ink });
    const s = ProgressionManager.stats();
    ['creativity', 'language', 'friendship'].forEach((k, i) => {
      UIManager.statRow(ctx, k, 14, 34 + i * 12, 130, s[k]);
      Text.draw(ctx, s[k] + '  ' + CH2_TEXT.stats[k], 150, 34 + i * 12, { color: UIManager.C.ink });
    });
    // mini-game stars
    ['artist', 'language', 'friends', 'discover'].forEach((id, i) => {
      const y = 74 + i * 14;
      Text.draw(ctx, CH2_TEXT.stations[id], 14, y, { color: UIManager.C.ink });
      for (let l = 1; l <= ProgressionManager.levelCount(id); l++) UIManager.star(ctx, 124 + (l - 1) * 11, y - 2, 10, ProgressionManager.stars(id, l) >= 1);
    });
    // rewards
    Text.draw(ctx, LT('rewards', 'Rewards'), 14, 132, { color: '#c44d7a' });
    REWARDS.forEach((r, i) => {
      const has = ProgressionManager.hasReward(r.id), x = 14 + (i % 2) * 78, y = 143 + Math.floor(i / 2) * 11;
      UIManager.icon(ctx, has ? 'sparkle' : 'lock', x, y - 4, 0.6, has ? 1 : 0.5);
      Text.draw(ctx, (CH2_TEXT.rewards[r.id] || {}).name || r.id, x + 11, y - 1, { color: has ? UIManager.C.ink : UIManager.C.soft });
    });
    // badges
    Text.draw(ctx, LT('badges', 'Badges') + ' ' + ProgressionManager.d.badges.length + '/' + BADGES.length, 184, 10, { color: '#c44d7a' });
    let hover = null;
    BADGES.forEach((b, i) => {
      const x = 184 + (i % 4) * 30, y = 26 + Math.floor(i / 4) * 30, has = ProgressionManager.hasBadge(b.id);
      UI.panel(ctx, x, y, 26, 26, has ? '#fff0c8' : '#e4dcea');
      UIManager.badge(ctx, b.id, x + 5, y + 5, 1, has ? 1 : 0.3);
      if (Input.inRect(x, y, 26, 26)) hover = b.id;
    });
    if (hover) {
      const t = CH2_TEXT.badges[hover] || {};
      Text.draw(ctx, t.name || hover, 184, 122, { color: UIManager.C.ink });
      Text.draw(ctx, UIManager.wrap(t.desc || '', 124).join('\n'), 184, 133, { color: UIManager.C.soft, lineH: 10 });
    }
    UIManager.drawButton(ctx, { x: 12, y: 150, w: 70, h: 20, label: LT('back', 'Back'), icon: 'back' });
  }
}
