// ============================================================
// npc.js - NPCSystem: NPC class with states, per-type conditions, commands,
// animation and drawing. Uses the same Physics as the player.
// States: idle | wander | attentive | retreat | follow | wait | happy | unsure | wave
// Sheet layout (13 frames): idle 0-1, walk 2-5, wave 6-8, happy 9-10, shy 11-12
// ============================================================
const NPC_CLIPS = { idle: [0, 2, 2], walk: [2, 4, 9], wave: [6, 3, 6], happy: [9, 2, 6], shy: [11, 2, 3] };   // [start, count, fps]
const NPC_NEEDS = ['wave', 'share', 'play'];
const NPC_NEED_ICON = { wave: 'wave', share: 'gift', play: 'ball' };

class NPC {
  constructor(type, cx, bottom, stageId) {
    this.type = type; this.cfg = NPC_TYPES[type];
    this.stage = stageId;
    this.w = 12; this.h = CharacterGrowth.get(stageId).hitbox.h;
    this.x = cx - this.w / 2; this.y = bottom - this.h; this.vx = 0; this.vy = 0; this.onGround = false;
    this.facing = -1; this.state = 'idle'; this.stateT = 0; this.after = 'idle';
    this.friendship = 0; this.need = NPC_NEEDS[Math.floor(Math.random() * 3)];
    this.homeX = this.x; this.wanderT = 1 + Math.random() * 2; this.wanderDir = 0;
    this.comfort = 0; this.attention = 0; this.rest = 0; this.patience = 0;
    this.bubble = null; this.animT = 0;
    this.sheetKey = 'npc_' + type + '_' + stageId;
  }

  setState(s, dur, after) { this.state = s; this.stateT = dur || 0; this.after = after || 'idle'; }
  say(icon, t) { this.bubble = { icon, t: t || 1.4 }; }
  near(p, d) { return Math.abs((p.x + p.w / 2) - (this.x + this.w / 2)) <= d && Math.abs((p.y + p.h) - (this.y + this.h)) < 24; }

  // Condition that must hold before the NPC accepts a social action. Returns {ok, icon}
  canTalk() {
    if (this.state === 'retreat') return { ok: false, icon: 'exclaim' };
    if (this.type === 'shy') return this.comfort >= this.cfg.stillTime ? { ok: true } : { ok: false, icon: 'exclaim' };
    if (this.type === 'energetic') return this.attention > 0 || this.state === 'follow' || this.state === 'wait' ? { ok: true } : { ok: false, icon: 'exclaim' };
    if (this.type === 'calm') return this.rest <= 0 ? { ok: true } : { ok: false, icon: 'wait' };
    return { ok: true };
  }

  // A social action (wave / share / play). Returns 'good' | 'wrong'
  receive(action, gainMult) {
    if (action === this.need) {
      this.friendship = Math.min(100, this.friendship + Math.round(34 * (gainMult || 1)));
      const keep = (this.state === 'follow' || this.state === 'wait') ? this.state : 'idle';
      this.setState(action === 'wave' ? 'wave' : 'happy', 1.1, keep);
      this.say('heart', 1.4);
      if (this.type === 'calm') this.rest = this.cfg.rest;
      let n; do { n = NPC_NEEDS[Math.floor(Math.random() * 3)]; } while (n === this.need); this.need = n;
      return 'good';
    }
    this.setState('unsure', 0.9, this.state === 'follow' || this.state === 'wait' ? this.state : 'idle');
    this.say('cross', 1.0);
    return 'wrong';
  }

  // follow / wait. Returns true when obeyed.
  command(cmd) {
    if (this.friendship < this.cfg.cmdMin) { this.say('question', 1.4); this.setState('unsure', 0.7, this.state === 'follow' || this.state === 'wait' ? this.state : 'idle'); return false; }
    this.state = cmd; this.stateT = 0; this.patience = (cmd === 'wait' && this.friendship < this.cfg.waitMin) ? 5 : 0;
    this.say(cmd === 'follow' ? 'follow' : 'wait', 1.0);
    return true;
  }

  update(dt, ctx) {
    const p = ctx.player, lv = ctx.level;
    this.animT += dt;
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
    if (this.attention > 0) this.attention -= dt;
    if (this.rest > 0) this.rest -= dt;
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2), adx = Math.abs(dx), nearP = adx < 90 && Math.abs(p.y - this.y) < 40;
    // shy comfort: grows while the player stands still close by, drops fast when the player moves
    if (this.type === 'shy') {
      if (adx < 60 && ctx.playerStill > 0.2) this.comfort = Math.min(2, this.comfort + dt); else this.comfort = Math.max(0, this.comfort - dt * 2);
    }
    if (this.type === 'energetic' && ctx.playerHopped && adx < 90) this.attention = this.cfg.attentionTime;

