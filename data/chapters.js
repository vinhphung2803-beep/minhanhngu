// ============================================================
// data/chapters.js - The whole story in one place.
// To add a chapter: create data/levelN.js (same format as level1.js),
// then fill in `rows`, `hints` and set `playable: true`.
// Chapters with playable:false are shown as story cards in the
// "memory lane" before the birthday ending (see Game.showMemoryLane).
// ============================================================
const CHAPTERS = [
  {
    id: 1, kind: 'platformer', playable: true,
    title: 'The Little Seed', ages: 'Age 1-5',
    rows: LEVEL_1, hints: LEVEL_1_HINTS,
    ageStages: 5,
    intro: [
      'Every story starts small.',
      'A first crawl. A first hop.\nA first curious look at the world.',
      'Collect stars, hearts and paper planes\non the way. Ready?'
    ],
    complete: ['Little things add up.', 'You learned to crawl, hop and explore.']
  },
  {
    id: 2, kind: 'world', playable: true,
    title: CH2_TEXT.chapterTitle, ages: CH2_TEXT.chapterAges,
    intro: CH2_TEXT.intro,
    world: { id: 2, rows: CH2_HUB_ROWS, startStage: 'child', text: CH2_TEXT, exitTo: 2, exitNeedsDiscover: true }
  },
  {
    id: 3, kind: 'world', playable: true,
    title: CH3_TEXT.chapterTitle, ages: CH3_TEXT.chapterAges,
    intro: CH3_TEXT.intro,
    world: { id: 3, rows: CH3_ROWS, startStage: 'young', text: CH3_TEXT, exitTo: 'ending', exitNeedsDiscover: false, exitNeedsBoss: true }
  }
];

// Message shown on the final birthday screen. Edit freely.
const ENDING = {
  line1: 'And all of them make you, YOU.',
  line2: 'The journey continues...',
  line3: 'Happy 19th Birthday!'
};

// Small label on story cards of chapters that are not playable yet.
// Set to '' to hide it.
const WIP_LABEL = 'Playable chapter coming soon';
