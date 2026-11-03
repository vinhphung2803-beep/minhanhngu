// ============================================================
// anim.js - Time-based sprite animation (independent of FPS).
// The sheet is a single row of 32x32 frames. CLIPS says where each
// clip starts and how fast it plays. The physics hitbox is NOT here.
//
// NOTE: the frames in baby_sheet.png are generated procedurally from
// the one static baby sprite (head bob / squash / lift) by
// tools/make_assets.py. Replace baby_sheet.png with hand-made frames
// of the same layout any time and the code keeps working.
// ============================================================
const CLIPS = {
  idle_crawl: { start: 0, count: 2, fps: 2,  loop: true },
  crawl:      { start: 2, count: 4, fps: 9,  loop: true },
  hop:        { start: 6, count: 3, fps: 12, loop: false },
  land:       { start: 9, count: 2, fps: 12, loop: false }
};
// Standing stages use the same frame layout, with generic clip names.
CLIPS.idle = { start: 0, count: 2, fps: 2, loop: true };
CLIPS.run  = { start: 2, count: 4, fps: 10, loop: true };
const CLIP_NAMES = { crawl: { idle: 'idle_crawl', run: 'crawl' }, walk: { idle: 'idle', run: 'run' } };

class Animator {
  constructor(sheetKey, set) {
    this.sheetKey = sheetKey || 'baby';
    this.names = CLIP_NAMES[set || 'crawl'];
    this.clip = this.names.idle;
    this.time = 0;
    this.prevGround = true;
    this.landTimer = 0;
  }

  // Used by CharacterGrowth when the character grows into another stage
  setSheet(sheetKey, set) {
    this.sheetKey = sheetKey; this.names = CLIP_NAMES[set || 'crawl'];
    this.clip = this.names.idle; this.time = 0; this.landTimer = 0; this.prevGround = true;
  }

  play(name) {
    if (this.clip !== name) { this.clip = name; this.time = 0; }
  }

  // Called once per fixed step with the player's current state.
  update(dt, p) {
    this.time += dt;
    const justLanded = p.onGround && !this.prevGround;
    this.prevGround = p.onGround;
    if (justLanded) { this.landTimer = 2 / CLIPS.land.fps; this.play('land'); return 'land'; }
    if (this.landTimer > 0) this.landTimer -= dt;

    if (!p.onGround) {
      // hop: frame 0-1 on the way up, last frame while falling
      this.play('hop');
      this.hopFrame = p.state === 'jump' ? Math.min(1, Math.floor(this.time * CLIPS.hop.fps)) : 2;
    } else if (this.landTimer > 0 && p.state === 'idle') {
      this.play('land');
    } else {
      this.play(p.state === 'run' ? this.names.run : this.names.idle);
    }
    return null;
  }

  frameIndex() {
    const c = CLIPS[this.clip];
    if (this.clip === 'hop') return c.start + this.hopFrame;
    const n = Math.floor(this.time * c.fps);
    return c.start + (c.loop ? n % c.count : Math.min(n, c.count - 1));
  }
}

// Same class, generic name: every growth stage (and Chapter 3) uses it.
const CharacterAnimation = Animator;
