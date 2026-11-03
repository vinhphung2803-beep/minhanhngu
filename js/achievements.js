// ============================================================
// achievements.js - AchievementManager: badge rules live in
// data/progression_data.js, names in data/text_ch2.js.
// ============================================================
const AchievementManager = {
  // Unlocks every badge whose test passes now. Returns the list of newly unlocked ids.
  check() {
    const fresh = [];
    for (const b of BADGES) {
      if (ProgressionManager.hasBadge(b.id)) continue;
      let ok = false;
      try { ok = !!b.test(ProgressionManager); } catch (e) { ok = false; }
      if (ok) { ProgressionManager.d.badges.push(b.id); fresh.push(b.id); UIManager.notifyBadge(b.id); }
    }
    if (fresh.length) SaveSystem.save();
    return fresh;
  },
  name(id) { return (CH2_TEXT.badges[id] || {}).name || id; },
  desc(id) { return (CH2_TEXT.badges[id] || {}).desc || ''; },
  all() { return BADGES.map((b) => b.id); }
};
