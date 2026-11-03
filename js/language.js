// ============================================================
// language.js - LanguageMinigame ("Language Detective")
//   level 1  match : tap a word, then its picture
//   level 2  sort  : put words in the right category, then build 2 sentences
//   level 3  detective : 8 mixed cases (listen / meaning / picture / unscramble)
// Words come from data/vocab.js. Click or touch; keys 1-4 answer multiple choice.
// Reusable: DiscoverMinigame passes opts.cfg = { kind:'detective', count:5 }.
// ============================================================
const Speech = {
  ok() { return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'; },
  say(text) {
    if (!this.ok()) return false;
    try { const u = new SpeechSynthesisUtterance(text); u.lang = VOCAB_CONFIG.speechLang; u.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u); return true; } catch (e) { return false; }
  }
};

class LanguageMinigame extends MinigameBase {
  constructor(game, level, opts) {
    super(game, level, opts);
    const cfg = (opts && opts.cfg) || { kind: ['match', 'sort', 'detective'][level - 1] };
    this.kind = cfg.kind; this.cfg = cfg;
    this.mistakes = 0; this.correct = 0; this.firstTry = 0;
    this.fb = null;                              // {ok, t}
    this.hintOn = ProgressionManager.hasReward('hint_lens');
    this.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if (this.kind === 'match') this.initMatch();
    else if (this.kind === 'sort') this.initSort();
    else this.initDetective(cfg.count || 8);
  }

  // ---------- shared helpers ----------
  wrongHit(item) { this.mistakes++; item.shake = 0.4; this.fb = { ok: false, t: 0.5 }; Sfx.play('land'); }
  rightHit(x, y) { this.correct++; this.fb = { ok: true, t: 0.5 }; Sfx.play('star'); Fx.burst(x, y, ['#ffd65a', '#fff4be', '#8fd3a8'], 8, 40); }
  chip(ctx, b, fill) {
    const sx = b.shake > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
    UI.panel(ctx, b.x + sx, b.y, b.w, b.h, fill || (b.matched ? '#cdeedb' : b.sel ? '#ffd9e8' : (UIManager.hover(b) && !b.matched ? '#fff' : UI.C.cream)));
    if (b.label) Text.draw(ctx, b.label, b.x + sx + b.w / 2, b.y + Math.floor((b.h - 8) / 2), { align: 'center', color: UIManager.C.ink });
  }
  tickItems(dt, list) { list.forEach((i) => { if (i.shake > 0) i.shake -= dt; }); if (this.fb) { this.fb.t -= dt; if (this.fb.t <= 0) this.fb = null; } }
  hit(list) { if (!Input.pointer.pressed) return -1; return list.findIndex((b) => Input.inRect(b.x, b.y, b.w, b.h) && !b.matched && b.enabled !== false); }
  header(ctx, title) {
    ctx.fillStyle = '#eef1fb'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.fillStyle = '#dde3f5'; for (let y = 10; y < CONFIG.HEIGHT; y += 12) ctx.fillRect(0, y, CONFIG.WIDTH, 1);
    UI.panel(ctx, 6, 3, 200, 17, '#fff');
    UIManager.icon(ctx, 'book', 8, 3, 1);
    Text.draw(ctx, title, 26, 8, { color: UIManager.C.ink });
    UIManager.icon(ctx, 'cross', 250, 3, 1); Text.draw(ctx, String(this.mistakes), 268, 8, { color: UIManager.C.bad });
    UIManager.icon(ctx, 'check', 218, 3, 1); Text.draw(ctx, String(this.correct), 236, 8, { color: '#3f8f5f' });
  }
  starsFromMistakes(th) { return this.mistakes <= th[0] ? 3 : this.mistakes <= th[1] ? 2 : 1; }
  gain(stars) { return ((this.cfg && this.cfg.gain) || [10, 14, 18][Math.min(2, this.level - 1)]) + 2 * stars; }

