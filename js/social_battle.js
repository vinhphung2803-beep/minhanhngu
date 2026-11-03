// ============================================================
// social_battle.js - the Social Battle screen ("Making Friends" station).
//
//   BattleMinigame        generic turn-based battle screen (sprites, HP bars, menu, conversation
//                         events, victory/defeat). It reads its content from a data object, so
//                         Chapter 3 can subclass it with a different data object (override `data`).
//   SocialBattleMinigame  Chapter 2: Phung The Vinh, data/social_battle_*.js
//
// All RULES live in js/battle_engine.js (no drawing there). This file only
//   * turns engine "beats" into animation, sound and particles,
//   * draws the UI, and reads mouse / touch / keyboard.
// Controls: mouse/touch = click the buttons; keyboard = arrows + Enter/Space, or 1-4.
// ============================================================

// tiny pixel icons that do not exist in icons.png (12x10, '.' = transparent)
const SB_PIXEL = {
  palette: { k: '#3a2a4d', b: '#6aa7e8', l: '#a9d0ff', p: '#ff8cb4', y: '#ffd65a', v: '#8a6bd6', w: '#ffffff' },
  gamepad: [
    '............', '............', '..kkkkkkkk..', '.kbbbbbbbbk.', 'kbbkbbbbpbbk', 'kbkkkbbpbykk',
    'kbbkbbbbybbk', '.kbbbbbbbbk.', '.kbbkkkkbbk.', '..kkk..kkk..'
  ],
  note: [
    '......kkkk..', '......kvvvk.', '......kvkkk.', '......kvk...', '......kvk...', '......kvk...',
    '..kkk.kvk...', '.kvvvkkvk...', '.kvvvvkk....', '..kkkk......'
  ]
};

const BATTLE_UI_DEFAULT = {
  menu: { attack: 'Trò chuyện', skill: 'Kỹ năng', defend: 'Phòng thủ', focus: 'Tập trung', back: 'Quay lại' },
  desc: { attack: 'Trò chuyện với nụ cười thân thiện. +1 tia sáng.', skill: 'Dùng kỹ năng đặc biệt (tốn tia sáng).', defend: 'Lắng nghe cẩn thận: nhận ít sát thương hơn trong lượt này.', focus: 'Hít thở và gom tia sáng. Hồi một chút máu.' },
  yourTurn: 'Đến lượt bạn! Bạn sẽ làm gì?',
  you: 'Bạn', barrier: 'Rào cản', turn: 'Lượt', next: 'Tiếp', sparks: 'SP', hp: 'HP',
  start: 'Kết bạn nào!', eventStart: 'Một cuộc trò chuyện bắt đầu!', conversation: 'Trò chuyện', pickAnswer: 'Bạn nói gì?',
  correct: 'Tuyệt!', wrong: 'Hừm...', cont: 'Tiếp tục', retry: 'Thử lại', leave: 'Rời đi',
  victory: 'Thành bạn rồi!', defeat: 'Chưa được...', blocked: 'bị chặn', placeholder: 'câu hỏi mẫu',
  logMovePlayer: 'Bạn dùng {name}!', logMoveEnemy: '{who} dùng {name}!',
  logHitPlayer: 'Bạn nhận {amount} sát thương.', logHitEnemy: 'Rào cản nhận {amount} sát thương!',
  logHealPlayer: 'Bạn hồi {amount} HP.', logHealEnemy: '{who} hồi {amount} HP.',
  logDefend: 'Bạn sẵn sàng lắng nghe.', logSkipPlayer: 'Bạn mất một lượt!', logSkipEnemy: '{who} đứng hình một lúc!',
  logStatus: '{who}: {label}', logEvent: '{who} muốn trò chuyện!', logWin: 'Rào cản tan biến!', phase: 'Giai đoạn', logPhase: '{who}: {name}', logLose: 'Bạn cần nghỉ lấy hơi...'
};
let SB_UI_OVERRIDE = null;      // nhãn riêng của lớp con (Chapter 3 boss); null = dùng nhãn Chapter 2
function BU(key, vars) {
  const t = (typeof CH2_TEXT !== 'undefined' && CH2_TEXT.battle && CH2_TEXT.battle.ui) || {};
  let s = (SB_UI_OVERRIDE && SB_UI_OVERRIDE[key] !== undefined) ? SB_UI_OVERRIDE[key] : (t[key] !== undefined ? t[key] : BATTLE_UI_DEFAULT[key]);
  if (s === undefined) return key;
  if (typeof s !== 'string') return s;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
function BMenu(key) { if (SB_UI_OVERRIDE && SB_UI_OVERRIDE.menu && SB_UI_OVERRIDE.menu[key]) return SB_UI_OVERRIDE.menu[key]; const m = (typeof CH2_TEXT !== 'undefined' && CH2_TEXT.battle && CH2_TEXT.battle.ui && CH2_TEXT.battle.ui.menu) || {}; return m[key] || BATTLE_UI_DEFAULT.menu[key]; }
function BDesc(key) { if (SB_UI_OVERRIDE && SB_UI_OVERRIDE.desc && SB_UI_OVERRIDE.desc[key] !== undefined) return SB_UI_OVERRIDE.desc[key]; const m = (typeof CH2_TEXT !== 'undefined' && CH2_TEXT.battle && CH2_TEXT.battle.ui && CH2_TEXT.battle.ui.desc) || {}; return m[key] !== undefined ? m[key] : (BATTLE_UI_DEFAULT.desc[key] || ''); }

const SB_STATUS_NAME = { atk: 'CÔNG', def: 'THỦ', guard: 'CHẮN', skip: 'ZZZ' };
const SB_C = { ink: '#3a2a4d', ok: '#8fd3a8', okDark: '#3f8f5f', bad: '#f06478', badDark: '#c4455f', hp: '#8fd3a8', hpLow: '#f06478', bar: '#ff8cb4', sp: '#ffd65a' };
const ease = { out: (p) => 1 - Math.pow(1 - p, 3), io: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) };

class BattleMinigame extends MinigameBase {
  // ---- override in subclasses (Chapter 3 can return its own data) ----
  get data() { return SOCIAL_BATTLE; }
  get bank() { return SOCIAL_BATTLE_QUESTIONS; }
  get topics() { return SOCIAL_BATTLE_TOPICS; }
  get texts() { return CH2_TEXT.battle || {}; }          // intro / victory / defeat / opponentName
  get uiOverride() { return null; }
  opponentSheet() { return this.data.opponent.sheet + '_' + this.stageId; }
  winStats(gain) { return { friendship: gain }; }        // chỉ số cộng khi thắng
  detailLine(s) { return s.turns + ' lượt, ' + s.correct + '/' + s.events + ' ' + BU('conversation').toLowerCase(); }

