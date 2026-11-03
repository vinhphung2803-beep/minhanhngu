// ============================================================
// data/ch3_boss.js - Chapter 3: trận boss "Tuổi 18" (turn-based, kế thừa hệ thống trận đánh của Chapter 2).
// Mốc HP (events) có "phase" thay vì câu hỏi: khi HP boss chạm mốc -> đổi bộ chiêu + hiệu ứng, không hỏi đáp.
// Lời dẫn từng phase: CH3_TEXT.boss.phase2/3/4 (bạn tự viết trong NARRATIVE_SCRIPT_VI.md). Tên phase ở đây là nhãn UI ngắn.
// Ảnh hưởng của Chapter 1-2 (xem js/ch3_battle.js): chỉ số Sáng tạo/Ngôn ngữ/Tình bạn tăng sát thương kỹ năng tương ứng;
// huy hiệu 'colorful', 'polyglot', 'best_buddies', 'discoverer', 'growing_up' và phần thưởng 'friendly_aura' cho thêm lợi thế.
// ============================================================
const CH3_BOSS = {
  opponent: { id: 'age18', name: 'Tuổi 18', sheet: 'npc_age18' },
  ui: {
    start: 'Đối đầu Tuổi 18!', barrier: 'Áp lực', victory: 'Bước sang tuổi 19!', defeat: 'Chưa vượt qua...',
    logHitEnemy: 'Tuổi 18 nhận {amount} sát thương!', logWin: 'Tuổi 18 tan thành ánh sáng!', logLose: 'Bạn cần hít thở lấy lại sức...',
    phase: 'Giai đoạn', logPhase: '{name}!',
    menu: { attack: 'Tấn công' },
    desc: { attack: 'Một đòn bình thường nhưng bền bỉ. +1 tia sáng.', defend: 'Đứng vững: nhận ít sát thương hơn trong lượt này.', focus: 'Hít thở sâu, gom tia sáng và hồi chút máu.', skill: 'Dùng kỹ năng bạn đã học qua các chương (tốn tia sáng).' }
  },
  level: {
    title: 'Trận Chiến Tuổi 18',
    player: { hp: 130, atk: 12, sp: 2 },
    enemy: { hp: 170, atk: 9, moves: [          // PHASE 1
      { id: 'weight',   name: 'Kỳ Vọng Nặng Nề', icon: 'wait',     weight: 3, effects: [{ type: 'damage', power: 1.0 }] },
      { id: 'worry',    name: 'Lo Âu Tương Lai', icon: 'question', weight: 2, effects: [{ type: 'damage', power: 0.7 }, { type: 'status', stat: 'atk', mult: 0.85, turns: 2, target: 'other', label: 'Lo âu' }] },
      { id: 'long_day', name: 'Ngày Dài Vô Tận', icon: 'lock',     weight: 1, when: { turnMin: 2 }, effects: [{ type: 'status', stat: 'def', mult: 1.3, turns: 2, target: 'self', label: 'Cố thủ' }] }
    ] },
    events: [
      { at: 0.7, phase: { name: 'Áp Lực Deadline', textKey: 'phase2', atkMult: 1.15, icon: 'wait',
          effects: [{ type: 'status', stat: 'def', mult: 1.3, turns: 3, target: 'self', label: 'Giáp áp lực' }],
          moves: [
            { id: 'deadline', name: 'Deadline Dồn Dập',    icon: 'wait',     weight: 3, effects: [{ type: 'damage', power: 1.4 }] },
            { id: 'compare',  name: 'So Sánh Với Người Khác', icon: 'question', weight: 2, effects: [{ type: 'damage', power: 0.8 }, { type: 'status', stat: 'atk', mult: 0.8, turns: 2, target: 'other', label: 'Tự ti' }] },
            { id: 'sleepless', name: 'Đêm Mất Ngủ',        icon: 'lock',     weight: 1, when: { turnMin: 3 }, effects: [{ type: 'damage', power: 1.0 }, { type: 'skip', target: 'other' }] }
          ] } },
      { at: 0.4, phase: { name: 'Hoang Mang Tuổi Trẻ', textKey: 'phase3', atkMult: 1.15, icon: 'question',
          effects: [{ type: 'heal', frac: 0.08, target: 'self' }],
          moves: [
            { id: 'storm',  name: 'Cơn Bão Quyết Định', icon: 'cross',    weight: 2, when: { turnMin: 3 }, effects: [{ type: 'damage', power: 1.8 }] },
            { id: 'spiral', name: 'Vòng Xoáy Nghĩ Ngợi', icon: 'question', weight: 3, effects: [{ type: 'damage', power: 1.2 }] },
            { id: 'doubt',  name: 'Nghi Ngờ Bản Thân',  icon: 'lock',     weight: 2, effects: [{ type: 'damage', power: 0.5 }, { type: 'skip', target: 'other' }] },
            { id: 'cling',  name: 'Níu Kéo Tuổi Thơ',   icon: 'heart',    weight: 1, when: { hpBelow: 0.5 }, effects: [{ type: 'heal', frac: 0.05, target: 'self' }] }
          ] } },
      { at: 0.15, phase: { name: 'Không Muốn Lớn', textKey: 'phase4', icon: 'cross',
          effects: [{ type: 'status', stat: 'atk', mult: 1.25, turns: 99, target: 'self', label: 'Cố chấp' }],
          moves: [
            { id: 'refuse', name: 'Không Muốn Lớn!', icon: 'cross',    weight: 2, effects: [{ type: 'damage', power: 2.0 }] },
            { id: 'panic',  name: 'Hoảng Loạn',      icon: 'question', weight: 3, effects: [{ type: 'damage', power: 1.2 }] },
            { id: 'breath', name: 'Hơi Thở Cuối',    icon: 'heart',    weight: 1, when: { hpBelow: 0.15 }, effects: [{ type: 'heal', frac: 0.04, target: 'self' }] }
          ] } }
    ],
    penalty: 'weaken', reward: 'bonusHit', choiceCount: 2,
    stars: [0.45, 0.7], gain: 0
  }
};
if (typeof Assets !== 'undefined') Assets.addNpcSheets(['age18'], ['young']);
