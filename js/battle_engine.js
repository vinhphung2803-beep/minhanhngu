// ============================================================
// battle_engine.js - BattleEngine: the rules of the turn-based battle. NO drawing, NO input,
// no DOM - so it can be unit-tested in Node (tests/battle_engine_test.js) and reused by any
// battle (Chapter 2 Social Battle now, Chapter 3 later with a different data object).
//
// The engine is synchronous. Every public call changes the state at once and returns an array of
// BEATS (small "animation cues") that the screen (js/social_battle.js) plays one after another:
//   {type:'turn',   n, intent}            a new round starts (intent = what the opponent will do)
//   {type:'move',   side, name, icon}     someone announces a move
//   {type:'strike', from, to, name, amount, hpAfter, blocked, vfx}   damage
//   {type:'heal',   to, amount, hpAfter}
//   {type:'defend', side}   {type:'status', to, status, kind}   {type:'sp', amount, spAfter}
//   {type:'skip',   side}   {type:'text', text}
//   {type:'event',  event}                the battle PAUSES: a conversation event starts
//   {type:'end',    result:'won'|'lost', summary}
// Every beat has  snap = {php, ehp, sp}  (hp values after it) so the screen can never get out of sync.
//
// Flow:  start() -> act({type}) -> [event beat -> answer(id) -> finishEvent()] -> ... -> end beat
// Phases: 'player' (waiting for act) | 'event' (waiting for answer/finishEvent) | 'won' | 'lost'
// ============================================================
const BATTLE_TEXT_DEFAULT = {
  attack: 'Trò Chuyện Thân Thiện', defend: 'Phòng Thủ', focus: 'Tập Trung', counter: 'Phản Đòn',
  playerGuard: 'You get ready to listen.', focusText: 'You take a calm breath.',
  skipPlayer: 'You are lost for words and miss a turn!', skipEnemy: 'The barrier freezes for a moment!',
  noQuestion: 'No conversation topic was available.',
  correct: 'That is it!', wrong: 'Not quite...'
};
function BT(key) {
  const t = (typeof CH2_TEXT !== 'undefined' && CH2_TEXT.battle && CH2_TEXT.battle.log) || {};
  return t[key] || BATTLE_TEXT_DEFAULT[key] || '';
}