  constructor(game, level, opts) {
    super(game, level, opts);
    this.levelKey = String((opts && opts.cfg && opts.cfg.key) || level);
    this.lcfg = this.data.levels[this.levelKey] || this.data.levels['1'];
    const st = ProgressionManager.stage();
    this.stageId = (st && st !== 'baby') ? st : 'child';
    this.playerSheet = CharacterGrowth.get(this.stageId).sheet;
    SB_UI_OVERRIDE = this.uiOverride;
    this.enemySheet = this.opponentSheet();
    this.names = { enemy: this.texts.opponentName || this.data.opponent.name, you: this.texts.playerName || BU('you') };
    this.attempt = 0; this.sil = {};
    const m = /[?&]sbseed=(\d+)/.exec(typeof location !== 'undefined' ? location.search : ''); this.seed = m ? parseInt(m[1], 10) : undefined;   // test hook
    this.cur = null; this.queue = []; this.focus = 0; this.dlg = null; this.floats = [];
    this.resetBattle();            // set up here (not in begin()) because Discover Yourself creates sub-games without calling begin()
  }

  begin() {}

  // ------------------------------------------------------------ setup / restart
  resetBattle() {
    this.attempt++;
    const stats = ProgressionManager.stats();
    const lvl = isNaN(this.levelKey) ? this.levelKey : parseInt(this.levelKey, 10);
    this.engine = new BattleEngine(this.lcfg, this.data, this.bank, this.topics, { seed: this.seed === undefined ? undefined : this.seed + this.attempt, stats, level: lvl, aura: ProgressionManager.hasReward('friendly_aura') ? 1.25 : 1 });
    if (this.engine.problems.length) console.warn('[Social Battle] data problems:\n - ' + this.engine.problems.join('\n - '));
    const e = this.engine;
    this.shown = { php: e.player.hp, ehp: e.enemy.hp, ptrail: e.player.hp, etrail: e.enemy.hp, sp: e.player.sp };
    this.tgt = { php: e.player.hp, ehp: e.enemy.hp, sp: e.player.sp };
    this.fp = { ox: 0, oy: 0, shake: 0, flash: 0, anim: 'idle', animT: 0, shield: 0 };
    this.fe = { ox: 0, oy: 0, shake: 0, flash: 0, anim: 'idle', animT: 0, shield: 0 };
    this.log = []; this.queue = []; this.cur = null; this.intent = null; this.turnNo = 1; this.banner = null; this.result = null;
    this.ev = null; this.dim = 0; this.sceneShake = 0; this.floats = []; this.endT = 0;
    this.mode = 'intro'; this.focus = 0; this.skillMode = false; this.dlg = null;
    const intro = this.texts.intro || [];
    this.banner = { text: BU('start'), sub: this.names.enemy, t: 0, life: 1.5, big: true };
    this.introT = 1.3;
    if (intro.length && this.attempt === 1) this.sayLines(intro, () => this.startFight());
  }

  startFight() { this.mode = 'busy'; this.pushBeats(this.engine.start()); }

  sayLines(lines, cb) { this.dlg = { lines, idx: 0, t: 0, onDone: cb }; this.mode = 'dialogue'; }

  pushBeats(b) { this.queue.push(...b); }

  // ------------------------------------------------------------ update
  update(dt) {
    super.update(dt);
    const s = this.shown, T = this.tgt, k = Math.min(1, dt * 7);
    s.php += (T.php - s.php) * k; s.ehp += (T.ehp - s.ehp) * k; s.sp += (T.sp - s.sp) * Math.min(1, dt * 10);
    if (Math.abs(T.php - s.php) < 0.15) s.php = T.php;
    if (Math.abs(T.ehp - s.ehp) < 0.15) s.ehp = T.ehp;
    s.ptrail += (s.php - s.ptrail) * Math.min(1, dt * 1.6) * (s.ptrail > s.php ? 1 : 3);
    s.etrail += (s.ehp - s.etrail) * Math.min(1, dt * 1.6) * (s.etrail > s.ehp ? 1 : 3);
    for (const f of [this.fp, this.fe]) { f.animT += dt; f.shake = Math.max(0, f.shake - dt); f.flash = Math.max(0, f.flash - dt); f.shield = Math.max(0, f.shield - dt); }
    this.sceneShake = Math.max(0, this.sceneShake - dt * 2);
    this.floats = this.floats.filter((f) => { f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; return f.age < f.life; });
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.dim += ((this.mode.indexOf('event') === 0 ? 0.55 : 0) - this.dim) * Math.min(1, dt * 6);

    switch (this.mode) {
      case 'intro': this.introT -= dt; if (this.introT <= 0) this.startFight(); break;
      case 'dialogue': this.updateDialogue(dt); break;
      case 'busy': this.updateBeats(dt); break;
      case 'menu': this.updateMenu(); break;
      case 'eventIntro': this.ev.t += dt; if (this.ev.t > 1.0) { this.mode = 'eventAsk'; this.ev.t = 0; } break;
      case 'eventAsk': this.updateEventAsk(dt); break;
      case 'eventResult': this.updateEventResult(dt); break;
      case 'ending': this.updateEnding(dt); break;
      case 'won': case 'lost': this.updateResultScreen(dt); break;
    }
  }

  // ---------------- dialogue (intro / victory lines from text_ch2.js) ----------------
  updateDialogue(dt) {
    const d = this.dlg; d.t += dt;
    const full = d.lines[d.idx].length / 38;
    if (Input.key('Enter') || Input.key('Space') || Input.pointer.pressed) {
      if (d.t < full) d.t = full;
      else { Sfx.play('ui'); d.idx++; d.t = 0; if (d.idx >= d.lines.length) { this.dlg = null; d.onDone && d.onDone(); } }
    }
  }

  // ---------------- beats ----------------
  updateBeats(dt) {
    if (!this.cur) {
      if (!this.queue.length) { if (this.engine.phase === 'player') { this.mode = 'menu'; this.focus = 0; this.skillMode = false; } return; }
      this.startBeat(this.queue.shift());
    }
    const c = this.cur; if (!c) return;
    c.t += dt * ((Input.key('Enter') || Input.key('Space') || Input.pointer.pressed) ? 8 : 1);      // press = fast-forward
    this.tickBeat(c);
    if (c.t >= c.dur) { this.finishBeat(c); if (this.cur === c) this.cur = null; }
  }