  update(dt) { super.update(dt); if (this.kind === 'match') this.updMatch(dt); else if (this.kind === 'sort') this.updSort(dt); else this.updDetective(dt); }
  render(ctx) { if (this.kind === 'match') this.renMatch(ctx); else if (this.kind === 'sort') this.renSort(ctx); else this.renDetective(ctx); Fx.draw(ctx, 0, 0); }

  // =================== LEVEL 1: MATCH ===================
  initMatch() {
    const words = this.shuffle(VOCAB.filter((v) => v.icon)).slice(0, 6);
    this.words = this.shuffle(words).map((v, i) => ({ v, x: 14, y: 30 + i * 22, w: 112, h: 19, label: v.word }));
    this.pics = this.shuffle(words).map((v, i) => ({ v, x: 150 + (i % 3) * 52, y: 34 + Math.floor(i / 3) * 62, w: 46, h: 56 }));
    this.selW = -1; this.selP = -1; this.left = 6;
  }
  updMatch(dt) {
    this.tickItems(dt, this.words.concat(this.pics));
    const w = this.hit(this.words), p = this.hit(this.pics);
    if (w >= 0) { this.selW = w; Sfx.play('ui'); }
    if (p >= 0) { this.selP = p; Sfx.play('ui'); }
    if (this.selW >= 0 && this.selP >= 0) {
      const a = this.words[this.selW], b = this.pics[this.selP];
      if (a.v === b.v) { a.matched = b.matched = true; this.rightHit(b.x + 23, b.y + 20); this.left--; }
      else { this.wrongHit(a); b.shake = 0.4; }
      this.selW = this.selP = -1;
      if (this.left === 0) { const stars = this.starsFromMistakes([1, 3]); this.finish({ score: Math.max(100, 600 - this.mistakes * 50), stars, stats: { language: this.gain(stars) }, detail: this.mistakes + ' mistakes' }); }
    }
  }
  renMatch(ctx) {
    this.header(ctx, MinigameManager.levelName(this.level));
    this.words.forEach((b, i) => { b.sel = i === this.selW; this.chip(ctx, b); if (b.matched) UIManager.icon(ctx, 'check', b.x + b.w - 17, b.y + 2, 1); });
    this.pics.forEach((b, i) => {
      const sx = b.shake > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
      UI.panel(ctx, b.x + sx, b.y, b.w, b.h, b.matched ? '#cdeedb' : i === this.selP ? '#ffd9e8' : (UIManager.hover(b) ? '#fff' : UI.C.cream));
      UIManager.vocab(ctx, b.v.icon, b.x + sx + 7, b.y + 4, 2);
      if (b.matched) Text.draw(ctx, UIManager.wrap(b.v.meaning, 42).join('\n'), b.x + 23, b.y + 38, { align: 'center', color: UIManager.C.soft, lineH: 9 });
    });
    Text.draw(ctx, this.left + ' left', 8, 168, { color: UIManager.C.soft });
  }

