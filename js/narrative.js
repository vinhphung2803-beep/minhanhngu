// ============================================================
// narrative.js - áp dụng data/narrative_data.js (sinh bởi tools/narrative.py import) lên dữ liệu game.
// Mỗi mục: { id, path, text, list?, idx? }. Đường dẫn: CH2_TEXT.afterGrowth.child[0], SOCIAL_BATTLE_QUESTIONS[id=x].prompt ...
// Danh sách (list) được cập nhật TẠI CHỖ (giữ nguyên tham chiếu mảng) và bỏ các ô trống.
// ============================================================
const Narrative = {
  errors: [],
  roots() { return { CHAPTERS, CH2_TEXT, CH3_TEXT, LEVEL_1_HINTS, ENDING, SOCIAL_BATTLE_QUESTIONS, LETTER_PAGES }; },
  tokens(path) {
    const t = [], re = /([A-Za-z_]\w*)|\[(\d+)\]|\['([^']*)'\]|\[id=([^\]]+)\]/g; let m;
    while ((m = re.exec(path))) t.push(m[1] !== undefined ? { k: m[1] } : m[2] !== undefined ? { i: +m[2] } : m[3] !== undefined ? { k: m[3] } : { id: m[4] });
    return t;
  },
  // trả về { parent, key } của phần tử cuối đường dẫn
  locate(path, create) {
    const tk = this.tokens(path), roots = this.roots();
    let cur = roots[tk[0].k];
    if (tk[0].k === 'LETTER_FROM') return { special: 'LETTER_FROM' };
    if (cur === undefined) return null;
    if (tk.length === 1) return { parent: roots, key: tk[0].k };
    for (let n = 1; n < tk.length; n++) {
      const t = tk[n], last = n === tk.length - 1;
      let key;
      if (t.id !== undefined) { key = (cur || []).findIndex((o) => o && o.id === t.id); if (key < 0) return null; }
      else key = t.i !== undefined ? t.i : t.k;
      if (last) return { parent: cur, key };
      if (cur[key] === undefined || cur[key] === null) { if (create && t.id === undefined) cur[key] = {}; else return null; }
      cur = cur[key];
    }
    return null;
  },
  apply(entries) {
    const lists = {};
    entries.forEach((e) => {
      if (e.list) { (lists[e.list] = lists[e.list] || []).push(e); return; }
      if (e.text === '' && !this.locate(e.path)) return;          // ô trống ở chỗ dữ liệu chưa có khóa: không cần tạo
      const loc = this.locate(e.path, true);
      if (!loc) { this.errors.push('path? ' + e.path); return; }
      if (loc.special === 'LETTER_FROM') { LETTER_FROM = e.text; return; }
      if (e.text !== '' || loc.parent[loc.key] !== undefined) loc.parent[loc.key] = e.text;
    });
    Object.keys(lists).forEach((lp) => {
      const loc = this.locate(lp); if (!loc) { this.errors.push('list? ' + lp); return; }
      const arr = loc.parent[loc.key]; if (!Array.isArray(arr)) { this.errors.push('not array ' + lp); return; }
      const items = lists[lp].sort((a, b) => a.idx - b.idx).map((x) => x.text).filter((s) => s && s.trim() !== '');
      arr.length = 0; items.forEach((s) => arr.push(s));
    });
    // các bản sao chuỗi trong CHAPTERS (chapters.js sao chép tiêu đề Chapter 2/3 lúc nạp)
    if (typeof CHAPTERS !== 'undefined') {
      CHAPTERS[1].title = CH2_TEXT.chapterTitle; CHAPTERS[1].ages = CH2_TEXT.chapterAges;
      CHAPTERS[2].title = CH3_TEXT.chapterTitle; CHAPTERS[2].ages = CH3_TEXT.chapterAges;
    }
    if (this.errors.length) console.warn('[Narrative]', this.errors);
  }
};
if (typeof NARRATIVE_DATA !== 'undefined') Narrative.apply(NARRATIVE_DATA);