  lineFor(b) {
    const who = this.names.enemy;
    switch (b.type) {
      case 'move': return b.side === 'player' ? BU('logMovePlayer', { name: b.name }) : BU('logMoveEnemy', { who, name: b.name });
      case 'heal': return b.to === 'player' ? BU('logHealPlayer', { amount: b.amount }) : BU('logHealEnemy', { who, amount: b.amount });
      case 'defend': return BU('logDefend');
      case 'skip': return b.side === 'player' ? BU('logSkipPlayer') : BU('logSkipEnemy', { who });
      case 'status': return b.status.label ? BU('logStatus', { who: b.to === 'player' ? this.names.you : who, label: b.status.label }) : '';
      case 'text': return b.text || '';
      case 'event': return BU('logEvent', { who });
      case 'phase': return b.name ? BU('logPhase', { who, name: b.name }) : '';
      case 'turn': return BU('yourTurn');
    }
    return '';
  }
  addLog(t) { if (!t) return; this.log.push(t); const n = this.data.tuning.maxLogLines || 4; while (this.log.length > n) this.log.shift(); }

  startBeat(b) {
    const c = { b, t: 0, dur: 0.3, hit: false }; this.cur = c;
    const snap = b.snap || null;
    const applySnap = () => { if (snap) { this.tgt.php = snap.php; this.tgt.ehp = snap.ehp; this.tgt.sp = snap.sp; } };
    const ln = this.lineFor(b); if (ln) this.addLog(ln);
    switch (b.type) {
      case 'turn': c.dur = 0.35; applySnap(); this.intent = b.intent; this.turnNo = b.n; this.fp.anim = 'idle'; this.fe.anim = 'idle'; break;
      case 'move': c.dur = 0.8; applySnap(); this.banner = { text: b.name, sub: '', t: 0, life: 0.8, color: b.side === 'player' ? SB_C.okDark : SB_C.badDark }; Sfx.play('ui'); break;
      case 'strike': c.dur = 0.95; c.proj = !!(b.vfx && b.vfx !== 'hit' && b.from === 'player'); break;
      case 'heal': c.dur = 0.75; applySnap(); this.heartsAt(b.to); Sfx.play('heart'); this.pop(b.to, '+' + b.amount, SB_C.okDark); break;
      case 'defend': c.dur = 0.7; applySnap(); this.fp.shield = 0.9; this.fp.anim = 'defend'; this.fp.animT = 0; Sfx.play('checkpoint'); break;
      case 'status': c.dur = 0.6; applySnap(); this.statusPop(b); break;
      case 'sp': c.dur = 0.15; applySnap(); break;
      case 'skip': c.dur = 0.9; applySnap(); this.pop(b.side, 'zzz', '#8a7a9d'); Sfx.play('land'); break;
      case 'text': c.dur = 0.8; applySnap(); break;
      case 'phase': {                                          // boss đổi phase: biểu ngữ + rung màn hình + lời dẫn (nếu có)
        c.dur = 1.4; applySnap(); this.sceneShake = 1; this.fe.flash = 0.5; Sfx.play('win');
        this.banner = { text: b.name, sub: BU('phase') + ' ' + b.index + '/' + b.total, t: 0, life: 1.4, big: true, color: SB_C.badDark };
        const lines = (this.texts[b.textKey] || []).filter((x) => x && x.trim());
        if (lines.length) this.sayLines(lines, () => { this.mode = 'busy'; });
        break;
      }
      case 'event': this.startEvent(b.event); break;           // pauses the queue (mode changes)
      case 'end': c.dur = 0.4; applySnap(); this.beginEnding(b); break;
      default: c.dur = 0.1;
    }
  }

  tickBeat(c) {
    const b = c.b, t = c.t;
    if (b.type !== 'strike') return;
    const dir = b.from === 'player' ? 1 : -1, att = b.from === 'player' ? this.fp : this.fe, tar = b.to === 'player' ? this.fp : this.fe;
    const rush = 0.32;
    if (t < rush) { att.ox = c.proj ? 0 : dir * 62 * ease.out(t / rush); att.anim = c.proj ? 'cast' : 'lunge'; }
    else att.ox = c.proj ? 0 : dir * 62 * (1 - ease.io(Math.min(1, (t - rush) / 0.5)));
    if (!c.hit && t >= rush) { c.hit = true; this.impact(b, tar); }
    if (t >= 0.62) { att.anim = 'idle'; att.ox = 0; }
    if (c.hit && t > 0.55 && tar.anim === 'hit') tar.anim = 'idle';
  }

  impact(b, tar) {
    const snap = b.snap; this.tgt.php = snap.php; this.tgt.ehp = snap.ehp; this.tgt.sp = snap.sp;
    const x = b.to === 'player' ? 84 : 238, y = 62;
    if (b.amount > 0) {
      tar.shake = 0.35; tar.flash = 0.18; tar.anim = 'hit'; tar.animT = 0; this.sceneShake = Math.min(1, 0.35 + b.amount / 40);
      Fx.burst(x, y + 10, b.vfx === 'sparkles' ? ['#ff8cb4', '#ffd65a', '#96d0ff', '#c8aaff'] : (b.vfx === 'letters' ? ['#96d0ff', '#fff4e6'] : ['#fff4e6', '#ffd65a']), 12, 70);
      this.pop(b.to, '-' + b.amount, b.blocked ? '#4a8fd0' : SB_C.bad);
      if (b.blocked) { this.pop(b.to, BU('blocked'), '#4a8fd0', -9); (b.to === 'player' ? this.fp : this.fe).shield = 0.5; }
      Sfx.play(b.to === 'player' ? 'land' : 'heart');
    } else { this.pop(b.to, '0', '#8a7a9d'); Sfx.play('land'); }
  }

  finishBeat(c) {
    const b = c.b;
    if (b.type === 'strike') {
      if (!c.hit) this.impact(b, b.to === 'player' ? this.fp : this.fe);
      this.fp.ox = 0; this.fe.ox = 0; if (this.fp.anim !== 'defend') this.fp.anim = 'idle'; this.fe.anim = 'idle';
    }
    if (b.type === 'defend') this.fp.anim = 'idle';
  }

  pop(side, str, color, dy) { Fx.text(side === 'player' ? 84 : 238, 56 + (dy || 0), str, color); }
  heartsAt(side) { for (let i = 0; i < 6; i++) this.floats.push({ kind: 'heart', x: (side === 'player' ? 84 : 238) + (Math.random() - 0.5) * 36, y: 92 + Math.random() * 6, vx: 0, vy: -26 - Math.random() * 14, age: 0, life: 0.9 + Math.random() * 0.3 }); }
  statusPop(b) {
    const nm = SB_STATUS_NAME[b.status.stat] || b.status.stat;
    this.pop(b.to, b.status.stat === 'skip' ? 'ZZZ' : nm + (b.kind === 'buff' ? ' +' : ' -'), b.kind === 'buff' ? SB_C.okDark : SB_C.badDark, -4);
    Sfx.play(b.kind === 'buff' ? 'checkpoint' : 'land');
  }

