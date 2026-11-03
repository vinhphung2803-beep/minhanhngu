// ============================================================
// audio.js - Tiny WebAudio sound hooks. No audio files needed.
//   Sfx.play('star')   Sfx.toggleMusic()  (key M)
// Browsers only allow sound after the first click/key press, so
// Sfx.unlock() is called from the first input.
// To use real files later: replace the body of play()/startMusic().
// ============================================================
const Sfx = {
  ctx: null, master: null, musicOn: true, _timer: null, _step: 0,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    if (this.musicOn) this.startMusic();
  },

  tone(freq, dur, type = 'square', vol = 0.08, when = 0, slideTo = null) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'star':  this.tone(880, 0.09); this.tone(1318, 0.14, 'square', 0.07, 0.07); break;
      case 'heart': this.tone(659, 0.12, 'triangle', 0.12); this.tone(988, 0.18, 'triangle', 0.12, 0.09); break;
      case 'plane': this.tone(500, 0.25, 'sine', 0.12, 0, 1200); break;
      case 'hop':   this.tone(300, 0.12, 'square', 0.04, 0, 520); break;
      case 'land':  this.tone(160, 0.07, 'triangle', 0.08); break;
      case 'checkpoint': [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.1, i * 0.09)); break;
      case 'ui':    this.tone(700, 0.05, 'square', 0.04); break;
      case 'win':   [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, i * 0.13)); break;
    }
  },

  // Soft pentatonic lullaby loop (original, generated)
  startMusic() {
    if (!this.ctx || this._timer) return;
    const melody = [523, 0, 659, 0, 784, 0, 659, 0, 587, 0, 698, 0, 880, 0, 698, 0, 523, 0, 659, 784, 1047, 0, 784, 0, 659, 0, 587, 0, 523, 0, 0, 0];
    const bass = [262, 0, 0, 0, 262, 0, 0, 0, 294, 0, 0, 0, 294, 0, 0, 0, 262, 0, 0, 0, 330, 0, 0, 0, 294, 0, 0, 0, 262, 0, 0, 0];
    this._timer = setInterval(() => {
      if (!this.musicOn || document.hidden) return;
      const i = this._step++ % melody.length;
      if (melody[i]) this.tone(melody[i], 0.35, 'triangle', 0.035);
      if (bass[i]) this.tone(bass[i], 0.5, 'sine', 0.05);
    }, 260);
  },

  toggleMusic() {
    this.musicOn = !this.musicOn;
    try { localStorage.setItem('ltby_music', this.musicOn ? '1' : '0'); } catch (e) {}
    if (this.musicOn) this.startMusic();
    return this.musicOn;
  }
};
try { if (localStorage.getItem('ltby_music') === '0') Sfx.musicOn = false; } catch (e) {}
