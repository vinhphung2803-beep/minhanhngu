// ============================================================
// save.js - SaveSystem: one versioned save object in localStorage.
// Every module reads/writes SaveSystem.data and calls SaveSystem.save().
// Old saves from Chapter 1 ({done, best}) are migrated automatically.
// ============================================================
const SaveSystem = {
  KEY: 'ltby_save',
  VERSION: 2,
  data: null,

  defaults() {
    return {
      version: this.VERSION,
      ch1: { done: false, best: {} },
      ch2: { started: false, done: false },
      ch3: { started: false, done: false },
      progress: {
        stage: 'baby',                       // CharacterGrowth stage id
        stats: { creativity: 0, language: 0, friendship: 0 },
        games: {},                           // id -> { levels: {n: {score, stars, gain}}, plays, phase }
        rewards: [], badges: [], seen: {}
      }
    };
  },

  load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { raw = null; }
    const d = this.defaults();
    if (raw && typeof raw === 'object') {
      if (raw.version === undefined) {                 // Chapter 1 save -> migrate
        d.ch1.done = !!raw.done; d.ch1.best = raw.best || {};
      } else {
        Object.assign(d.ch1, raw.ch1 || {}); Object.assign(d.ch2, raw.ch2 || {}); Object.assign(d.ch3, raw.ch3 || {});
        const p = raw.progress || {};
        Object.assign(d.progress, p);
        d.progress.stats = Object.assign({ creativity: 0, language: 0, friendship: 0 }, p.stats || {});
      }
    }
    this.data = d;
    return d;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  },

  // Danger: wipes everything (used by tests and the "reset" key on the title screen)
  reset() {
    this.data = this.defaults();
    try { localStorage.removeItem(this.KEY); } catch (e) {}
    return this.data;
  }
};