  // ---------------- player menu ----------------
  menuButtons() {
    const e = this.engine;
    if (this.skillMode) {
      const b = [];
      e.skills.forEach((s, i) => b.push({ id: 'skill:' + s.id, x: 10 + (i % 2) * 90, y: 134 + Math.floor(i / 2) * 21, w: 86, h: 20, label: s.name, icon: s.icon, enabled: e.player.sp >= s.cost, cost: s.cost, skill: s }));
      b.push({ id: 'back', x: 148, y: 118, w: 40, h: 14, label: BMenu('back'), icon: null });
      return b;
    }
    return [
      { id: 'attack', x: 10, y: 122, w: 88, h: 22, label: BMenu('attack'), icon: 'wave' },
      { id: 'skill', x: 102, y: 122, w: 88, h: 22, label: BMenu('skill'), icon: 'sparkle', enabled: e.skills.length > 0 },
      { id: 'defend', x: 10, y: 148, w: 88, h: 22, label: BMenu('defend'), icon: 'lock' },
      { id: 'focus', x: 102, y: 148, w: 88, h: 22, label: BMenu('focus'), icon: 'heart' }
    ];
  }

  navigate(list, cols) {
    const n = list.length; if (!n) return;
    const dx = (Input.wasPressed('ArrowRight') || Input.key('KeyD') ? 1 : 0) - (Input.wasPressed('ArrowLeft') || Input.key('KeyA') ? 1 : 0);
    const dy = (Input.wasPressed('ArrowDown') || Input.key('KeyS') ? 1 : 0) - (Input.wasPressed('ArrowUp') || Input.key('KeyW') ? 1 : 0);
    if (!dx && !dy) return;
    let i = this.focus, tries = n;
    do { i = (((i + dx + dy * cols) % n) + n) % n; tries--; } while (list[i].enabled === false && tries > 0);
    this.focus = i; Sfx.play('ui');
  }

  updateMenu() {
    const btns = this.menuButtons(), main = btns.filter((b) => b.id !== 'back');
    this.focus = Math.min(this.focus, main.length - 1);
    this.navigate(main, 2);
    let id = UIManager.click(btns);
    if (!id && (Input.key('Enter') || Input.key('Space')) && main[this.focus] && main[this.focus].enabled !== false) id = main[this.focus].id;
    main.forEach((b, i) => { if (Input.key('Digit' + (i + 1)) && b.enabled !== false) id = b.id; });
    if (this.skillMode && (Input.key('KeyB') || Input.key('Backspace'))) id = 'back';
    if (!id) return;
    if (id === 'back') { this.skillMode = false; this.focus = 1; Sfx.play('ui'); return; }
    if (id === 'skill') { this.skillMode = true; this.focus = 0; Sfx.play('ui'); return; }
    const action = id.indexOf('skill:') === 0 ? { type: 'skill', id: id.slice(6) } : { type: id };
    const beats = this.engine.act(action);
    if (!beats) { Sfx.play('land'); return; }
    this.skillMode = false; this.mode = 'busy'; this.pushBeats(beats);
  }

  // ---------------- conversation events ----------------
  startEvent(ev) {
    this.ev = { view: ev, t: 0, result: null };
    this.mode = 'eventIntro'; this.queue.length = 0;           // nothing may run while the conversation is open
    this.fe.anim = 'talk'; this.fe.animT = 0; this.focus = 0;
    Sfx.play('checkpoint'); this.sceneShake = 0.3;
    this.banner = { text: BU('eventStart'), sub: '', t: 0, life: 1.0, color: SB_C.badDark, big: true };
    this.cur = null;
  }

  evTexts() { const v = this.ev.view; return [v.situation, v.prompt || BU('pickAnswer')].filter(Boolean); }

  choiceButtons() {
    const ch = this.ev.view.choices, n = ch.length, cols = n <= 3 ? 1 : 2, rows = Math.ceil(n / cols);
    const top = 66, area = 106, gap = 4, h = Math.min(44, Math.floor((area - (rows - 1) * gap) / rows)), w = cols === 1 ? 296 : 146;
    return ch.map((c, i) => ({ id: c.id, x: 12 + (i % cols) * (w + 4), y: top + Math.floor(i / cols) * (h + gap), w, h, choice: c, idx: i, cols }));
  }

  updateEventAsk(dt) {
    const ev = this.ev; ev.t += dt;
    const total = this.evTexts().join('\n').length;
    if (ev.t * 80 < total) { if (Input.key('Enter') || Input.key('Space') || Input.pointer.pressed) ev.t = total / 80; return; }
    if (ev.t < total / 80 + 0.25) return;                       // short pause so a tap cannot select by accident
    const btns = this.choiceButtons();
    this.navigate(btns, btns[0].cols);
    let pick = UIManager.click(btns);
    if (!pick && (Input.key('Enter') || Input.key('Space'))) pick = btns[Math.min(this.focus, btns.length - 1)].id;
    btns.forEach((b, i) => { if (Input.key('Digit' + (i + 1))) pick = b.id; });
    if (!pick) return;
    const r = this.engine.answer(pick);
    if (!r) return;
    ev.result = r; ev.t = 0; this.mode = 'eventResult';
    if (r.correct) { Sfx.play('win'); Fx.confetti(14); Fx.burst(238, 70, ['#8fd3a8', '#ffd65a', '#fff4e6'], 14, 70); this.fe.anim = 'happy'; }
    else { Sfx.play('land'); this.sceneShake = 0.6; this.fe.anim = 'shy'; }
  }

  updateEventResult(dt) {
    const ev = this.ev; ev.t += dt;
    if (ev.t > 0.5 && (Input.key('Enter') || Input.key('Space') || Input.pointer.pressed)) {
      Sfx.play('ui');
      const beats = this.engine.finishEvent();
      this.ev = null; this.fe.anim = 'idle'; this.mode = 'busy'; this.cur = null; this.pushBeats(beats);
    }
  }