    let want = 0;                                    // desired horizontal direction
    const speed = this.cfg.speed;
    switch (this.state) {
      case 'follow': {
        const gap = Math.abs(p.vx) > 5 ? 26 : 9;
        if (adx > gap) want = Math.sign(dx);
        break;
      }
      case 'wait':
        if (this.patience > 0) { this.patience -= dt; if (this.patience <= 0) { this.state = 'follow'; this.say('exclaim', 1.2); } }
        break;
      case 'happy': case 'unsure': case 'wave':
        this.stateT -= dt; if (this.stateT <= 0) this.state = this.after;
        if (this.state === 'idle') this.state = 'idle';
        break;
      case 'retreat':
        this.stateT -= dt; want = -Math.sign(dx) || 1;
        if (this.stateT <= 0 || adx > 80) this.state = 'idle';
        break;
      case 'attentive':
        this.stateT -= dt; if (this.stateT <= 0) this.state = 'idle';
        break;
      default: {                                      // idle / wander
        if (this.type === 'shy' && nearP && adx < this.cfg.retreatDist && Math.abs(p.vx) > 10) { this.setState('retreat', 1.6); this.say('exclaim', 1.0); break; }
        if (this.type === 'energetic' && this.attention > 0) { this.vx = 0; this.facing = Math.sign(dx) || this.facing; break; }
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          const range = this.type === 'energetic' ? 64 : 34;
          this.wanderDir = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1);
          if (Math.abs(this.x - this.homeX) > range) this.wanderDir = Math.sign(this.homeX - this.x);
          this.wanderT = (this.type === 'energetic' ? 0.7 : 1.2) + Math.random() * 1.4;
        }
        // stay near home: checked every frame so fast NPCs cannot wander onto plates by accident
        const range2 = this.type === 'energetic' ? 64 : 34, off = this.x - this.homeX;
        if (Math.abs(off) > range2) this.wanderDir = -Math.sign(off);
        want = this.wanderDir * (this.type === 'energetic' ? 1 : 0.5);
        if (!want && nearP) this.facing = Math.sign(dx) || this.facing;
      }
    }
    this.vx = want * speed;
    if (want) this.facing = Math.sign(want);
    // hop over small obstacles
    if (this.vx !== 0 && this.onGround) {
      const T = CONFIG.TILE, ax = Math.floor((this.x + this.w / 2 + Math.sign(this.vx) * (this.w / 2 + 3)) / T), fy = Math.floor((this.y + this.h - 2) / T);
      if (lv.isSolid(ax, fy)) this.vy = -230;
    }
    Physics.step(this, lv, dt);
  }

  clipFor() {
    if (this.state === 'happy') return 'happy';
    if (this.state === 'wave') return 'wave';
    if (this.state === 'unsure' || this.state === 'retreat') return 'shy';
    if (Math.abs(this.vx) > 5) return 'walk';
    return 'idle';
  }

  draw(ctx, cx, cy, nearPlayer) {
    const sheet = Assets.get(this.sheetKey); if (!sheet) return;
    const [start, count, fps] = NPC_CLIPS[this.clipFor()];
    const f = start + Math.floor(this.animT * fps) % count;
    const dx = Math.round(this.x + this.w / 2 - 16) - cx, dy = Math.round(this.y + this.h - 32) - cy;
    ctx.fillStyle = 'rgba(58,42,77,0.18)'; ctx.fillRect(dx + 10, Math.round(this.y + this.h) - cy, 12, 1);
    if (this.facing === -1) { ctx.save(); ctx.translate(dx + 32, 0); ctx.scale(-1, 1); ctx.drawImage(sheet, f * 32, 0, 32, 32, 0, dy, 32, 32); ctx.restore(); }
    else ctx.drawImage(sheet, f * 32, 0, 32, 32, dx, dy, 32, 32);
    // speech/need bubble
    const bx = Math.round(this.x + this.w / 2 - 8) - cx, by = dy - 2;
    if (this.bubble) { UI.panel(ctx, bx - 2, by - 17, 20, 18, '#fff'); UIManager.icon(ctx, this.bubble.icon, bx, by - 16, 1); }
    else if (nearPlayer && this.state !== 'happy') {
      const ok = this.canTalk().ok;
      UI.panel(ctx, bx - 2, by - 17, 20, 18, ok ? '#fff' : '#ece6f3');
      UIManager.icon(ctx, ok ? NPC_NEED_ICON[this.need] : 'question', bx, by - 16, 1, ok ? 1 : 0.6);
    }
    // friendship bar
    if (nearPlayer) UIManager.bar(ctx, Math.round(this.x + this.w / 2 - 12) - cx, by + 34, 24, 4, this.friendship / 100, UIManager.C.pink);
  }
}