  // =================== LEVEL 2: SORT + SENTENCES ===================
  initSort() {
    const cats = this.shuffle(Object.keys(VOCAB_CATEGORIES)).slice(0, 2);
    this.cats = cats;
    const pool = [];
    cats.forEach((c) => this.shuffle(VOCAB.filter((v) => v.cat === c)).slice(0, 4).forEach((v) => pool.push(v)));
    this.chips = this.shuffle(pool).map((v, i) => ({ v, x: 24 + (i % 4) * 68, y: 34 + Math.floor(i / 4) * 24, w: 62, h: 20, label: v.word }));
    this.bins = cats.map((c, i) => ({ cat: c, x: 24 + i * 140, y: 100, w: 128, h: 50, n: 0 }));
    this.selChip = -1; this.round = 'sort'; this.left = pool.length; this.sIdx = 0; this.sentences = this.shuffle(SENTENCES).slice(0, 2);
  }
  startSentence() {
    const s = this.sentences[this.sIdx]; this.sent = s; this.placed = [];
    let x = 14, y = 96;
    this.pool = this.shuffle(s.words.map((w, i) => ({ w, i }))).map((o) => {
      const wd = Text.width(o.w) + 12; if (x + wd > 304) { x = 14; y += 22; }
      const b = { x, y, w: wd, h: 19, label: o.w, word: o.w, order: o.i }; x += wd + 6; return b;
    });
  }
  updSort(dt) {
    this.tickItems(dt, this.chips || []); this.tickItems(dt, this.pool || []);
    if (this.round === 'sort') {
      const c = this.hit(this.chips); if (c >= 0) { this.selChip = c; Sfx.play('ui'); }
      if (this.selChip >= 0 && Input.pointer.pressed) {
        const bi = this.bins.findIndex((b) => Input.inRect(b.x, b.y, b.w, b.h));
        if (bi >= 0) {
          const ch = this.chips[this.selChip];
          if (ch.v.cat === this.bins[bi].cat) { ch.matched = true; this.bins[bi].n++; this.left--; this.rightHit(this.bins[bi].x + 64, this.bins[bi].y + 25); }
          else this.wrongHit(ch);
          this.selChip = -1;
          if (this.left === 0) { this.round = 'sentence'; this.startSentence(); }
        }
      }
    } else {
      const p = this.hit(this.pool);
      if (p >= 0) {
        const b = this.pool[p], expected = this.sent.words[this.placed.length];
        if (b.word === expected) { b.matched = true; this.placed.push(b.word); this.rightHit(b.x + b.w / 2, b.y); }
        else this.wrongHit(b);
        if (this.placed.length === this.sent.words.length) {
          this.sIdx++;
          if (this.sIdx >= this.sentences.length) { const stars = this.starsFromMistakes([1, 4]); this.finish({ score: Math.max(100, 800 - this.mistakes * 60), stars, stats: { language: this.gain(stars) }, detail: this.mistakes + ' mistakes' }); }
          else this.startSentence();
        }
      }
    }
  }
  renSort(ctx) {
    this.header(ctx, MinigameManager.levelName(this.level));
    if (this.round === 'sort') {
      this.chips.forEach((b, i) => { b.sel = i === this.selChip; if (!b.matched) this.chip(ctx, b); });
      this.bins.forEach((b) => {
        const hov = this.selChip >= 0 && Input.inRect(b.x, b.y, b.w, b.h);
        UI.panel(ctx, b.x, b.y, b.w, b.h, hov ? '#fff0f6' : '#e8f4ec');
        Text.draw(ctx, VOCAB_CATEGORIES[b.cat], b.x + b.w / 2, b.y + 6, { align: 'center', color: UIManager.C.ink });
        for (let i = 0; i < b.n; i++) UIManager.star(ctx, b.x + 8 + i * 28, b.y + 24, 20, true);
      });
    } else {
      Text.draw(ctx, UIManager.wrap(this.sent.meaning, 280).join('\n'), 160, 32, { align: 'center', color: UIManager.C.soft });
      UI.panel(ctx, 10, 54, 300, 28, '#fff');
      let x = 16; this.placed.forEach((w) => { Text.draw(ctx, w, x, 64, { color: UIManager.C.ink }); x += Text.width(w) + 6; });
      Text.draw(ctx, (this.sIdx + 1) + '/' + this.sentences.length, 296, 160, { align: 'right', color: UIManager.C.soft });
      this.pool.forEach((b) => { if (!b.matched) this.chip(ctx, b); });
    }
  }