  // ---------------- end of battle ----------------
  beginEnding(b) {
    this.result = b.summary; this.endT = 0; this.queue.length = 0;
    this.addLog(b.result === 'won' ? BU('logWin') : BU('logLose'));
    this.mode = 'ending'; this.endResult = b.result;
    if (b.result === 'won') { Sfx.play('win'); Fx.confetti(60); for (let i = 0; i < 12; i++) this.heartsAt('enemy'); }
    else Sfx.play('land');
  }

  updateEnding(dt) {
    this.endT += dt;
    if (this.endResult === 'won' && Math.random() < 0.25) this.heartsAt('enemy');
    if (this.endT > 1.6) {
      const lines = (this.endResult === 'won' ? this.texts.victory : this.texts.defeat) || [];
      const go = () => { this.mode = this.endResult; this.endT = 0; this.focus = 0; };
      if (lines.length) this.sayLines(lines, go); else go();
    }
  }

  resultButtons() {
    if (this.mode === 'won') return [{ id: 'continue', x: 110, y: 148, w: 100, h: 22, label: BU('cont'), icon: 'follow' }];
    return [{ id: 'retry', x: 62, y: 148, w: 92, h: 22, label: BU('retry'), icon: 'undo' }, { id: 'leave', x: 166, y: 148, w: 92, h: 22, label: BU('leave'), icon: 'back' }];
  }

  updateResultScreen(dt) {
    this.endT += dt;
    if (this.mode === 'won' && Math.random() < 0.1) this.heartsAt('enemy');
    if (this.endT < 0.5) return;
    const btns = this.resultButtons();
    let id = UIManager.click(btns);
    if (!id && (Input.key('Enter') || Input.key('Space'))) id = btns[Math.min(this.focus, btns.length - 1)].id;
    if (btns.length > 1 && (Input.wasPressed('ArrowLeft') || Input.wasPressed('ArrowRight'))) { this.focus = 1 - this.focus; Sfx.play('ui'); }
    if (Input.key('KeyR') && this.mode === 'lost') id = 'retry';
    if (!id) return;
    Sfx.play('ui');
    if (id === 'retry') { this.resetBattle(); return; }
    this.finishBattle();
  }

  finishBattle() {
    const s = this.result || this.engine.summary(), won = this.mode === 'won';
    const stars = won ? s.stars : 0, gain = (this.lcfg.gain === undefined ? 10 : this.lcfg.gain) + (this.lcfg.gain === 0 ? 0 : 2 * stars);
    this.finish({ score: s.score, stars, stats: won ? this.winStats(gain) : {}, detail: this.detailLine(s) });
  }

