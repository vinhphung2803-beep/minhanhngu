// ============================================================
// data/level1.js - Chapter 1: THE LITTLE SEED (Age 1-5)
// 100 x 12 tiles = 1600 x 192 px
// Legend:
//   #  ground (grass top is automatic)      B  stone      W  wooden plank
//   S  spawn          C  checkpoint          E  chapter exit arch
//   *  golden star    h  pink heart          p  blue paper plane
//   f g  flowers   T tree   b bush   m mushroom   s sign   k toy block
//   1-9  invisible hint triggers (text lives in the chapter's `hints`)
//   .  empty
// Every row MUST have the same length. Edit the letters to redesign the level!
// ============================================================
const LEVEL_1 = [
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '.............................................................................p......................',
  '.........................................................*p.................WWW.....................',
  '..................p......*.......h...................*...WW..h..........*...........................',
  '....1...*.*.*..h.WWW....*.*......BB..............*...WW......WW...4....WWW............h..5..........',
  '..S.s.T..f...g.b..2..Tm......fg.BBBB.bk.C3.T.....WW..............fgT.C..........b.mf.T..gs.f..E..T..',
  '########################...###################.................#####################################',
  '########################...###################.................#####################################'
];

// Hint texts shown (non-blocking) when the player walks through a trigger.
const LEVEL_1_HINTS = {
  '1': 'Age 1. Everything is new.\nUse A / D or arrow keys to crawl.',
  '2': 'Press SPACE to hop.\nTiny hops, big steps.',
  '3': 'Stars are curiosity.\nHearts are kindness.',
  '4': 'Paper planes are imagination.\nLook up!',
  '5': 'Almost there.\nStanding up is next.'
};
