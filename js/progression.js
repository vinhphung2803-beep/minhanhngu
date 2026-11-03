// ============================================================
// progression.js - ProgressionManager: scores, stars, stats, unlocks,
// rewards, growth milestones. Everything is stored through SaveSystem.
// ============================================================
const ProgressionManager = {
  get d() { return SaveSystem.data.progress; },

  game(id) { return this.d.games[id] || (this.d.games[id] = { levels: {}, plays: 0, phase: 0 }); },
  stage() { return this.d.stage || 'baby'; },
  setStage(id) { this.d.stage = id; SaveSystem.save(); },
  stats() { return this.d.stats; },
  levelCount(id) { return PROGRESSION.levelsPerGame[id] || 3; },

  stars(id, level) { const l = this.game(id).levels[level]; return l ? l.stars : 0; },
  bestScore(id, level) { const l = this.game(id).levels[level]; return l ? l.score : 0; },
  isCleared(id, level) { return this.stars(id, level) >= 1; },
  isLevelUnlocked(id, level) { return level <= 1 || this.isCleared(id, level - 1); },
  levelsCleared(id) { let n = 0; for (let i = 1; i <= this.levelCount(id); i++) if (this.isCleared(id, i)) n++; return n; },
  totalLevelsCleared() { return ['artist', 'language', 'friends'].reduce((a, g) => a + this.levelsCleared(g), 0); },
  gameComplete(id) { return this.levelsCleared(id) >= this.levelCount(id); },
  totalStars() { let n = 0; for (const g of ['artist', 'language', 'friends', 'discover']) for (let i = 1; i <= this.levelCount(g); i++) n += this.stars(g, i); return n; },
  discoverDone() { return this.isCleared('discover', 1); },

  discoverUnlocked() {
    const r = PROGRESSION.discoverRequires, s = this.stats();
    return s.creativity >= r.creativity && s.language >= r.language && s.friendship >= r.friendship;
  },

  hasReward(id) { return this.d.rewards.includes(id); },
  hasBadge(id) { return this.d.badges.includes(id); },

  // Called by MinigameManager when a level ends.
  // result: { score, stars (0 = not passed), stats: {creativity, language, friendship} }
  record(id, level, result) {
    const g = this.game(id);
    g.plays++;
    const out = { gains: { creativity: 0, language: 0, friendship: 0 }, newBadges: [], newRewards: [], firstClear: false, improved: false };
    const prev = g.levels[level] || { score: 0, stars: 0, gain: { creativity: 0, language: 0, friendship: 0 } };
    if (result.stars >= 1) {
      out.firstClear = prev.stars === 0;
      out.improved = result.stars > prev.stars;
      const gain = Object.assign({ creativity: 0, language: 0, friendship: 0 }, result.stats || {});
      // only the improvement over the previous best is added, so replaying cannot farm stats
      for (const k of Object.keys(out.gains)) {
        const delta = Math.max(0, Math.round(gain[k]) - (prev.gain[k] || 0));
        out.gains[k] = delta;
        this.d.stats[k] = Math.min(PROGRESSION.statCap, this.d.stats[k] + delta);
      }
      g.levels[level] = { score: Math.max(prev.score, result.score), stars: Math.max(prev.stars, result.stars), gain: { creativity: Math.max(prev.gain.creativity || 0, Math.round(gain.creativity)), language: Math.max(prev.gain.language || 0, Math.round(gain.language)), friendship: Math.max(prev.gain.friendship || 0, Math.round(gain.friendship)) } };
    } else if (!g.levels[level]) {
      // not passed: remember nothing but keep the play count
    }
    out.newRewards = this.checkRewards();
    out.newBadges = AchievementManager.check();
    SaveSystem.save();
    return out;
  },

  checkRewards() {
    const got = [];
    for (const r of REWARDS) {
      if (this.hasReward(r.id)) continue;
      const w = r.when;
      let ok = false;
      if (w.game) ok = this.isCleared(w.game, w.level);
      else if (w.stat) ok = this.stats()[w.stat] >= w.min;
      else if (w.discoverDone) ok = this.discoverDone();
      if (ok) { this.d.rewards.push(r.id); got.push(r.id); }
    }
    return got;
  },

  // Returns the next growth stage that should happen now, or null.
  pendingGrowth() {
    const cur = CharacterGrowth.index(this.stage());
    for (const m of PROGRESSION.growth) {
      if (CharacterGrowth.index(m.stage) <= cur) continue;
      const ok = (m.levelsCleared !== undefined && this.totalLevelsCleared() >= m.levelsCleared) || (m.discoverDone && this.discoverDone());
      if (ok) return m.stage;
      return null;                               // milestones are ordered
    }
    return null;
  },

  // minigame resume point (Discover Yourself phases)
  phase(id) { return this.game(id).phase || 0; },
  setPhase(id, n) { this.game(id).phase = n; SaveSystem.save(); }
};