  // ============================================================ render
  sprite(ctx, key, frame, x, feetY, scale, flip, white) {
    const img = Assets.get(key);
    if (!img) { ctx.fillStyle = '#ff8cb4'; ctx.fillRect(Math.round(x - 12), Math.round(feetY - 40), 24, 40); return; }
    const sz = 32 * scale, dx = Math.round(x - sz / 2), dy = Math.round(feetY - sz);
    let src = img, sx = frame * 32;
    if (white) { src = this.silhouette(key, frame); sx = 0; }
    if (flip) { ctx.save(); ctx.translate(dx + sz, 0); ctx.scale(-1, 1); ctx.drawImage(src, sx, 0, 32, 32, 0, dy, sz, sz); ctx.restore(); }
    else ctx.drawImage(src, sx, 0, 32, 32, dx, dy, sz, sz);
  }
  silhouette(key, frame) {
    const id = key + '#' + frame; if (this.sil[id]) return this.sil[id];
    const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(Assets.get(key), frame * 32, 0, 32, 32, 0, 0, 32, 32); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 32);
    return (this.sil[id] = c);
  }

  playerFrame() {
    const f = this.fp, t = f.animT;
    switch (f.anim) {
      case 'lunge': return 2 + Math.floor(t * 14) % 4;
      case 'cast': return 6 + Math.min(2, Math.floor(t * 10));
      case 'hit': case 'defend': case 'down': return 9;
      case 'happy': return 6 + (Math.floor(t * 6) % 3);
      default: return Math.floor(t * 2) % 2;
    }
  }
  enemyFrame() {
    const f = this.fe, t = f.animT;
    switch (f.anim) {
      case 'lunge': return 6 + Math.floor(t * 10) % 3;
      case 'cast': return 6 + Math.floor(t * 8) % 3;
      case 'hit': case 'shy': return 11 + (Math.floor(t * 6) % 2);
      case 'talk': return 6 + Math.floor(t * 6) % 3;
      case 'happy': return 9 + (Math.floor(t * 6) % 2);
      default: return Math.floor(t * 2) % 2;
    }
  }

  render(ctx) {
    const e = this.engine; if (!e) return;
    const won = this.mode === 'won' || (this.mode === 'ending' && this.endResult === 'won') || (this.mode === 'dialogue' && this.endResult === 'won' && e.phase === 'won');
    const lost = this.mode === 'lost' || (this.mode === 'ending' && this.endResult === 'lost') || (this.mode === 'dialogue' && e.phase === 'lost');
    ctx.save();
    if (this.sceneShake > 0) ctx.translate(Math.round(Math.sin(this.t * 90) * this.sceneShake * 3), Math.round(Math.cos(this.t * 77) * this.sceneShake * 2));
    this.drawScene(ctx, won, lost);
    ctx.restore();
    Fx.draw(ctx, 0, 0);
    this.drawFloats(ctx);
    this.drawTopPanels(ctx);
    const inEvent = this.mode === 'eventIntro' || this.mode === 'eventAsk' || this.mode === 'eventResult';
    if (!inEvent) { this.drawIntent(ctx); this.drawBottom(ctx); }
    if (this.dim > 0.02) { ctx.fillStyle = 'rgba(40,26,64,' + this.dim.toFixed(3) + ')'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT); }
    if (this.mode === 'eventIntro' || this.mode === 'eventAsk' || this.mode === 'eventResult') this.drawEvent(ctx);
    if (this.banner) this.drawBanner(ctx);
    if (this.mode === 'dialogue' && this.dlg) UI.dialogue(ctx, this.dlg, this.t);
    if (this.mode === 'won' || this.mode === 'lost') this.drawResult(ctx);
    if (Game.debug) this.drawDebug(ctx);
  }

  drawScene(ctx, won, lost) {
    Renderer.drawBackground(ctx, 0, this.t);
    ctx.fillStyle = '#b6e3b0'; ctx.fillRect(0, 100, CONFIG.WIDTH, 16); ctx.fillStyle = '#93cf9e'; ctx.fillRect(0, 100, CONFIG.WIDTH, 2);
    ctx.fillStyle = '#a4d9a6'; for (let i = 0; i < 12; i++) ctx.fillRect((i * 29 + 7) % 320, 104 + (i % 3) * 4, 6, 1);
    ctx.fillStyle = 'rgba(58,42,77,0.2)'; ctx.beginPath(); ctx.ellipse(84, 105, 26, 4, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(238, 105, 26, 4, 0, 0, 6.283); ctx.fill();
    // opponent (flipped: faces left); the "barrier" is a soft bubble that shrinks with its HP
    const bub = Math.max(0, Math.min(1, this.shown.ehp / this.engine.enemy.maxHp));
    const f = this.fe, ex = 238 + f.ox + (f.shake > 0 ? Math.sin(f.shake * 80) * 3 : 0);
    const ey = 104 + (won ? -Math.abs(Math.sin(this.endT * 5)) * 8 : 0);
    if (bub > 0.01 && !won) {
      ctx.globalAlpha = 0.14 + 0.2 * bub; ctx.fillStyle = '#c8aaff'; ctx.beginPath(); ctx.ellipse(238, 76, 24 + 6 * bub, 32 + 4 * bub, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(238, 76, 24 + 6 * bub, 32 + 4 * bub, 0, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (won) this.fe.anim = 'happy';
    const efr = this.enemyFrame();
    this.sprite(ctx, this.enemySheet, efr, ex, ey, 2, true, false);
    if (f.flash > 0) { ctx.globalAlpha = Math.min(1, f.flash * 6); this.sprite(ctx, this.enemySheet, efr, ex, ey, 2, true, true); ctx.globalAlpha = 1; }
    if (f.shield > 0) this.drawShield(ctx, 238, 76, f.shield);
    // player
    const p = this.fp, px = 84 + p.ox + (p.shake > 0 ? Math.sin(p.shake * 80) * 3 : 0);
    const py = 104 + (won ? -Math.abs(Math.sin(this.endT * 6 + 1)) * 8 : 0) + (lost ? 3 : 0);
    if (won) p.anim = 'happy';
    if (lost) p.anim = 'down';
    const pfr = this.playerFrame();
    this.sprite(ctx, this.playerSheet, pfr, px, py, 2, false, false);
    if (p.flash > 0) { ctx.globalAlpha = Math.min(1, p.flash * 6); this.sprite(ctx, this.playerSheet, pfr, px, py, 2, false, true); ctx.globalAlpha = 1; }
    if (p.shield > 0 || this.engine.hasStatus('player', 'guard')) this.drawShield(ctx, 84, 76, Math.max(p.shield, 0.4));
    const c = this.cur;
    if (c && c.b.type === 'strike' && c.proj && c.t < 0.34) this.drawProjectile(ctx, c.b.vfx, c.t / 0.32, 100, 238);
  }

  drawShield(ctx, x, y, a) {
    ctx.globalAlpha = Math.min(0.55, a * 0.9); ctx.fillStyle = '#bfe3ff'; ctx.beginPath(); ctx.ellipse(x, y, 25, 30, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = Math.min(0.9, a * 1.5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 25, 30, 0, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1;
  }

  drawProjectile(ctx, vfx, p, x0, x1) {
    const q = ease.out(Math.min(1, p));
    for (let i = 0; i < 5; i++) {
      const qq = Math.max(0, q - i * 0.05), xx = x0 + (x1 - x0) * qq, yy = 80 - Math.sin(qq * Math.PI) * 20;
      ctx.globalAlpha = 1 - i * 0.18;
      if (vfx === 'hearts') UIManager.icon(ctx, 'heart', xx - 8, yy - 8, 1);
      else if (vfx === 'letters') Text.draw(ctx, 'ABC?!'[i], xx, yy - 4, { color: ['#4a8fd0', '#ff8cb4', '#3f8f5f', '#c44d7a', '#6b4a8f'][i], shadow: '#fff', align: 'center' });
      else { ctx.fillStyle = ['#ff8cb4', '#ffd65a', '#96d0ff', '#8fd3a8', '#c8aaff'][i]; const sz = i > 2 ? 3 : 4; ctx.fillRect(Math.round(xx) - 2, Math.round(yy) - 2, sz, sz); }
    }
    ctx.globalAlpha = 1;
  }

  drawFloats(ctx) {
    for (const f of this.floats) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (f.life - f.age) * 2.5));
      if (f.kind === 'heart') UIManager.icon(ctx, 'heart', f.x - 8, f.y - 8, 1);
    }
    ctx.globalAlpha = 1;
  }

  hpBar(ctx, x, y, w, h, val, trail, max, color, ticks) {
    ctx.fillStyle = SB_C.ink; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e9dff0'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const iw = w - 2, frac = (v) => Math.max(0, Math.min(1, v / max));
    ctx.fillStyle = '#ffd0dc'; ctx.fillRect(x + 1, y + 1, Math.round(iw * frac(trail)), h - 2);
    ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.round(iw * frac(val)), h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1, y + 1, Math.round(iw * frac(val)), 1);
    if (ticks) for (const t of ticks) {                       // conversation thresholds: dark tick = still to come, gold = done
      const tx = x + 1 + Math.round(iw * t.at);
      ctx.fillStyle = t.fired ? '#ffd65a' : SB_C.ink; ctx.fillRect(tx, y - (t.fired ? 2 : 1), 1, h + (t.fired ? 4 : 2));
      if (t.fired) { ctx.fillStyle = SB_C.ink; ctx.fillRect(tx - 1, y - 3, 3, 1); }
    }
  }

  statusChips(ctx, side, x, y) {
    const T = this.engine._who(side); let cx = x;
    for (const s of T.statuses) {
      const nm = SB_STATUS_NAME[s.stat] || s.stat, good = s.stat === 'guard' || (s.stat !== 'skip' && s.mult >= 1);
      const lab = s.stat === 'skip' || s.stat === 'guard' ? nm : nm + (good ? '+' : '-');
      const w = Text.width(lab) + 5;
      ctx.fillStyle = SB_C.ink; ctx.fillRect(cx, y, w, 9); ctx.fillStyle = good ? '#cdf2da' : '#ffd0d8'; ctx.fillRect(cx + 1, y + 1, w - 2, 7);
      Text.draw(ctx, lab, cx + 3, y + 1, { color: good ? SB_C.okDark : SB_C.badDark });
      cx += w + 2;
    }
  }

  drawTopPanels(ctx) {
    const e = this.engine, s = this.shown, act = this.mode === 'busy' && this.cur && this.cur.b.type === 'move' ? this.cur.b.side : null;
    UI.panel(ctx, 4, 4, 140, 40, act === 'enemy' ? '#fff0f6' : UI.C.cream);
    Text.draw(ctx, this.names.enemy, 10, 9, { color: SB_C.ink });
    Text.draw(ctx, BU('barrier'), 10, 21, { color: '#8a7a9d' });
    Text.draw(ctx, Math.max(0, Math.round(s.ehp)) + '/' + e.enemy.maxHp, 138, 21, { color: '#8a7a9d', align: 'right' });
    this.hpBar(ctx, 10, 32, 128, 6, s.ehp, s.etrail, e.enemy.maxHp, SB_C.bar, e.thresholds.map((t) => ({ at: t.at, fired: t.fired })));
    this.statusChips(ctx, 'enemy', 8, 46);
    UI.panel(ctx, 147, 4, 30, 22, '#fff');
    Text.draw(ctx, BU('turn'), 162, 8, { align: 'center', color: '#8a7a9d' });
    Text.draw(ctx, String(this.turnNo), 162, 17, { align: 'center', color: SB_C.ink });
    UI.panel(ctx, 180, 4, 116, 40, act === 'player' ? '#eaf8ee' : UI.C.cream);
    Text.draw(ctx, this.names.you, 186, 9, { color: SB_C.ink });
    Text.draw(ctx, Math.max(0, Math.round(s.php)) + '/' + e.player.maxHp, 290, 9, { color: '#8a7a9d', align: 'right' });
    this.hpBar(ctx, 186, 21, 104, 6, s.php, s.ptrail, e.player.maxHp, s.php / e.player.maxHp < 0.3 ? SB_C.hpLow : SB_C.hp);
    Text.draw(ctx, BU('sparks'), 186, 31, { color: '#8a7a9d' });
    for (let i = 0; i < this.data.tuning.maxSp; i++) { const on = i < Math.round(s.sp); ctx.fillStyle = SB_C.ink; ctx.fillRect(208 + i * 13, 32, 11, 7); ctx.fillStyle = on ? SB_C.sp : '#e9dff0'; ctx.fillRect(209 + i * 13, 33, 9, 5); }
    this.statusChips(ctx, 'player', 182, 46);
  }

  drawIntent(ctx) {
    if (this.mode !== 'menu' || !this.intent) return;
    const txt = BU('next') + ': ' + this.intent.name, w = Text.width(txt) + (this.intent.icon ? 26 : 12);
    const x = Math.round(Math.min(316 - w, 238 - w / 2)), y = 50;
    UI.panel(ctx, x, y, w, 16, '#fff');
    let tx = x + 6; if (this.intent.icon) { UIManager.icon(ctx, this.intent.icon, x + 3, y, 1); tx = x + 21; }
    Text.draw(ctx, txt, tx, y + 5, { color: SB_C.badDark });
  }

  drawBottom(ctx) {
    UI.panel(ctx, 4, 114, 192, 64); UI.panel(ctx, 200, 114, 116, 64);
    const menu = this.mode === 'menu', maxLines = menu ? 3 : 5;
    const flat = []; this.log.forEach((l, i, a) => UIManager.wrap(l, 104).forEach((w) => flat.push({ w, cur: i === a.length - 1 })));
    let y = menu ? 150 : 120;
    flat.slice(-maxLines).forEach((o) => { Text.draw(ctx, o.w, 206, y, { color: o.cur ? SB_C.ink : '#8a7a9d' }); y += 9; });
    if (!menu) return;
    ctx.fillStyle = '#e9dff0'; ctx.fillRect(206, 146, 104, 1);
    const btns = this.menuButtons(), main = btns.filter((b) => b.id !== 'back');
    main.forEach((b, i) => { b.selected = i === this.focus; });
    if (this.skillMode) Text.draw(ctx, BMenu('skill'), 12, 121, { color: SB_C.ink });
    btns.forEach((b) => {
      UIManager.drawButton(ctx, b);
    });
    const hov = btns.find((b) => UIManager.hover(b)) || main[this.focus];
    let desc = '';
    if (hov) desc = hov.skill ? (hov.skill.desc || '') : (hov.id === 'back' ? '' : BDesc(hov.id));
    let dy = 120;
    if (hov && hov.skill) { Text.draw(ctx, BU('sparks') + ' ' + hov.skill.cost, 206, dy, { color: this.engine.player.sp >= hov.skill.cost ? '#c8941a' : SB_C.badDark }); dy += 9; }
    UIManager.wrap(desc, 104).slice(0, hov && hov.skill ? 2 : 3).forEach((w, i) => Text.draw(ctx, w, 206, dy + i * 9, { color: '#8a7a9d' }));
  }

  drawBanner(ctx) {
    const b = this.banner, k = Math.min(1, b.t * 6, (b.life - b.t) * 6); if (k <= 0) return;
    ctx.globalAlpha = Math.max(0, k);
    if (b.big) {
      const w = Math.max(130, Text.width(b.text, 2) + 30), x = Math.round(160 - w / 2), y = 74 - Math.round((1 - Math.min(1, b.t * 5)) * 10);
      UI.panel(ctx, x, y, w, b.sub ? 40 : 26, '#fff8ee');
      Text.draw(ctx, b.text, 160, y + 6, { align: 'center', scale: 2, color: b.color || '#c44d7a' });
      if (b.sub) Text.draw(ctx, b.sub, 160, y + 27, { align: 'center', color: '#8a7a9d' });
    } else {
      const w = Text.width(b.text) + 16, x = Math.round(160 - w / 2);
      UI.panel(ctx, x, 70, w, 16, '#fff');
      Text.draw(ctx, b.text, 160, 75, { align: 'center', color: b.color || SB_C.ink });
    }
    ctx.globalAlpha = 1;
  }

  topicIcon(ctx, topic, x, y) {
    const t = this.topics[topic] || { icon: 'question' };
    if (t.pixel && SB_PIXEL[t.pixel]) {
      const rows = SB_PIXEL[t.pixel];
      for (let r = 0; r < rows.length; r++) for (let c = 0; c < 12; c++) { const ch = rows[r][c]; if (ch && ch !== '.') { ctx.fillStyle = SB_PIXEL.palette[ch] || '#000'; ctx.fillRect(x + 2 + c, y + 3 + r, 1, 1); } }
    } else if (t.vocab) UIManager.vocab(ctx, t.vocab, x, y, 1);
    else UIManager.icon(ctx, t.icon || 'question', x, y, 1);
  }

  drawEvent(ctx) {
    const ev = this.ev; if (!ev) return;
    const v = ev.view;
    if (this.mode === 'eventIntro') {                         // "!" above the opponent while the conversation starts
      const k = Math.min(1, ev.t * 3); ctx.globalAlpha = k;
      UI.panel(ctx, 226, 26 - Math.round((1 - k) * 8), 24, 20, '#fff'); UIManager.icon(ctx, 'exclaim', 230, 26 - Math.round((1 - k) * 8), 1);
      ctx.globalAlpha = 1; return;
    }
    const res = this.mode === 'eventResult' ? ev.result : null;
    UI.panel(ctx, 6, 4, 288, 58, res ? (res.correct ? '#eaf8ee' : '#fff0f2') : UI.C.cream, res ? (res.correct ? SB_C.okDark : SB_C.badDark) : SB_C.ink);
    ctx.fillStyle = '#e9dff0'; ctx.fillRect(12, 10, 36, 36);
    const frame = res ? (res.correct ? 9 + Math.floor(ev.t * 6) % 2 : 11) : 6 + Math.floor(this.t * 6) % 3;
    this.sprite(ctx, this.enemySheet, frame, 30, 46, 1, true, false);
    Text.draw(ctx, BU('conversation') + ' ' + (v.index + 1) + '/' + v.total, 12, 50, { color: '#8a7a9d' });
    if (!res) {
      const parts = [v.situation, v.prompt || BU('pickAnswer')].filter(Boolean);
      let chars = Math.floor(ev.t * 80), y = 11;
      parts.forEach((p, i) => UIManager.wrap(p, 224).forEach((l) => { Text.draw(ctx, l, 56, y, { color: i === 0 && parts.length > 1 ? '#8a7a9d' : SB_C.ink, chars }); chars -= l.length + 1; y += 10; }));
      if (v.placeholder && Game.debug) Text.draw(ctx, BU('placeholder'), 288, 54, { color: '#c8941a', align: 'right' });
    } else {
      Text.draw(ctx, res.correct ? BU('correct') : BU('wrong'), 56, 10, { scale: 2, color: res.correct ? SB_C.okDark : SB_C.badDark });
      let ty = 36; if (res.icon) UIManager.icon(ctx, res.icon, 56, 31, 1);
      UIManager.wrap(res.label, 210).slice(0, 2).forEach((l) => { Text.draw(ctx, l, res.icon ? 76 : 56, ty, { color: SB_C.ink }); ty += 9; });
      const stock = [BU('correct'), BU('wrong'), BATTLE_TEXT_DEFAULT.correct, BATTLE_TEXT_DEFAULT.wrong];
      if (res.feedback && !stock.includes(res.feedback)) UIManager.wrap(res.feedback, 150).slice(0, 1).forEach((l) => Text.draw(ctx, l, 56, 52, { color: '#8a7a9d' }));
      if (ev.t > 0.5 && UI.blink(this.t * 1.5)) Text.draw(ctx, BU('cont') + ' >', 288, 52, { color: '#c44d7a', align: 'right' });
    }
    if (!res && ev.t * 80 < this.evTexts().join('\n').length) return;      // answers appear when the text is typed
    const btns = this.choiceButtons();
    btns.forEach((b, i) => {
      const asking = this.mode === 'eventAsk', hov = asking && UIManager.hover(b), foc = asking && i === this.focus;
      let fill = hov ? '#ffffff' : (foc ? '#ffe9f2' : UI.C.cream), border = SB_C.ink, alpha = 1, dy = 0;
      if (res) {
        const isRight = res.correctIds.includes(b.id), chosen = res.chosen === b.id;
        if (isRight) { fill = '#cdf2da'; border = SB_C.okDark; } else if (chosen) { fill = '#ffd0d8'; border = SB_C.badDark; dy = Math.round(Math.sin(ev.t * 60) * Math.max(0, 1 - ev.t * 3) * 2); } else alpha = 0.55;
      }
      ctx.globalAlpha = alpha;
      UI.panel(ctx, b.x + dy, b.y, b.w, b.h, fill, border);
      Text.draw(ctx, String(i + 1), b.x + 4 + dy, b.y + 3, { color: '#8a7a9d' });
      this.topicIcon(ctx, b.choice.topic, b.x + 8 + dy, b.y + Math.floor((b.h - 16) / 2));
      const lines = UIManager.wrap(b.choice.text, b.w - 38).slice(0, 4), th = lines.length * 10;
      lines.forEach((l, j) => Text.draw(ctx, l, b.x + 30 + dy, b.y + Math.floor((b.h - th) / 2) + 3 + j * 10, { color: SB_C.ink }));
      if (res && res.correctIds.includes(b.id)) UIManager.icon(ctx, 'check', b.x + b.w - 18 + dy, b.y + 1, 1);
      if (res && res.chosen === b.id && !res.correct) UIManager.icon(ctx, 'cross', b.x + b.w - 18 + dy, b.y + 1, 1);
      ctx.globalAlpha = 1;
    });
  }

  drawResult(ctx) {
    const won = this.mode === 'won', s = this.result || this.engine.summary();
    ctx.fillStyle = 'rgba(40,26,64,0.35)'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    UI.panel(ctx, 50, 30, 220, 110, '#fff8ee', won ? SB_C.okDark : SB_C.badDark);
    Text.draw(ctx, won ? BU('victory') : BU('defeat'), 160, 40, { align: 'center', scale: 2, color: won ? SB_C.okDark : SB_C.badDark });
    if (won) UIManager.stars(ctx, 160, 62, Math.min(3, Math.floor(this.endT / 0.35), s.stars), 3, 20);
    else UIManager.icon(ctx, 'wait', 152, 64, 1);
    Text.draw(ctx, this.names.enemy, 160, 90, { align: 'center', color: SB_C.ink });
    Text.draw(ctx, this.detailLine(s), 160, 104, { align: 'center', color: '#8a7a9d' });
    if (won) Text.draw(ctx, BU('hp') + ' ' + Math.round(s.hpFrac * 100) + '%', 160, 117, { align: 'center', color: '#8a7a9d' });
    this.resultButtons().forEach((b, i) => { b.selected = i === this.focus; UIManager.drawButton(ctx, b); });
  }

  drawDebug(ctx) {
    const e = this.engine, q = e.event && e.event.question;
    const line = 'mode ' + this.mode + ' phase ' + e.phase + ' turn ' + e.turn + ' thr ' + e.thresholds.map((t) => t.at + (t.fired ? '*' : '') + '@' + t.hp).join(' ') + ' q ' + (q ? q.id + (q.placeholder ? ' [PH]' : '') : '-');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 168, 320, 12);
    Text.draw(ctx, line, 2, 172, { color: '#fff' });
  }
}

class SocialBattleMinigame extends BattleMinigame {}
MinigameManager.register('friends', SocialBattleMinigame);
