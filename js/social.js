// ============================================================
// social.js - SocialMinigame ("Making Friends")
// Walk (same Player/Physics as the hub), approach NPCs, press E / tap to talk,
// choose an action. NPCs have states and their own conditions (see data/npc_data.js).
//   level 1 Say Hello       : befriend two NPCs (friendship 100 each)
//   level 2 Work Together   : Follow / Wait commands - a friend holds the plate so you can pass the gate
//   level 3 Group Challenge : three friends, two gates, everyone needs friendship 60 at the exit
// Reusable: DiscoverMinigame creates it with opts.cfg = { key: 'finale' }.
// ============================================================
class SocialMinigame extends MinigameBase {
  constructor(game, level, opts) {
    super(game, level, opts);
    this.key = String((opts && opts.cfg && opts.cfg.key) || level);
    this.def = SOCIAL_LEVELS[this.key];
    this.lv = new Level(this.def.rows, {});
    this.stageId = (game.stageId && game.stageId !== 'baby') ? game.stageId : 'child';
    const st = CharacterGrowth.get(this.stageId);
    this.player = new Player(this.lv.spawn.x, this.lv.spawn.y);
    this.animator = new Animator(st.sheet, st.animSet);
    CharacterGrowth.apply(this.player, this.animator, this.stageId);
    this.player.reset();
    this.camera = new Camera(); this.camera.follow(this.player, this.lv, true);
    this.npcs = this.lv.npcSpawns.slice().sort((a, b) => a.slot - b.slot).map((s) => new NPC(this.def.npcs[s.slot], s.x, s.y, this.stageId));
    this.mode = 'move'; this.focus = null; this.stillT = 0;
    this.mistakes = 0; this.good = 0; this.celebrate = 0; this.say = null; this.hintT = 0;
    this.aura = ProgressionManager.hasReward('friendly_aura') ? 1.25 : 1;
    this.menu = [];
  }

  progress() {
    const need = this.def.goal === 'friends' ? this.def.need : 100;
    return this.npcs.reduce((a, n) => a + Math.min(1, n.friendship / need), 0) / this.npcs.length;
  }

  update(dt) {
    super.update(dt);
    const p = this.player, lv = this.lv;
    if (this.say) { this.say.t -= dt; if (this.say.t <= 0) this.say = null; }
    if (this.celebrate > 0) {
      this.celebrate -= dt; this.npcs.forEach((n) => { if (n.state !== 'happy') n.setState('happy', 0.9, 'idle'); });
      if (Math.random() < 0.3) Fx.burst(p.x + 6 + (Math.random() - 0.5) * 80, p.y - 10, ['#ffd65a', '#ff8cb4', '#96d0ff'], 4, 40);
      this.npcs.forEach((n) => { n.update(dt, this.ctx()); });
      if (this.celebrate <= 0) this.endLevel();
      return;
    }
    let hopped = false;
    if (this.mode === 'move') {
      const was = p.onGround; p.update(dt, lv);
      hopped = was && !p.onGround && p.vy < 0;
      if (hopped) Sfx.play('hop');
      this.stillT = (Math.abs(p.vx) < 1 && p.onGround) ? this.stillT + dt : 0;
      if (this.animator.update(dt, p) === 'land') Fx.dust(p.x + 6, p.y + p.h);
    } else this.animator.update(dt, Object.assign({}, p, { state: 'idle', onGround: true }));
    lv.updatePuzzle(dt, [p].concat(this.npcs));
    this.npcs.forEach((n) => n.update(dt, this.ctx(hopped)));
    this.camera.follow(p, lv);

    // who can I talk to?
    this.focus = null;
    let best = 38;
    for (const n of this.npcs) { const d = Math.abs((p.x + p.w / 2) - (n.x + n.w / 2)); if (n.near(p, 38) && d < best) { best = d; this.focus = n; } }

    if (this.mode === 'menu') { this.updateMenu(); return; }
    if (this.focus && (Input.wasPressed('KeyE') || Input.wasPressed('Enter'))) this.openMenu();
    this.checkGoal();
  }

  ctx(hopped) { return { player: this.player, level: this.lv, playerStill: this.stillT, playerHopped: !!hopped }; }

  openMenu() {
    this.mode = 'menu'; this.menuNpc = this.focus; Sfx.play('ui');
    const ids = ['wave', 'share', 'play'].concat(this.def.coop ? ['follow', 'wait'] : []);
    const icons = { wave: 'wave', share: 'gift', play: 'ball', follow: 'follow', wait: 'wait' };
    const w = 24, gap = 4, total = ids.length * w + (ids.length - 1) * gap;
    const n = this.menuNpc, sx = Math.round(n.x + n.w / 2 - this.camera.x), sy = Math.round(n.y - this.camera.y);
    const x0 = Math.max(4, Math.min(CONFIG.WIDTH - total - 4, sx - total / 2)), y = Math.max(26, sy - 62);
    this.menu = ids.map((id, i) => ({ id, icon: icons[id], x: x0 + i * (w + gap), y, w, h: 24 }));
    this.menuBox = { x: x0 - 4, y: y - 4, w: total + 8, h: 32 };
  }

