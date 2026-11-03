// ============================================================
// data/social_battle_config.js - Social Battle: everything you may want to TUNE.
// (Questions live in data/social_battle_questions.js, words/labels in data/text_ch2.js -> CH2_TEXT.battle.)
//
// The battle engine (js/battle_engine.js) reads ONLY data, so you can change numbers,
// thresholds, skills and effects here without touching code.
//
// ---------- EFFECTS (used by skills, enemy moves, rewards, penalties) ----------
// { type:'damage',     power:1.5 }                    damage = power * attacker ATK (variance, defence, guard applied)
// { type:'flatDamage', amount:8 }  or { frac:0.1 }    fixed damage (frac = fraction of the target's max HP)
// { type:'heal',       frac:0.3 }  or { amount:20 }   heal
// { type:'status',     stat:'atk'|'def'|'guard', mult:1.3, turns:2, label:'Inspired' }   buff / debuff
// { type:'skip' }                                      target loses its next turn
// { type:'sp',         amount:2 }                      spark points (player only)
// Every effect may have  target: 'self' | 'other'  (default: damage/flatDamage/skip -> 'other', heal/sp -> 'self',
//                                                   status -> 'other' if mult<1 else 'self')
// "self/other" are relative to whoever acts. For rewards the actor is the PLAYER, for penalties and enemy
// moves the actor is the OPPONENT (so a penalty with target:'other' hits the player).
// A new effect type: add a function to BattleEngine.effectHandlers (see docs/SOCIAL_BATTLE.md).
//
// ---------- HP THRESHOLD EVENTS ----------
// level.events = [ { at: 0.75, ... }, ... ]   at = fraction of the opponent's MAX HP (0 < at < 1).
// The first time the opponent's HP reaches or falls below that value the battle pauses and a
// conversation starts. Damage is capped at the threshold, so a strong hit can NEVER skip an event,
// and each event fires exactly once per battle. At 0 HP the player wins.
// Optional per-event keys: tags:['easy'] (only questions having all these tags), question:'id' (force one
// question), reward:'presetId', penalty:'presetId', note:'...'.
// ============================================================
const SOCIAL_BATTLE = {
  // The one opponent. 'sheet' is a PLACEHOLDER sprite family (npc_<type>_<stage>); swap it when
  // dedicated art for the character exists. Name text can be changed in text_ch2.js (battle.opponentName).
  opponent: { id: 'vinh', name: 'Phung The Vinh', sheet: 'npc_vinh', placeholderSprite: true },   // npc_vinh = npc_calm + kính cận (tools/make_vinh_glasses.py); chỉ dùng trong màn đánh Chapter 2

  tuning: {
    variance: 0.1,          // +-10 % random damage
    statScale: 0.004,       // skill power +0.4 % per point of the matching Chapter-2 stat (max 100 -> +40 %)
    guardMult: 0.4,         // damage taken while defending
    spPerTurn: 1,           // spark points regained at the start of every player turn
    attackSp: 1,            // spark points gained by a normal attack
    defendSp: 1,
    focusSp: 3, focusHeal: 0.08,
    maxSp: 6,
    defaultReward: 'bonusHit',
    defaultPenalty: 'loseTurn',
    maxLogLines: 4
  },

  // Skills (max 4 are shown). cost = spark points. stat = Chapter-2 stat that makes it stronger.
  // vfx: 'sparkles' | 'letters' | 'hearts' (just the look). icon: name from ICON_INDEX (data/paintings.js)
  skills: [
    { id: 'sketch_burst', name: 'Bùng Nổ Nét Vẽ', icon: 'brush', cost: 2, stat: 'creativity', vfx: 'sparkles',
      desc: 'Một loạt nét vẽ nguệch ngoạc đầy màu sắc. Đòn mạnh.',
      effects: [{ type: 'damage', power: 1.9 }] },
    { id: 'word_wave', name: 'Làn Sóng Từ Ngữ', icon: 'book', cost: 2, stat: 'language', vfx: 'letters',
      desc: 'Lời thân thiện bằng nhiều thứ tiếng. Gây sát thương + giảm phòng thủ của rào cản.',
      effects: [{ type: 'damage', power: 1.0 }, { type: 'status', stat: 'def', mult: 0.7, turns: 2, target: 'other', label: 'Cởi mở' }] },
    { id: 'warm_smile', name: 'Nụ Cười Ấm Áp', icon: 'heart', cost: 3, stat: 'friendship', vfx: 'hearts',
      desc: 'Hồi máu cho bạn và tăng sức mạnh các đòn tiếp theo.',
      effects: [{ type: 'heal', frac: 0.3 }, { type: 'status', stat: 'atk', mult: 1.3, turns: 2, target: 'self', label: 'Ấm áp' }] }
  ],

  // Correct answers: the preset used is  question.reward > event.reward > topic.reward > level.reward > tuning.defaultReward
  rewards: {
    bonusHit: { icon: 'sparkle', label: 'Chủ đề tuyệt vời! Đòn thưởng!', effects: [{ type: 'damage', power: 1.7 }] },
    healUp:   { icon: 'heart',   label: 'Dễ chịu quá! Bạn hồi sức.', effects: [{ type: 'heal', frac: 0.3 }] },
    powerUp:  { icon: 'medal',   label: 'Hứng khởi! Đòn đánh của bạn mạnh hơn.', effects: [{ type: 'status', stat: 'atk', mult: 1.5, turns: 3, target: 'self', label: 'Hứng khởi' }] },
    bondBoost:{ icon: 'heart',   label: 'Hai bạn hợp nhau ghê! Gây sát thương + hồi máu.', effects: [{ type: 'damage', power: 1.1 }, { type: 'heal', frac: 0.15 }] },
    calmDown: { icon: 'wait',    label: 'Rào cản thả lỏng và mất một lượt.', effects: [{ type: 'skip', target: 'other' }, { type: 'damage', power: 0.8 }] }
  },
  // Wrong answers: question.penalty > event.penalty > level.penalty > tuning.defaultPenalty
  penalties: {
    loseTurn: { icon: 'wait',  label: 'Im lặng gượng gạo... bạn mất lượt kế tiếp.', effects: [{ type: 'skip', target: 'other' }] },
    counter:  { icon: 'cross', label: 'Ối! Rào cản đẩy ngược lại.', effects: [{ type: 'damage', power: 1.1 }] },
    weaken:   { icon: 'cross', label: 'Lạc điệu rồi... đòn đánh của bạn yếu đi một lúc.', effects: [{ type: 'status', stat: 'atk', mult: 0.7, turns: 2, target: 'other', label: 'Bối rối' }] },
    stumble:  { icon: 'cross', label: 'Bạn vấp váp trong lời nói.', effects: [{ type: 'damage', power: 0.6 }, { type: 'status', stat: 'atk', mult: 0.85, turns: 2, target: 'other', label: 'Bối rối' }] }
  },

  // Levels (1-3 = the three levels of the "Making Friends" station, 'finale' = Discover Yourself phase 3)
  //   player.hp / atk, enemy.hp / atk / moves, events (thresholds), choiceCount (answers shown per question),
  //   stars: quality needed for 2 / 3 stars (a win is always >= 1 star), gain: friendship stat gained on a win
  //   gentle: true -> the player can never be defeated (HP stays >= 1) - used by Discover Yourself
  levels: {
    '1': {
      title: 'Breaking the Ice',
      player: { hp: 90, atk: 9 },
      enemy: { hp: 70, atk: 7, moves: [
        { id: 'silence',  name: 'Im Lặng Gượng Gạo', icon: 'wait',   weight: 3, effects: [{ type: 'damage', power: 1.0 }] },
        { id: 'look_away', name: 'Quay Mặt Đi',      icon: 'cross',  weight: 2, effects: [{ type: 'damage', power: 0.6 }, { type: 'status', stat: 'atk', mult: 0.85, turns: 2, target: 'other', label: 'Lo lắng' }] }
      ] },
      events: [{ at: 0.66, tags: ['easy'] }, { at: 0.33, tags: ['easy'] }],
      choiceCount: 3, penalty: 'weaken', reward: 'bonusHit',
      stars: [0.45, 0.7], gain: 10
    },
    '2': {
      title: 'Common Ground',
      player: { hp: 100, atk: 10 },
      enemy: { hp: 110, atk: 11, moves: [
        { id: 'silence',  name: 'Im Lặng Gượng Gạo', icon: 'wait',  weight: 3, effects: [{ type: 'damage', power: 1.0 }] },
        { id: 'mumble',   name: 'Lời Lầm Bầm',   icon: 'question', weight: 2, effects: [{ type: 'damage', power: 1.35 }] },
        { id: 'wall',     name: 'Dựng Bức Tường',    icon: 'lock',  weight: 1, when: { turnMin: 2 }, effects: [{ type: 'status', stat: 'def', mult: 1.5, turns: 2, target: 'self', label: 'Phòng bị' }] }
      ] },
      events: [{ at: 0.75 }, { at: 0.5 }, { at: 0.25 }],
      choiceCount: 4, penalty: 'counter',
      stars: [0.5, 0.75], gain: 14
    },
    '3': {
      title: 'True Friends',
      player: { hp: 105, atk: 11 },
      enemy: { hp: 170, atk: 14, moves: [
        { id: 'silence',  name: 'Im Lặng Gượng Gạo', icon: 'wait',  weight: 2, effects: [{ type: 'damage', power: 1.0 }] },
        { id: 'mumble',   name: 'Lời Lầm Bầm',   icon: 'question', weight: 2, effects: [{ type: 'damage', power: 1.35 }] },
        { id: 'close_off', name: 'Khép Lòng',    icon: 'lock',  weight: 1, when: { turnMin: 3 }, effects: [{ type: 'damage', power: 1.8 }] },
        { id: 'wall',     name: 'Dựng Bức Tường',    icon: 'lock',  weight: 1, when: { turnMin: 2 }, effects: [{ type: 'status', stat: 'def', mult: 1.5, turns: 2, target: 'self', label: 'Phòng bị' }] },
        { id: 'breath',   name: 'Hít Thở Sâu',     icon: 'heart', weight: 1, when: { hpBelow: 0.6 }, effects: [{ type: 'heal', frac: 0.06, target: 'self' }] }
      ] },
      events: [{ at: 0.8 }, { at: 0.6 }, { at: 0.4 }, { at: 0.2 }],
      choiceCount: 4, penalty: 'stumble',
      stars: [0.55, 0.8], gain: 18
    },
    finale: {
      title: 'The Challenge',
      gentle: true,
      player: { hp: 80, atk: 9 },
      enemy: { hp: 45, atk: 5, moves: [
        { id: 'silence', name: 'Im Lặng Gượng Gạo', icon: 'wait', weight: 1, effects: [{ type: 'damage', power: 0.8 }] }
      ] },
      events: [{ at: 0.5, tags: ['easy'] }],
      choiceCount: 3, penalty: 'weaken',
      stars: [0.3, 0.6], gain: 4
    }
  }
};
// Đăng ký sheet riêng của Vinh (npc_vinh_<stage>); không ảnh hưởng NPC khác.
if (typeof Assets !== 'undefined') Assets.addNpcSheets(['vinh'], ['child', 'preteen', 'teen', 'young']);