// small seedable random generator (mulberry32) so tests are reproducible
function makeRng(seed) {
  if (seed === undefined || seed === null) return Math.random;
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class BattleEngine {
  // levelCfg : one entry of SOCIAL_BATTLE.levels      data : SOCIAL_BATTLE (tuning, skills, rewards, penalties)
  // bank     : question array                         topics : SOCIAL_BATTLE_TOPICS
  // opts     : { seed, stats:{creativity,language,friendship}, aura (damage multiplier), level }
  constructor(levelCfg, data, bank, topics, opts) {
    opts = opts || {};
    this.cfg = levelCfg; this.data = data; this.tun = Object.assign({}, data.tuning);
    this.topics = topics || {}; this.level = opts.level || 1;
    this.rng = opts.rng || makeRng(opts.seed);
    this.stats = Object.assign({ creativity: 0, language: 0, friendship: 0 }, opts.stats || {});
    this.aura = opts.aura || 1;
    this.skills = (data.skills || []).slice(0, 4);
    this.problems = [];
    const checked = BattleEngine.validateBank(bank || [], this.topics);
    this.bank = checked.valid; this.problems = checked.problems.slice();

    const p = levelCfg.player || {}, e = levelCfg.enemy || {};
    this.player = { hp: p.hp || 100, maxHp: p.hp || 100, atk: p.atk || 10, sp: Math.min(this.tun.maxSp, opts.startSp === undefined ? (p.sp === undefined ? 2 : p.sp) : opts.startSp), statuses: [] };
    this.enemy = { hp: e.hp || 100, maxHp: e.hp || 100, atk: e.atk || 8, statuses: [] };
    this.moves = (e.moves && e.moves.length ? e.moves : [{ id: 'silence', name: 'Awkward Silence', weight: 1, effects: [{ type: 'damage', power: 1 }] }]);
    this.gentle = !!levelCfg.gentle;

    // thresholds: valid, unique, highest first
    const seen = {};
    this.thresholds = (levelCfg.events || []).filter((t) => {
      const ok = t && typeof t.at === 'number' && t.at > 0 && t.at < 1 && !seen[t.at];
      if (!ok) this.problems.push('invalid or duplicate event threshold ignored: ' + JSON.stringify(t));
      else seen[t.at] = true;
      return ok;
    }).map((t, i) => Object.assign({}, t, { index: i, hp: Math.max(1, Math.round(this.enemy.maxHp * t.at)), fired: false }))
      .sort((a, b) => b.at - a.at).map((t, i) => { t.index = i; return t; });

    this.turn = 0; this.phase = 'player'; this.intent = null; this.event = null;
    this.pendingBeats = []; this.pendingThr = null;
    this.usedQuestions = {}; this.usedTopics = {};
    this.counts = { correct: 0, wrong: 0, events: 0, damageDealt: 0 };
    this.started = false;
  }

  // ---------------------------------------------------------------- data checks
  static validateBank(bank, topics) {
    const valid = [], problems = [], ids = {};
    (bank || []).forEach((q, i) => {
      const tag = 'question #' + (i + 1) + (q && q.id ? ' (' + q.id + ')' : '');
      if (!q || typeof q !== 'object') { problems.push(tag + ': not an object'); return; }
      if (!q.id || ids[q.id]) { problems.push(tag + ': missing or duplicate id'); return; }
      if (q.enabled === false) return;
      if (!Array.isArray(q.choices) || q.choices.length < 2) { problems.push(tag + ': needs at least 2 choices'); return; }
      const cids = {};
      for (const c of q.choices) {
        if (!c || !c.id || cids[c.id] || !String(c.text || '').trim()) { problems.push(tag + ': a choice has no id/text or a duplicate id'); return; }
        cids[c.id] = true;
        if (topics && c.topic && !topics[c.topic]) problems.push(tag + ': unknown topic "' + c.topic + '" (shown with a generic icon)');
      }
      const ans = [].concat(q.answer === undefined ? [] : q.answer);
      if (!ans.length || !ans.every((a) => cids[a])) { problems.push(tag + ': "answer" does not match any choice id'); return; }
      if (ans.length >= q.choices.length) { problems.push(tag + ': every choice is correct'); return; }
      ids[q.id] = true; valid.push(q);
    });
    return { valid, problems };
  }

  // ---------------------------------------------------------------- helpers
  rand(a, b) { return a + this.rng() * (b - a); }
  _side(eff, ctx, dflt) {                       // resolve 'self' / 'other' / 'player' / 'enemy'
    let t = eff.target || dflt;
    if (t === 'self') return ctx.actor;
    if (t === 'other') return ctx.actor === 'player' ? 'enemy' : 'player';
    return t;
  }
  _who(side) { return side === 'player' ? this.player : this.enemy; }
  snap() { return { php: this.player.hp, ehp: this.enemy.hp, sp: this.player.sp }; }
  _beat(b) { b.snap = this.snap(); return b; }
  _mult(side, stat) { return this._who(side).statuses.filter((s) => s.stat === stat).reduce((m, s) => m * s.mult, 1); }
  hasStatus(side, stat) { return this._who(side).statuses.some((s) => s.stat === stat); }
  nextThreshold() { return this.thresholds.find((t) => !t.fired) || null; }

  // ---------------------------------------------------------------- damage
  _calc(from, to, power, ctx) {
    const base = this._who(from).atk * this._mult(from, 'atk') * (from === 'player' ? this.aura : 1);
    const v = this.tun.variance || 0;
    let dmg = power * base * this.rand(1 - v, 1 + v) / this._mult(to, 'def') * this._mult(to, 'guard');
    if (ctx && ctx.powerMult) dmg *= ctx.powerMult;
    return Math.max(1, Math.round(dmg));
  }

  // Applies damage to a side. For the enemy the damage is CAPPED at the next unfired threshold:
  // that is what makes it impossible to skip a conversation event with one big hit.
  _hit(to, amount, from, ctx, beats) {
    const T = this._who(to), old = T.hp;
    let nu = Math.max(0, old - amount);
    if (to === 'enemy') {
      const thr = this.nextThreshold();
      if (thr && nu <= thr.hp) { nu = Math.max(nu, Math.min(old, thr.hp)); this.pendingThr = thr; }
      this.counts.damageDealt += old - nu;
    } else if (this.gentle && nu < 1) nu = 1;
    T.hp = nu;
    beats.push(this._beat({ type: 'strike', from, to, name: ctx.name, amount: old - nu, hpAfter: nu, blocked: to === 'player' && this.hasStatus('player', 'guard'), vfx: ctx.vfx || 'hit', icon: ctx.icon }));
  }

  _heal(side, amount, beats) {
    const T = this._who(side), old = T.hp;
    T.hp = Math.min(T.maxHp, T.hp + amount);
    beats.push(this._beat({ type: 'heal', to: side, amount: T.hp - old, hpAfter: T.hp, vfx: 'hearts' }));
  }

  _addStatus(side, st, beats) {
    const T = this._who(side);
    const tick = st.tick || ((st.stat === 'guard' || st.stat === 'skip') ? 'start' : 'end');
    const key = st.stat + (st.mult < 1 ? '-' : '+');
    const ex = T.statuses.find((s) => s.key === key);
    if (ex) { ex.turns = Math.max(ex.turns, st.turns || 1); ex.mult = st.mult; ex.label = st.label || ex.label; }
    else T.statuses.push({ key, stat: st.stat, mult: st.mult === undefined ? 1 : st.mult, turns: st.turns || 1, tick, label: st.label || '' });
    beats.push(this._beat({ type: 'status', to: side, status: { stat: st.stat, mult: st.mult, turns: st.turns, label: st.label || '' }, kind: (st.stat === 'skip' || st.mult < 1) ? 'debuff' : 'buff' }));
  }

  _tick(side, when) {
    const T = this._who(side);
    T.statuses = T.statuses.filter((s) => { if (s.tick !== when || s.stat === 'skip') return true; s.turns--; return s.turns > 0; });   // 'skip' is removed when it is used
  }

  // ---------------------------------------------------------------- effects (add your own types here)
  runEffects(effects, ctx, beats) {
    for (const eff of effects || []) {
      const h = BattleEngine.effectHandlers[eff.type];
      if (h) h(this, eff, ctx, beats); else this.problems.push('unknown effect type: ' + eff.type);
    }
  }

  // ---------------------------------------------------------------- start / turns
  start() {
    const beats = [];
    this.started = true; this.turn = 0;
    this._startPlayerTurn(beats, true);
    return beats;
  }

  _chooseIntent() {
    const e = this.enemy, frac = e.hp / e.maxHp;
    let list = this.moves.filter((m) => {
      const w = m.when || {};
      if (w.turnMin && this.turn < w.turnMin) return false;
      if (w.hpBelow !== undefined && frac >= w.hpBelow) return false;
      if (w.hpAbove !== undefined && frac <= w.hpAbove) return false;
      const effs = m.effects || [];
      if (effs.length && effs.every((x) => x.type === 'status' && this._side(x, { actor: 'enemy' }, 'self') === 'enemy' && this.hasStatus('enemy', x.stat))) return false;
      if (effs.length && effs.every((x) => x.type === 'heal') && e.hp >= e.maxHp) return false;
      return true;
    });
    if (!list.length) list = this.moves;
    const total = list.reduce((a, m) => a + (m.weight === undefined ? 1 : m.weight), 0);
    let r = this.rng() * total;
    for (const m of list) { r -= (m.weight === undefined ? 1 : m.weight); if (r <= 0) return m; }
    return list[list.length - 1];
  }

  _startPlayerTurn(beats, first, depth) {
    depth = depth || 0;
    this.turn++;
    this._tick('player', 'start');                          // guard expires here
    if (!first) this.player.sp = Math.min(this.tun.maxSp, this.player.sp + (this.tun.spPerTurn || 0));
    this.intent = this._chooseIntent();
    const sk = this.player.statuses.findIndex((s) => s.stat === 'skip');
    if (sk >= 0 && depth < 4) {
      this.player.statuses.splice(sk, 1);
      beats.push(this._beat({ type: 'skip', side: 'player', text: BT('skipPlayer') }));
      this._enemyPhase(beats, depth + 1);
      return;
    }
    this.phase = 'player';
    beats.push(this._beat({ type: 'turn', n: this.turn, intent: { id: this.intent.id, name: this.intent.name, icon: this.intent.icon } }));
  }

  _enemyPhase(beats, depth) {
    this._tick('player', 'end');
    this._enemyTurn(beats);
    if (this.player.hp <= 0) { this._end('lost', beats); return; }
    this._tick('enemy', 'end');
    this._startPlayerTurn(beats, false, depth || 0);
  }

  _enemyTurn(beats) {
    const E = this.enemy, sk = E.statuses.findIndex((s) => s.stat === 'skip');
    if (sk >= 0) { E.statuses.splice(sk, 1); beats.push(this._beat({ type: 'skip', side: 'enemy', text: BT('skipEnemy') })); return; }
    const m = this.intent || this._chooseIntent();
    beats.push(this._beat({ type: 'move', side: 'enemy', name: m.name, icon: m.icon }));
    this.runEffects(m.effects, { actor: 'enemy', name: m.name, icon: m.icon, vfx: 'hit' }, beats);
  }

  _end(result, beats) {
    this.phase = result;
    beats.push(this._beat({ type: 'end', result, summary: this.summary() }));
  }

  // ---------------------------------------------------------------- player actions
  // action: {type:'attack'} | {type:'skill', id} | {type:'defend'} | {type:'focus'}
  // Returns an array of beats, or null if the action is not allowed right now.
  act(action) {
    if (!this.started || this.phase !== 'player' || !action) return null;
    const beats = [], P = this.player;
    const base = { actor: 'player' };
    if (action.type === 'attack') {
      beats.push(this._beat({ type: 'move', side: 'player', name: BT('attack') }));
      this.runEffects([{ type: 'damage', power: 1.0 }], Object.assign({ name: BT('attack'), vfx: 'hit' }, base), beats);
      this._gainSp(this.tun.attackSp || 0, beats);
    } else if (action.type === 'skill') {
      const s = this.skills.find((k) => k.id === action.id);
      if (!s || P.sp < (s.cost || 0)) return null;
      P.sp -= (s.cost || 0);
      beats.push(this._beat({ type: 'move', side: 'player', name: s.name, icon: s.icon }));
      const pm = 1 + (this.stats[s.stat] || 0) * (this.tun.statScale || 0);
      this.runEffects(s.effects, Object.assign({ name: s.name, icon: s.icon, vfx: s.vfx || 'sparkles', powerMult: pm }, base), beats);
    } else if (action.type === 'defend') {
      beats.push(this._beat({ type: 'move', side: 'player', name: BT('defend') }));
      this._addStatus('player', { stat: 'guard', mult: this.tun.guardMult, turns: 1, tick: 'start' }, []);
      beats.push(this._beat({ type: 'defend', side: 'player', text: BT('playerGuard') }));
      this._gainSp(this.tun.defendSp || 0, beats);
    } else if (action.type === 'focus') {
      beats.push(this._beat({ type: 'move', side: 'player', name: BT('focus') }));
      this._gainSp(this.tun.focusSp || 0, beats);
      if (this.tun.focusHeal) this._heal('player', Math.round(P.maxHp * this.tun.focusHeal), beats);
    } else return null;

    this._afterPlayerAction(beats);
    return beats;
  }

  _gainSp(n, beats) {
    if (!n) return;
    const old = this.player.sp; this.player.sp = Math.min(this.tun.maxSp, old + n);
    if (this.player.sp !== old) beats.push(this._beat({ type: 'sp', amount: this.player.sp - old, spAfter: this.player.sp }));
  }

  _afterPlayerAction(beats) {
    if (this.enemy.hp <= 0) { this._end('won', beats); return; }
    if (this._openPendingEvent(beats)) return;
    this._enemyPhase(beats);
  }

  // ---------------------------------------------------------------- conversation events
  _openPendingEvent(beats) {
    const thr = this.pendingThr; this.pendingThr = null;
    if (!thr || thr.fired) return false;
    thr.fired = true;                                        // exactly once, even if no question can be found
    if (thr.phase) { this._enterPhase(thr, beats); return this._openPendingEvent(beats) || false; }   // mốc HP kiểu boss: chuyển phase, không hỏi đáp
    const q = this._pickQuestion(thr);
    if (!q) { beats.push(this._beat({ type: 'text', text: BT('noQuestion') })); return this._openPendingEvent(beats) || false; }
    this.usedQuestions[q.id] = true;
    const correct = [].concat(q.answer);
    this.usedTopics[(q.choices.find((c) => c.id === correct[0]) || {}).topic] = true;
    const count = Math.max(2, Math.min(q.choices.length, this.cfg.choiceCount || q.choices.length));
    const right = q.choices.filter((c) => correct.includes(c.id)), wrong = q.choices.filter((c) => !correct.includes(c.id));
    const keep = [right[Math.floor(this.rng() * right.length)]].concat(this._shuffle(wrong).slice(0, count - 1));
    const choices = this._shuffle(keep).map((c) => ({ id: c.id, text: c.text, topic: c.topic }));
    this.event = { threshold: thr, index: thr.index, total: this.thresholds.length, at: thr.at, question: q, choices, correctIds: correct.filter((id) => choices.some((c) => c.id === id)), state: 'asking', chosen: null, correct: null };   // only correct ids that are actually shown
    this.counts.events++;
    this.phase = 'event';
    beats.push(this._beat({ type: 'event', event: { id: q.id, index: thr.index, total: this.thresholds.length, at: thr.at, situation: q.situation || '', prompt: q.prompt || '', placeholder: !!q.placeholder, choices } }));
    return true;
  }

  // Mốc HP của boss: { at, phase: { name, textKey, moves?, atkMult?, effects?, icon? } }
  _enterPhase(thr, beats) {
    const ph = thr.phase;
    if (ph.moves && ph.moves.length) this.moves = ph.moves;
    if (ph.atkMult) this.enemy.atk = Math.round(this.enemy.atk * ph.atkMult);
    this.counts.phases = (this.counts.phases || 0) + 1;
    beats.push(this._beat({ type: 'phase', index: thr.index + 2, total: this.thresholds.length + 1, name: ph.name || '', textKey: ph.textKey || '' }));
    if (ph.effects) this.runEffects(ph.effects, { actor: 'enemy', name: ph.name || '', icon: ph.icon, vfx: 'hit' }, beats);
  }

  _pickQuestion(thr) {
    if (thr.question) { const f = this.bank.find((q) => q.id === thr.question); if (f) return f; }
    const lvl = this.level;
    const pool = this.bank.filter((q) => !q.levels || q.levels.includes(lvl) || q.levels.includes(String(lvl)));
    const tagged = (thr.tags && thr.tags.length) ? pool.filter((q) => thr.tags.every((t) => (q.tags || []).includes(t))) : pool;
    const unseen = (a) => a.filter((q) => !this.usedQuestions[q.id]);
    const fresh = (a) => { const f = a.filter((q) => !this.usedTopics[(q.choices.find((c) => [].concat(q.answer)[0] === c.id) || {}).topic]); return f.length ? f : a; };
    for (const list of [unseen(tagged), unseen(pool), tagged, pool, this.bank]) {
      if (list.length) { const f = fresh(list); return f[Math.floor(this.rng() * f.length)]; }
    }
    return null;
  }

  _shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

  _preset(kind, ev, choice) {
    const q = ev.question, set = kind === 'reward' ? this.data.rewards : this.data.penalties;
    const topic = choice && this.topics[choice.topic];
    const id = q[kind] || ev.threshold[kind] || (kind === 'reward' && topic && topic.reward) || this.cfg[kind] || this.tun[kind === 'reward' ? 'defaultReward' : 'defaultPenalty'];
    return { id, p: set[id] || set[this.tun[kind === 'reward' ? 'defaultReward' : 'defaultPenalty']] || { label: '', effects: [] } };
  }

  // The player picked a choice. Applies the reward / penalty at once (state), the beats are
  // released by finishEvent() after the screen has shown the feedback.
  answer(choiceId) {
    const ev = this.event;
    if (this.phase !== 'event' || !ev || ev.state !== 'asking') return null;
    const choice = ev.choices.find((c) => c.id === choiceId);
    if (!choice) return null;
    const ok = ev.correctIds.includes(choiceId);
    ev.state = 'resolved'; ev.chosen = choiceId; ev.correct = ok;
    ok ? this.counts.correct++ : this.counts.wrong++;
    const right = ev.question.choices.find((c) => ev.correctIds.includes(c.id));
    const pr = this._preset(ok ? 'reward' : 'penalty', ev, ok ? choice : choice);
    const beats = [];
    this.runEffects(pr.p.effects, { actor: ok ? 'player' : 'enemy', name: ok ? pr.p.label || BT('correct') : BT('counter'), icon: pr.p.icon, vfx: ok ? 'sparkles' : 'hit', powerMult: 1 }, beats);
    this.pendingBeats = beats;
    const fb = ev.question.feedback || {};
    return { correct: ok, chosen: choiceId, correctIds: ev.correctIds.slice(), correctTopic: right && right.topic, presetId: pr.id, label: pr.p.label || '', icon: pr.p.icon || '', feedback: (ok ? fb.correct : fb.wrong) || (ok ? BT('correct') : BT('wrong')) };
  }

  // The screen has shown the result. Releases the reward/penalty beats and continues the battle.
  finishEvent() {
    const ev = this.event;
    if (this.phase !== 'event' || !ev || ev.state !== 'resolved') return [];
    const beats = this.pendingBeats; this.pendingBeats = []; this.event = null;
    this.phase = 'player';
    if (this.player.hp <= 0) { this._end('lost', beats); return beats; }
    if (this.enemy.hp <= 0) { this._end('won', beats); return beats; }
    if (this._openPendingEvent(beats)) return beats;       // a strong reward can reach the next threshold
    this._enemyPhase(beats);
    return beats;
  }

  // ---------------------------------------------------------------- result
  summary() {
    const won = this.phase === 'won', hpFrac = Math.max(0, this.player.hp / this.player.maxHp);
    const acc = this.counts.events ? this.counts.correct / this.counts.events : 1;
    const q = 0.5 * hpFrac + 0.5 * acc, th = this.cfg.stars || [0.5, 0.75];
    const stars = won ? 1 + (q >= th[0] ? 1 : 0) + (q >= th[1] ? 1 : 0) : 0;
    const score = won ? Math.max(100, Math.round(300 + 300 * hpFrac + 300 * acc + Math.max(0, 100 - this.turn * 4))) : Math.round(100 * (1 - this.enemy.hp / this.enemy.maxHp));
    return { won, turns: this.turn, hpFrac, accuracy: acc, correct: this.counts.correct, wrong: this.counts.wrong, events: this.counts.events, quality: q, stars, score };
  }
}

// ---- effect handlers: (engine, effect, ctx, beats). ctx = {actor:'player'|'enemy', name, vfx, icon, powerMult} ----
BattleEngine.effectHandlers = {
  damage(en, eff, ctx, beats) {
    const to = en._side(eff, ctx, 'other');
    en._hit(to, en._calc(ctx.actor, to, eff.power === undefined ? 1 : eff.power, ctx), ctx.actor, ctx, beats);
  },
  flatDamage(en, eff, ctx, beats) {
    const to = en._side(eff, ctx, 'other'), T = en._who(to);
    en._hit(to, Math.max(1, Math.round(eff.amount !== undefined ? eff.amount : T.maxHp * (eff.frac || 0.1))), ctx.actor, ctx, beats);
  },
  heal(en, eff, ctx, beats) {
    const side = en._side(eff, ctx, 'self'), T = en._who(side);
    en._heal(side, Math.max(1, Math.round(eff.amount !== undefined ? eff.amount : T.maxHp * (eff.frac || 0.2))), beats);
  },
  status(en, eff, ctx, beats) {
    const side = en._side(eff, ctx, (eff.mult !== undefined && eff.mult < 1) ? 'other' : 'self');
    en._addStatus(side, { stat: eff.stat, mult: eff.mult, turns: eff.turns, label: eff.label }, beats);
  },
  skip(en, eff, ctx, beats) {
    const side = en._side(eff, ctx, 'other');
    en._addStatus(side, { stat: 'skip', mult: 0, turns: 1, tick: 'start', label: 'Mất lượt' }, beats);
  },
  sp(en, eff, ctx, beats) { en._gainSp(eff.amount || 1, beats); }
};
if (typeof module !== 'undefined') module.exports = { BattleEngine, makeRng };