  updateMenu() {
    let id = UIManager.click(this.menu);
    this.menu.forEach((b, i) => { if (Input.key('Digit' + (i + 1))) id = b.id; });
    if (!id) {
      if (Input.pointer.pressed && !Input.inRect(this.menuBox.x, this.menuBox.y, this.menuBox.w, this.menuBox.h)) this.mode = 'move';
      if (Input.key('KeyE')) this.mode = 'move';
      return;
    }
    this.mode = 'move';
    const n = this.menuNpc, key = CH2_TEXT.npc[n.type] || {};
    if (id === 'follow' || id === 'wait') { const ok = n.command(id); Sfx.play(ok ? 'ui' : 'land'); return; }
    const c = n.canTalk();
    if (!c.ok) { n.say(c.icon, 1.4); Sfx.play('land'); this.hintT = 1; return; }       // condition not met: no penalty, just a hint
    const r = n.receive(id, this.aura);
    if (r === 'good') {
      this.good++; Sfx.play('heart'); Fx.burst(n.x + 6, n.y, ['#ff8cb4', '#ffdcec'], 8, 40); Fx.text(n.x + 6, n.y - 8, '+', '#ff8cb4');
      if (key.happy) this.say = { text: key.happy, t: 3 };
    } else { this.mistakes++; Sfx.play('land'); if (key.wrong) this.say = { text: key.wrong, t: 3 }; }
  }

  checkGoal() {
    const p = this.player, lv = this.lv, g = this.def.goal, need = this.def.need;
    if (g === 'friends') { if (this.npcs.every((n) => n.friendship >= need)) this.startCelebrate(); return; }
    const e = lv.exit;
    if (!e || !(p.x + p.w > e.x + 6 && p.x < e.x + e.w - 6 && p.y + p.h > e.y)) return;
    if (g === 'group') {
      const ready = this.npcs.every((n) => n.friendship >= need);
      const last = this.npcs[this.npcs.length - 1];
      const together = last.state === 'follow' && Math.abs(last.x - p.x) < 48;
      if (!(ready && together)) {
        this.hintT -= 0; if (!this.nagT || this.t - this.nagT > 1.5) { this.nagT = this.t; this.npcs.forEach((n) => { if (n.friendship < need || (n === last && !together)) n.say('question', 1.3); }); }
        return;
      }
    }
    this.startCelebrate();
  }

  startCelebrate() { this.celebrate = 1.8; Sfx.play('win'); Fx.confetti(30); }

  endLevel() {
    const m = this.mistakes;
    const stars = m <= 2 ? 3 : m <= (this.def.goal === 'friends' ? 5 : 4) ? 2 : 1;
    const base = (this.opts.cfg && this.opts.cfg.gain) || [10, 14, 18][Math.min(2, this.level - 1)];
    this.finish({ score: Math.max(100, 1000 - m * 70), stars, stats: { friendship: base + 2 * stars }, detail: m + ' mistakes' });
  }

  render(ctx) {
    const cx = Math.round(this.camera.x), cy = Math.round(this.camera.y), lv = this.lv, p = this.player;
    Renderer.drawBackground(ctx, cx, this.t);
    Renderer.drawDecor(ctx, lv, cx, cy); Renderer.drawLevel(ctx, lv, cx, cy); Renderer.drawPuzzle(ctx, lv, cx, cy); Renderer.drawExit(ctx, lv, cx, cy, this.t);
    this.npcs.forEach((n) => n.draw(ctx, cx, cy, n.near(p, 70)));
    Renderer.drawPlayer(ctx, p, this.animator, cx, cy);
    Fx.draw(ctx, cx, cy);
    // HUD: friendship progress
    UI.panel(ctx, 4, 4, 120, 18);
    UIManager.icon(ctx, 'heart', 6, 5, 1);
    UIManager.bar(ctx, 24, 10, 94, 7, this.progress(), UIManager.C.pink);
    UIManager.icon(ctx, 'cross', 232, 3, 1); Text.draw(ctx, String(this.mistakes), 250, 8, { color: UIManager.C.bad });
    Text.draw(ctx, LT('friendship', 'Friendship'), 130, 8, { color: UIManager.C.ink, shadow: '#fff' });
    if (this.focus && this.mode === 'move') { UIManager.keycap(ctx, 'E', CONFIG.WIDTH / 2 - 8, 160); Text.draw(ctx, LT('enter', 'Enter'), CONFIG.WIDTH / 2 + 8, 162, { color: UIManager.C.ink, shadow: '#fff' }); }
    if (this.mode === 'menu') {
      UI.panel(ctx, this.menuBox.x, this.menuBox.y, this.menuBox.w, this.menuBox.h, '#fff8ee');
      this.menu.forEach((b, i) => { UIManager.drawButton(ctx, b); Text.draw(ctx, String(i + 1), b.x + 2, b.y + 1, { color: UIManager.C.soft }); });
      const names = { wave: 'wave', share: 'share', play: 'play', follow: 'follow', wait: 'wait' };
      const hov = this.menu.find((b) => UIManager.hover(b));
      if (hov) Text.draw(ctx, LT(names[hov.id], names[hov.id]), this.menuBox.x + this.menuBox.w / 2, this.menuBox.y + this.menuBox.h + 3, { align: 'center', color: UIManager.C.ink, shadow: '#fff' });
    }
    if (this.say) { UI.panel(ctx, 20, 134, 280, 30); Text.draw(ctx, UIManager.wrap(this.say.text, 262).join('\n'), 28, 140, { color: UIManager.C.ink, lineH: 10 }); }
  }
}
// Replaced by the turn-based Social Battle (js/social_battle.js). Kept registered under another id so the old
// walking/NPC prototype is still available for reference or tests; nothing in the game opens it any more.
MinigameManager.register('friends_legacy', SocialMinigame);
