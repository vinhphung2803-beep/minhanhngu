// ============================================================
// main.js - The conductor: states, chapter flow, fixed-timestep loop.
//
// States:  loading -> title -> howto -> card -> dialogue -> play
//          -> finishing -> complete -> memory (x N) -> ending <-> letter
//
// Fixed timestep: logic always advances in 1/60 s steps; drawing runs
// at the display rate. Animations use the same dt, so they never depend on FPS.
// ============================================================
const Game = {
  canvas: null, ctx: null,
  state: 'loading', stateT: 0, time: 0,
  chapterIndex: 0, chapter: null,
  level: null, player: null, camera: null, animator: null,
  titleP: { x: 152, y: 132, w: 16, h: 16, facing: 1, onGround: true, state: 'run' },
  counts: { star: 0, heart: 0, plane: 0 },
  age: 1, toast: null, dialogue: null, fade: { a: 1, dir: -1, cb: null },
  memIndex: 0, letterPage: 0,
  debug: false, save: { done: false },
  stageId: 'baby', world: null, selIndex: 0,

  lastTime: 0, accumulator: 0, fps: 0, _fpsFrames: 0, _fpsTimer: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    Input.init(this.canvas);
    this.loadSave();
    this.animator = new Animator();
    SaveSystem.data && 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    Assets.load().then(() => {
      Text.init();
      if (Assets.failed.length) console.warn('Some assets failed to load:', Assets.failed);
      this.setState('title');
      this.fade = { a: 1, dir: -1, cb: null };
      const q = /[?&]chapter=(\d)/.exec(location.search);
      if (q) this.jumpToChapter(parseInt(q[1], 10) - 1);
    });
    requestAnimationFrame((t) => { this.lastTime = t; this.loop(t); });
  },

  // ---------- save (localStorage, never crashes if blocked) ----------
  loadSave() { SaveSystem.load(); this.save = SaveSystem.data.ch1; },
  writeSave() { SaveSystem.save(); },

  // ---------- chapters ----------
  startChapter(i) {
    this.chapterIndex = i;
    this.chapter = CHAPTERS[i];
    if (this.chapter.kind === 'world') { this.world = new ChapterWorld(this.chapter.world); this.world.enter(); return; }
    this.stageId = 'baby';
    this.level = new Level(this.chapter.rows, this.chapter.hints);
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
    this.camera = new Camera();
    this.camera.follow(this.player, this.level, true);
    this.counts = { star: 0, heart: 0, plane: 0 };
    this.age = 1; this.toast = null;
    Fx.list = []; Fx.floaters = [];
  },

  setState(s) { this.state = s; this.stateT = 0; },

  // Fade to dark, run cb in the dark, fade back in.
  fadeTo(cb) { this.fade = { a: 0, dir: 1, cb }; },

  confirmPressed() {
    return Input.wasPressed('Enter') || Input.wasPressed('Space') || Input.wasPressed('NumpadEnter');
  },

  say(lines, onDone) {
    this.dialogue = { lines, idx: 0, t: 0, onDone };
    this.setState('dialogue');
  },

  showToast(text, life = 3.2) { this.toast = { text, t: 0, life }; },

  // ---------- loop ----------
  resize() {
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / CONFIG.WIDTH, window.innerHeight / CONFIG.HEIGHT)));
    this.canvas.style.width = CONFIG.WIDTH * scale + 'px';
    this.canvas.style.height = CONFIG.HEIGHT * scale + 'px';
  },

  loop(now) {
    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameTime > 0.1) frameTime = 0.1;
    this.accumulator += frameTime;
    while (this.accumulator >= CONFIG.FIXED_STEP) {
      this.update(CONFIG.FIXED_STEP);
      this.accumulator -= CONFIG.FIXED_STEP;
    }
    this.render();
    this.countFps(frameTime);
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    this.time += dt;
    this.stateT += dt;
    if (Input.any()) Sfx.unlock();
    if (Input.wasPressed('KeyM')) Sfx.toggleMusic();
    if (Input.wasPressed('KeyG')) this.debug = !this.debug;

    // fade logic
    const f = this.fade;
    if (f.dir !== 0) {
      f.a += f.dir * dt * 3;
      if (f.dir > 0 && f.a >= 1) { f.a = 1; f.dir = -1; if (f.cb) { const cb = f.cb; f.cb = null; cb(); } }
      else if (f.dir < 0 && f.a <= 0) { f.a = 0; f.dir = 0; }
    }
    const busy = f.dir > 0;          // ignore input while fading out
    const ok = !busy && this.confirmPressed();

    switch (this.state) {
      case 'title':
        this.animator.update(dt, this.titleP);
        if (ok) { Sfx.play('ui'); this.fadeTo(() => { if (this.save.done) { this.selIndex = 0; this.setState('select'); } else this.setState('howto'); }); }
        if (!busy && this.save.done && Input.wasPressed('KeyB')) this.fadeTo(() => this.showMemoryLane());
        break;
      case 'select': this.updateSelect(busy); break;
      case 'howto':
        if (ok) { Sfx.play('ui'); this.fadeTo(() => { this.startChapter(0); this.setState('card'); }); }
        break;
      case 'card':
        if (!busy && (this.stateT > 2.4 || (ok && this.stateT > 0.6))) this.fadeTo(() => this.beginChapter());
        break;
      case 'hub': this.world.update(dt); break;
      case 'minigame': MinigameManager.update(dt); break;
      case 'evolve': CharacterGrowth.update(dt, this); break;
      case 'dialogue': this.updateDialogue(dt, ok); break;
      case 'play':
        if (Input.wasPressed('KeyR')) this.respawn();
        this.updatePlay(dt);
        break;
      case 'finishing':
        this.animator.update(dt, Object.assign({}, this.player, { onGround: true, state: 'idle' }));
        if (this.stateT > 1.6) { this.state = 'finishing_wait'; this.fadeTo(() => this.setState('complete')); }
        break;
      case 'complete':
        if (ok) { Sfx.play('ui'); this.fadeTo(() => this.goChapter(1)); }
        break;
      case 'memory':
        if (ok && this.stateT > 0.4) {
          Sfx.play('ui');
          this.fadeTo(() => {
            this.memIndex++;
            if (this.memIndex >= this.memoryChapters().length) this.showEnding();
            else this.setState('memory');
          });
        }
        break;
      case 'ending':
        if (!busy && Input.wasPressed('KeyL') && typeof LETTER_PAGES !== 'undefined' && LETTER_PAGES.length) {
          this.fadeTo(() => { this.letterPage = 0; this.setState('letter'); });
        }
        if (!busy && Input.wasPressed('KeyR')) this.fadeTo(() => { this.fx_reset(); this.setState('title'); });
        if (this.stateT < 12 && Math.floor(this.stateT * 4) !== Math.floor((this.stateT - dt) * 4)) Fx.confetti(2);
        break;
      case 'letter':
        if (ok) {
          Sfx.play('ui');
          if (this.letterPage < LETTER_PAGES.length - 1) { this.letterPage++; this.stateT = 0; }
          else this.fadeTo(() => this.setState('ending'));
        }
        break;
    }

    UIManager.update(dt);
    if (this.toast) { this.toast.t += dt; if (this.toast.t > this.toast.life) this.toast = null; }
    Fx.update(dt);
    Input.endStep();
  },

  fx_reset() { Fx.list = []; Fx.floaters = []; },

  updateDialogue(dt, ok) {
    const d = this.dialogue;
    d.t += dt;
    const full = d.lines[d.idx].length / 38;
    if (ok) {
      if (d.t < full) d.t = full;                       // finish typing
      else {
        Sfx.play('ui');
        d.idx++; d.t = 0;
        if (d.idx >= d.lines.length) { this.dialogue = null; const cb = d.onDone; if (cb) cb(); }
      }
    }
  },

  // ---------- chapter flow (Chapter 2+) ----------
  // Starts the intro of chapter index i (card -> dialogue -> gameplay)
  goChapter(i) {
    this.startChapter(i);
    this.setState('card');
  },

  beginChapter() {
    const ch = this.chapter;
    const lines = (ch.intro || []);
    const run = () => {
      if (ch.kind === 'world') { this.setState('hub'); this.world.startSequence(); }
      else this.setState('play');
    };
    if (lines.length) this.say(lines, run); else run();
  },

  // dev/test helper and "continue" shortcut: jump to chapter index i
  jumpToChapter(i) {
    this.fade = { a: 1, dir: -1, cb: null };
    if (i === 0) { this.startChapter(0); this.setState('card'); }
    else this.goChapter(i);
  },

  openMinigame(id) {
    this.setState('minigame');
    MinigameManager.open(id, () => { this.setState('hub'); this.world.afterMinigame(id); });
  },

  // stepping into a chapter exit
  worldExit(cfg) {
    if (this.state !== 'hub') return;
    this.setState('exiting');
    this.fadeTo(() => { if (cfg.exitTo === 'ending') { this.showEnding(); } else this.goChapter(cfg.exitTo); });
  },

  updateSelect(busy) {
    const items = this.selectItems();
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) { this.selIndex = (this.selIndex + 1) % items.length; Sfx.play('ui'); }
    if (Input.wasPressed('ArrowUp') || Input.wasPressed('KeyW')) { this.selIndex = (this.selIndex + items.length - 1) % items.length; Sfx.play('ui'); }
    let pick = -1;
    items.forEach((it, i) => { if (Input.pointer.pressed && Input.inRect(60, 56 + i * 22, 200, 19) && it.enabled) { this.selIndex = i; pick = i; } });
    if (!busy && (Input.key('Enter') || Input.key('Space'))) pick = this.selIndex;
    if (pick >= 0 && items[pick].enabled && !busy) { Sfx.play('ui'); const it = items[pick]; this.fadeTo(() => it.run()); }
  },

  selectItems() {
    const sv = SaveSystem.data;
    return [
      { label: 'Chương 1  ' + CHAPTERS[0].title, enabled: true, run: () => this.setState('howto') },
      { label: 'Chương 2  ' + (CHAPTERS[1].title || ''), enabled: sv.ch1.done, run: () => { if (ProgressionManager.stage() === 'baby' || true) this.goChapter(1); } },
      { label: 'Chương 3  ' + (CHAPTERS[2].title || ''), enabled: sv.ch2.done, run: () => this.goChapter(2) },
      { label: 'Màn kết sinh nhật', enabled: sv.ch2.done, run: () => this.showEnding() }
    ];
  },

  // ---------- gameplay step ----------
  updatePlay(dt) {
    const p = this.player, lv = this.level;
    const wasGround = p.onGround;
    p.update(dt, lv);                                    // physics untouched (player.js)
    if (wasGround && !p.onGround && p.vy < 0) Sfx.play('hop');
    if (this.animator.update(dt, p) === 'land') { Sfx.play('land'); Fx.dust(p.x + 8, p.y + 16); }

    if (p.y > lv.heightPx + 64) { this.respawn(); }

    // collectibles
    for (const c of lv.collectibles) {
      if (c.taken) { c.t += dt; continue; }
      if (Math.abs(p.x + 8 - c.x) < 11 && Math.abs(p.y + 8 - c.y) < 12) this.collect(c);
    }
    // checkpoints
    for (const cp of lv.checkpoints) {
      if (!cp.active && Math.abs(p.x - cp.x) < 20 && Math.abs(p.y - cp.y) < 24) {
        lv.checkpoints.forEach((o) => { o.active = o === cp || o.active; });
        p.spawnX = cp.x; p.spawnY = cp.y;
        Sfx.play('checkpoint'); Fx.burst(cp.x + 8, cp.y, ['#ff8cb4', '#ffd65a'], 10);
        this.showToast('Đã lưu điểm kiểm tra', 1.8);
      }
    }
    // hint triggers
    for (const tr of lv.triggers) {
      if (!tr.done && p.x + 16 > tr.x && p.x < tr.x + tr.w && p.y + 16 > tr.y && p.y < tr.y + tr.h) {
        tr.done = true;
        if (lv.hints[tr.key]) this.showToast(lv.hints[tr.key], 4);
      }
    }
    // growing up along the level
    const stages = this.chapter.ageStages || 5;
    const newAge = Math.min(stages, 1 + Math.floor((p.x / lv.widthPx) * stages));
    if (newAge > this.age) {
      this.age = newAge;
      Sfx.play('checkpoint');
      Fx.burst(p.x + 8, p.y, ['#ffd65a', '#fff4e6'], 12);
      this.showToast('Tuổi ' + newAge, 1.6);
    }
    // chapter exit
    const e = lv.exit;
    if (e && p.x + 16 > e.x + 6 && p.x < e.x + e.w - 6 && p.y + 16 > e.y && p.y < e.y + e.h + 16) {
      this.finishChapter();
    }
    this.camera.follow(p, lv);
  },

  collect(c) {
    c.taken = true; c.t = 0;
    this.counts[c.type]++;
    const col = { star: ['#ffd65a', '#fff4be'], heart: ['#ff8cb4', '#ffdcec'], plane: ['#96d0ff', '#e0f2ff'] }[c.type];
    Fx.burst(c.x, c.y, col, 10);
    Fx.text(c.x, c.y - 8, '+1', col[0]);
    Sfx.play(c.type);
  },

  finishChapter() {
    this.player.vx = 0;
    this.setState('finishing');
    Sfx.play('win');
    Fx.confetti(50);
    Fx.burst(this.player.x + 8, this.player.y, ['#ffd65a', '#ff8cb4', '#96d0ff'], 20, 70);
    // save best result
    const s = this.save;
    s.done = true;
    s.best = s.best || {};
    const prev = s.best['ch' + this.chapter.id] || { star: 0, heart: 0, plane: 0 };
    s.best['ch' + this.chapter.id] = { star: Math.max(prev.star, this.counts.star), heart: Math.max(prev.heart, this.counts.heart), plane: Math.max(prev.plane, this.counts.plane) };
    this.writeSave();
  },

  respawn() {
    this.player.reset();
    this.animator.prevGround = true;
    this.camera.follow(this.player, this.level, true);
    Fx.burst(this.player.x + 8, this.player.y + 8, ['#fff4e6', '#ffd65a'], 6, 30);
  },

  // ---------- memory lane + ending ----------
  memoryChapters() { return CHAPTERS.filter((c) => !c.playable); },

  showMemoryLane() {
    this.memIndex = 0;
    if (!this.memoryChapters().length) return this.showEnding();
    this.setState('memory');
  },

  showEnding() {
    this.setState('ending');
    this.fx_reset();
    Fx.confetti(70);
    Sfx.play('win');
  },

  // ---------- drawing ----------
  render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    if (!Assets.images.font) {                          // still loading
      ctx.fillStyle = '#3a2a4d'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
      // font bitmap chưa tải xong -> dùng font hệ thống để hiện tên game + 'Đang tải...'
      ctx.fillStyle = '#ffd9e8'; ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText('CMSN CON THƯ BÉO PHÌ', CONFIG.WIDTH / 2, 82);
      ctx.font = '9px sans-serif'; ctx.fillText('Đang tải...', CONFIG.WIDTH / 2, 100); ctx.textAlign = 'left';
      return;
    }
    switch (this.state) {
      case 'title': UI.title(ctx, this); break;
      case 'howto': UI.howto(ctx, this); break;
      case 'card': UI.chapterCard(ctx, this, this.chapter); break;
      case 'complete': UI.complete(ctx, this, this.chapter); break;
      case 'select': UI.select(ctx, this, this.selectItems()); break;
      case 'hub': case 'exiting': this.world.render(ctx); break;
      case 'minigame': MinigameManager.render(ctx); break;
      case 'evolve': this.world.render(ctx); CharacterGrowth.render(ctx, this); break;
      case 'memory': UI.memory(ctx, this, this.memoryChapters()[this.memIndex]); break;
      case 'ending': UI.ending(ctx, this); break;
      case 'letter': UI.letter(ctx, this); break;
      default:                                          // dialogue / play / finishing
        if (this.chapter && this.chapter.kind === 'world' && this.world) {
          this.world.render(ctx);
          if (this.state === 'dialogue' && this.dialogue) UI.dialogue(ctx, this.dialogue, this.time);
        } else if (this.level) {
          Renderer.render(ctx, this);
          UI.hud(ctx, this);
          UI.toast(ctx, this);
          if (this.state === 'dialogue' && this.dialogue) UI.dialogue(ctx, this.dialogue, this.time);
        }
    }
    UIManager.drawToasts(ctx);
    UI.fade(ctx, this.fade.a);
  },

  countFps(frameTime) {
    this._fpsFrames++;
    this._fpsTimer += frameTime;
    if (this._fpsTimer >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsTimer);
      this._fpsFrames = 0; this._fpsTimer = 0;
    }
  }
};

window.addEventListener('load', () => Game.init());
