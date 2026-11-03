// ============================================================
// data/progression_data.js - rules for unlocks, growth, rewards, badges.
// Names/descriptions of badges and rewards are in data/text_ch2.js.
// ============================================================
const PROGRESSION = {
  chapter2Stage: 'child',                       // stage the hero grows into when Chapter 2 starts
  levelsPerGame: { artist: 3, language: 3, friends: 3, discover: 1, boss18: 1 },
  discoverRequires: { creativity: 30, language: 30, friendship: 30 },   // stats needed to open Discover Yourself
  // growth milestones, checked in order whenever the player returns to the hub
  growth: [
    { stage: 'preteen', levelsCleared: 4 },     // after 4 mini-game levels cleared
    { stage: 'teen', discoverDone: true }       // after Discover Yourself
  ],
  statCap: 100
};

// when: {game, level} (level cleared)  |  {stat, min}  |  {discoverDone:true}
const REWARDS = [
  { id: 'palette_plus',  when: { game: 'artist',   level: 2 } },
  { id: 'hint_lens',     when: { game: 'language', level: 2 } },
  { id: 'friendly_aura', when: { game: 'friends',  level: 2 } },
  { id: 'sparkle_trail', when: { stat: 'creativity', min: 50 } }
];

// test(P) gets the ProgressionManager
const BADGES = [
  { id: 'first_brush',    test: (P) => P.isCleared('artist', 1) },
  { id: 'colorful',       test: (P) => P.gameComplete('artist') },
  { id: 'true_colors',    test: (P) => P.stars('artist', 3) >= 3 },
  { id: 'first_words',    test: (P) => P.isCleared('language', 1) },
  { id: 'polyglot',       test: (P) => P.gameComplete('language') },
  { id: 'word_detective', test: (P) => P.stars('language', 3) >= 3 },
  { id: 'hello_friend',   test: (P) => P.isCleared('friends', 1) },
  { id: 'team_player',    test: (P) => P.isCleared('friends', 2) },
  { id: 'best_buddies',   test: (P) => P.gameComplete('friends') },
  { id: 'discoverer',     test: (P) => P.discoverDone() },
  { id: 'growing_up',     test: (P) => CharacterGrowth.index(P.stage()) >= 2 },
  { id: 'all_rounder',    test: (P) => P.totalStars() >= 18 }
];
