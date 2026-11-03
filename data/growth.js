// ============================================================
// data/growth.js - Growth stages of the character (used by CharacterGrowth).
// id      : used in code and in the save file
// age     : number shown on the HUD (edit freely - purely a label)
// sheet   : key of the sprite sheet loaded in assets.js (11 frames of 32x32)
// hitbox  : physics box (separate from the sprite size)
// animSet : 'crawl' (baby clips) or 'walk' (standing clips)
// Chapter 3 can call CharacterGrowth.evolve(Game, 'young', cb) to reuse the cutscene.
// ============================================================
const GROWTH_STAGES = [
  { id: 'baby',    age: 1,  sheet: 'baby',    hitbox: { w: 16, h: 16 }, animSet: 'crawl' },
  { id: 'child',   age: 6,  sheet: 'child',   hitbox: { w: 12, h: 20 }, animSet: 'walk' },
  { id: 'preteen', age: 10, sheet: 'preteen', hitbox: { w: 12, h: 24 }, animSet: 'walk' },
  { id: 'teen',    age: 14, sheet: 'teen',    hitbox: { w: 12, h: 27 }, animSet: 'walk' },
  { id: 'young',   age: 18, sheet: 'young',   hitbox: { w: 12, h: 28 }, animSet: 'walk' },
  { id: 'adult',   age: 19, sheet: 'adult',   hitbox: { w: 12, h: 28 }, animSet: 'walk' }   // Chapter 3: sau khi thắng Tuổi 18
];
