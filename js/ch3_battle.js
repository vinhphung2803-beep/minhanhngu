// ============================================================
// ch3_battle.js - Trận boss "Tuổi 18" (Chapter 3). Kế thừa BattleMinigame (js/social_battle.js) - không viết lại hệ thống đánh.
// Khác Chapter 2: không có câu hỏi; mốc HP = chuyển phase (data/ch3_boss.js); kỹ năng/huy hiệu của các chương trước ảnh hưởng thật.
// ============================================================
class Ch3BossBattle extends BattleMinigame {
  get data() {
    if (!this._d) {
      const P = ProgressionManager, base = JSON.parse(JSON.stringify(SOCIAL_BATTLE));
      const lv = JSON.parse(JSON.stringify(CH3_BOSS.level)), notes = [];
      const sk = (id) => base.skills.find((s) => s.id === id);
      if (P.hasBadge('colorful') && sk('sketch_burst')) { sk('sketch_burst').effects[0].power += 0.35; notes.push('Muôn Màu'); }
      if (P.hasBadge('polyglot') && sk('word_wave')) { sk('word_wave').effects.push({ type: 'status', stat: 'atk', mult: 0.85, turns: 2, target: 'other', label: 'Chùn bước' }); notes.push('Polyglot'); }
      if (P.hasBadge('best_buddies') && sk('warm_smile')) { sk('warm_smile').effects[0].frac += 0.15; notes.push('Bạn Thân'); }
      if (P.hasBadge('discoverer')) { lv.player.hp = Math.round(lv.player.hp * 1.15); notes.push('Nhà Khám Phá'); }
      if (P.hasBadge('growing_up')) { lv.player.sp = 3; notes.push('Lớn Lên'); }
      base.skills.forEach((s) => { if (s.id === 'sketch_burst' && P.hasBadge('colorful')) s.desc += ' (+Muôn Màu)'; if (s.id === 'word_wave' && P.hasBadge('polyglot')) s.desc += ' (+Polyglot)'; if (s.id === 'warm_smile' && P.hasBadge('best_buddies')) s.desc += ' (+Bạn Thân)'; });
      base.opponent = CH3_BOSS.opponent; base.levels = { '1': lv }; base.bonusNotes = notes;
      this._d = base;
    }
    return this._d;
  }
  get bank() { return []; }
  get texts() { return Object.assign({}, CH3_TEXT.boss || {}, { opponentName: CH3_BOSS.opponent.name }); }
  get uiOverride() { return CH3_BOSS.ui; }
  opponentSheet() { return 'npc_age18_young'; }
  winStats() { return {}; }
  detailLine(s) { return s.turns + ' lượt'; }
}
MinigameManager.register('boss18', Ch3BossBattle);