  // =================== LEVEL 3: DETECTIVE ===================
  initDetective(n) {
    this.n = n; this.qi = 0; this.firstTry = 0;
    const types = ['meaning', 'pic', 'unscramble', Speech.ok() ? 'listen' : 'pic'];
    this.qs = [];
    const words = this.shuffle(VOCAB.filter((v) => v.icon));
    for (let i = 0; i < n; i++) this.qs.push({ type: types[i % types.length], v: words[i % words.length] });
    this.qs = this.shuffle(this.qs);
    this.nextQ();
  }
  nextQ() {
    const q = this.qs[this.qi]; this.q = q; this.qMistakes = 0; this.hinted = false; this.after = 0;
    if (q.type === 'unscramble') {
      const letters = q.v.word.toUpperCase().split(''); this.slots = []; let order = this.shuffle(letters.map((c, i) => ({ c, i })));
      if (order.every((o, k) => o.i === k) && letters.length > 1) order = order.reverse();
      this.letters = order.map((o, k) => ({ c: o.c, x: 160 - (letters.length * 26) / 2 + k * 26, y: 118, w: 22, h: 22, label: o.c }));
    } else {
      const others = this.shuffle(VOCAB.filter((v) => v !== q.v && v.icon)).slice(0, 3);
      this.opts4 = this.shuffle([q.v].concat(others)).map((v, i) => ({ v, correct: v === q.v, enabled: true }));
      const picMode = q.type === 'pic' || q.type === 'listen';
      this.opts4.forEach((o, i) => { Object.assign(o, picMode ? { x: 24 + i * 70, y: 100, w: 62, h: 52 } : { x: 24 + (i % 2) * 140, y: 100 + Math.floor(i / 2) * 26, w: 128, h: 22, label: o.v.word }); });
    }
    if (q.type === 'listen') Speech.say(q.v.word);
    this.hintBtn = { id: 'hint', x: 232, y: 30, w: 70, h: 18, label: LT('hint', 'Hint'), icon: 'hint', enabled: this.hintOn };
    this.listenBtn = { id: 'listen', x: 124, y: 38, w: 72, h: 34, label: '', icon: 'speaker' };
  }
  answered(first) {
    const q = this.q;
    if (first && this.qMistakes === 0) this.firstTry++;
    this.after = 1.1; this.rightHit(160, 70);
  }
  updDetective(dt) {
    if (this.fb) { this.fb.t -= dt; if (this.fb.t <= 0) this.fb = null; }
    const q = this.q;
    (this.opts4 || []).forEach((o) => { if (o.shake > 0) o.shake -= dt; });
    (this.letters || []).forEach((o) => { if (o.shake > 0) o.shake -= dt; });
    if (this.after > 0) {
      this.after -= dt;
      if (this.after <= 0) {
        this.qi++;
        if (this.qi >= this.n) { const stars = this.firstTry >= Math.ceil(this.n * 0.75) ? 3 : this.firstTry >= Math.ceil(this.n * 0.5) ? 2 : 1; this.mistakes = this.n - this.firstTry; this.finish({ score: this.firstTry * 100 + (this.n - this.firstTry) * 50, stars, stats: { language: this.gain(stars) }, detail: this.firstTry + '/' + this.n }); }
        else this.nextQ();
      }
      return;
    }
    const click = UIManager.click([this.hintBtn].concat(q.type === 'listen' ? [this.listenBtn] : []));
    if (click === 'listen') Speech.say(q.v.word);
    if (click === 'hint' && !this.hinted) {
      this.hinted = true; Sfx.play('ui');
      if (q.type === 'unscramble') { const need = q.v.word.toUpperCase()[this.slots.length]; const L = this.letters.find((l) => !l.matched && l.c === need); if (L) this.pickLetter(L); }
      else { let rm = 2; this.opts4.forEach((o) => { if (!o.correct && o.enabled && rm > 0) { o.enabled = false; rm--; } }); }
    }
    if (q.type === 'unscramble') {
      const i = this.hit(this.letters); if (i >= 0) this.pickLetter(this.letters[i]);
    } else {
      let idx = this.hit(this.opts4);
      for (let k = 1; k <= 4; k++) if (Input.key('Digit' + k) && this.opts4[k - 1].enabled) idx = k - 1;
      if (idx >= 0) {
        const o = this.opts4[idx];
        if (o.correct) { o.matched = true; this.answered(true); } else { o.enabled = false; this.qMistakes++; this.mistakes++; o.shake = 0.4; this.fb = { ok: false, t: 0.5 }; Sfx.play('land'); }
      }
    }
  }
  pickLetter(L) {
    const need = this.q.v.word.toUpperCase()[this.slots.length];
    if (L.c === need) { L.matched = true; this.slots.push(L.c); Sfx.play('ui'); if (this.slots.length === this.q.v.word.length) this.answered(true); }
    else { L.shake = 0.4; this.qMistakes++; this.mistakes++; this.fb = { ok: false, t: 0.5 }; Sfx.play('land'); }
  }
  renDetective(ctx) {
    this.header(ctx, MinigameManager.levelName(this.level));
    const q = this.q;
    Text.draw(ctx, 'Case ' + (this.qi + 1) + '/' + this.n, 14, 30, { color: UIManager.C.soft });
    for (let i = 0; i < this.n; i++) { ctx.fillStyle = i < this.qi ? UIManager.C.mint : (i === this.qi ? UIManager.C.pink : '#d8d2e4'); ctx.fillRect(14 + i * 10, 42, 8, 4); }
    UIManager.drawButton(ctx, this.hintBtn);
    const done = this.after > 0;
    if (q.type === 'listen') { UIManager.drawButton(ctx, this.listenBtn); Text.draw(ctx, LT('listen', 'Listen'), 160, 78, { align: 'center', color: UIManager.C.soft }); }
    else if (q.type === 'meaning' || q.type === 'unscramble') { UI.panel(ctx, 128, 36, 64, 40, '#fff'); UIManager.vocab(ctx, q.v.icon, 144, 40, 2); }
    else if (q.type === 'pic') { UI.panel(ctx, 100, 38, 120, 30, '#fff'); Text.draw(ctx, q.v.word, 160, 48, { align: 'center', scale: 2, color: UIManager.C.ink }); }
    if (q.type === 'unscramble') {
      const n = q.v.word.length;
      for (let i = 0; i < n; i++) { const x = 160 - (n * 26) / 2 + i * 26; UI.panel(ctx, x, 84, 22, 22, i < this.slots.length ? '#cdeedb' : '#f4f0fa'); if (i < this.slots.length) Text.draw(ctx, this.slots[i], x + 11, 91, { align: 'center', color: UIManager.C.ink }); }
      this.letters.forEach((b) => { if (!b.matched) this.chip(ctx, b); });
    } else {
      this.opts4.forEach((o, i) => {
        const sx = o.shake > 0 ? Math.round(Math.sin(this.t * 60) * 2) : 0;
        const fill = o.matched ? '#cdeedb' : !o.enabled ? '#e4dcea' : (UIManager.hover(o) ? '#fff' : UI.C.cream);
        UI.panel(ctx, o.x + sx, o.y, o.w, o.h, fill);
        if (o.label) Text.draw(ctx, o.label, o.x + sx + o.w / 2, o.y + 7, { align: 'center', color: o.enabled ? UIManager.C.ink : UIManager.C.soft });
        else UIManager.vocab(ctx, o.v.icon, o.x + sx + 15, o.y + 8, 2);
        Text.draw(ctx, String(i + 1), o.x + 4 + sx, o.y + 3, { color: UIManager.C.soft });
      });
    }
    if (done) { UI.panel(ctx, 100, 156, 120, 18, '#e8f8ee'); UIManager.icon(ctx, 'check', 104, 156, 1); Text.draw(ctx, q.v.word + ' = ' + q.v.meaning, 164, 161, { align: 'center', color: UIManager.C.ink }); }
  }
}
MinigameManager.register('language', LanguageMinigame);
