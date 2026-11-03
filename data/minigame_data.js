// ============================================================
// data/minigame_data.js - tuning numbers for the mini-games (not story text).
// ============================================================
const PAINT_COLORS = [
  '#ff8cb4', '#ffd65a', '#96d0ff', '#8fd3a8', '#c8aaff', '#ff9a6b', '#fff4e6', '#8a5a44',   // base 8
  '#e0508a', '#4a8fd0', '#3f8f5f', '#6b4a8f'                                                  // unlocked by "Extra Colors"
];
// mode: free (any colour) | match (copy the reference) | exact (stricter thresholds)
// thresholds: quality needed for 1 / 2 / 3 stars
const PAINT_LEVELS = {
  1: { painting: 'flower',    mode: 'free',  thresholds: [0.6, 0.8, 0.95], minColors: 3, gain: 10 },
  2: { painting: 'house',     mode: 'match', thresholds: [0.55, 0.7, 0.85], gain: 14 },
  3: { painting: 'butterfly', mode: 'exact', thresholds: [0.7, 0.85, 0.95], gain: 18 }
};

// Discover Yourself = 4 short phases built from the other mini-games.
// type: paint | language | social.  cfg is passed to that mini-game.
const DISCOVER_PHASES = [
  { type: 'paint',    cfg: { painting: 'sunset',  mode: 'match', thresholds: [0.5, 0.65, 0.8], gain: 4 } },
  { type: 'language', cfg: { kind: 'detective', count: 5, gain: 4 } },
  { type: 'social',   cfg: { key: 'finale', gain: 4 } },   // = the gentle 'finale' level of the Social Battle (data/social_battle_config.js)
  { type: 'paint',    cfg: { painting: 'balloon', mode: 'free',  thresholds: [0.7, 0.85, 0.95], minColors: 4, gain: 4 } }
];
