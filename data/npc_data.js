// ============================================================
// data/npc_data.js - NPC personalities. No dialogue here (text lives in text_ch2.js).
//   speed    : walking speed (px/s)
//   cmdMin   : friendship needed before the NPC obeys Follow / Wait
//   waitMin  : friendship needed to keep waiting forever (below it the NPC gets bored after 5 s)
// Each type has its own condition for being talked to:
//   shy       - you must stand still near it for ~1 s (it backs away if you rush at it)
//   energetic - it only stops to listen right after you HOP near it
//   calm      - after a good talk it needs a short rest before the next one
// ============================================================
const NPC_TYPES = {
  shy:       { speed: 46, cmdMin: 40, waitMin: 0,  stillTime: 1.0, retreatDist: 44 },
  energetic: { speed: 95, cmdMin: 30, waitMin: 60, attentionTime: 2.6 },
  calm:      { speed: 52, cmdMin: 0,  waitMin: 0,  rest: 2.2 }
};
const NPC_STAGES = ['child', 'preteen', 'teen', 'young'];
if (typeof Assets !== 'undefined') Assets.addNpcSheets(Object.keys(NPC_TYPES), NPC_STAGES);
