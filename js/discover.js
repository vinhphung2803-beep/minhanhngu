// ============================================================
// discover.js - DiscoverMinigame ("Discover Yourself")
// Four short phases (data/minigame_data.js -> DISCOVER_PHASES) that reuse the
// Painting / Language / Social Battle mini-games. Each finished phase is a checkpoint
// saved with ProgressionManager.setPhase, so leaving never loses progress.
// Gentle by design: nothing can be "failed", painting gets more forgiving after
// repeated attempts, and the social phase uses the easiest conditions.
// ============================================================
class DiscoverMinigame extends MinigameBase {
  constructor(game, level, opts) {
    super(game, level, opts);
    this.phase = ProgressionManager.phase('discover');
    if (this.phase >= DISCOVER_PHASES.length) this.phase = 0;
    this.results = []; this.sub = null; this.mode = 'sub'; this.between = 0;
  }
  begin() { this.startPhase(); }

  startPhase() {
    const ph = DISCOVER_PHASES[this.phase];
    const cls = { paint: PaintingMinigame, language: LanguageMinigame, social: SocialBattleMinigame }[ph.type];
    this.sub = new cls(this.game, 1, { cfg: ph.cfg, title: (CH2_TEXT.stations.discover || '') + ' ' + (this.phase + 1) + '/' + DISCOVER_PHASES.length });
    this.mode = 'sub';
  }

  update(dt) {
    super.update(dt);
    if (this.mode === 'sub') {
      this.sub.update(dt);
      if (this.sub.done) {
        const r = this.sub.result;
        this.results.push(r);
        this.phase++;
        ProgressionManager.setPhase('discover', this.phase >= DISCOVER_PHASES.length ? 0 : this.phase);
        Sfx.play('win'); Fx.confetti(20);
        if (this.phase >= DISCOVER_PHASES.length) { this.finishAll(); return; }
        this.mode = 'between'; this.between = 1.8; this.lastStars = r.stars;
      }
    } else if (this.mode === 'between') {
      this.between -= dt;
      if (this.between <= 0 || (this.between < 1.3 && (Input.pointer.pressed || Input.key('Enter') || Input.key('Space')))) this.startPhase();
    }
  }

  finishAll() {
    const sum = { creativity: 0, language: 0, friendship: 0 };
    let score = 0, stars = 0;
    this.results.forEach((r) => { score += r.score; stars += r.stars; for (const k of Object.keys(r.stats || {})) sum[k] += r.stats[k]; });
    const avg = Math.max(1, Math.min(3, Math.round(stars / this.results.length)));
    // every phase teaches a bit of everything
    for (const k of Object.keys(sum)) sum[k] += 6;
    this.finish({ score, stars: avg, stats: sum, detail: this.results.length + ' phases' });
  }

  render(ctx) {
    if (this.mode === 'sub') { this.sub.render(ctx); return; }
    ctx.fillStyle = '#2b2250'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    for (let i = 0; i < 40; i++) { if (Math.floor(this.t * 3 + i) % 3) { ctx.fillStyle = '#fff4e6'; ctx.fillRect((i * 71) % CONFIG.WIDTH, (i * 37) % CONFIG.HEIGHT, 1, 1); } }
    UI.panel(ctx, 70, 40, 180, 90);
    Text.draw(ctx, LT('phase', 'Phase') + ' ' + this.phase + '/' + DISCOVER_PHASES.length, 160, 52, { align: 'center', scale: 2, color: UIManager.C.ink });
    UIManager.stars(ctx, 160, 78, this.lastStars, 3, 20);
    for (let i = 0; i < DISCOVER_PHASES.length; i++) { ctx.fillStyle = i < this.phase ? UIManager.C.pink : '#e9dff0'; ctx.fillRect(100 + i * 32, 110, 26, 6); }
    Fx.draw(ctx, 0, 0);
  }
}
MinigameManager.register('discover', DiscoverMinigame);
