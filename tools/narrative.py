#!/usr/bin/env python3
"""Quản lý hội thoại: NARRATIVE_SCRIPT_VI.md  <->  data/narrative_data.js (game).

  python tools/narrative.py init     (1 lần) trích xuất từ data/*.js + bản dịch -> data/narrative_manifest.json + md
  python tools/narrative.py md       tạo lại NARRATIVE_SCRIPT_VI.md từ manifest (CẢNH BÁO: ghi đè EDITED TEXT của bạn!)
  python tools/narrative.py check    kiểm tra md (ID trùng / không tồn tại / thiếu dữ liệu), không ghi gì
  python tools/narrative.py import   đọc md -> ghi data/narrative_data.js (EDITED nếu có nội dung, ngược lại CURRENT)
Game tự áp dụng data/narrative_data.js khi tải (js/narrative.js)."""
import json, os, re, subprocess, sys, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MANIFEST = os.path.join(ROOT, 'data', 'narrative_manifest.json')
MD = os.path.join(ROOT, 'NARRATIVE_SCRIPT_VI.md')
OUT = os.path.join(ROOT, 'data', 'narrative_data.js')
EMPTY_SLOTS = 4      # số ô trống cho mỗi danh sách hội thoại chưa có nội dung

SCENES = {   # (chương, mã cảnh) -> tên cảnh
 ('CH1', 1): 'Mở đầu chương', ('CH1', 2): 'Gợi ý theo từng tuổi', ('CH1', 3): 'Hoàn thành chương',
 ('CH2', 1): 'Mở đầu chương', ('CH2', 2): 'Sau mỗi lần lớn lên', ('CH2', 3): 'Sau mỗi mini-game',
 ('CH2', 4): 'Trận gặp Phùng Thế Vinh (lời dẫn)', ('CH2', 5): 'Trận gặp Phùng Thế Vinh (sự kiện hội thoại)', ('CH2', 6): 'Kết thúc chương',
 ('CH3', 1): 'Mở đầu chương', ('CH3', 2): 'Sau khi lớn lên', ('CH3', 3): 'Trận boss Tuổi 18', ('CH3', 4): 'Kết thúc chương',
 ('ENDING', 1): 'Màn hình kết thúc', ('ENDING', 2): 'Thư',
}
KIND = dict(TTL='tiêu đề/tuổi của chương', DLG='hộp thoại / lời dẫn', HNT='gợi ý hiện ở màn chơi', LBL='nhãn nhỏ dưới "Tuổi N"', NAM='tên đối thủ',
            SIT='tình huống', PRM='câu hỏi', CHO='lựa chọn trả lời', FBC='phản hồi khi chọn đúng', FBW='phản hồi khi chọn sai', LET='thư')
NARR, YOU, VINH, LETTER = 'Narrator (lời dẫn)', 'Bạn (người chơi)', 'Phùng Thế Vinh', 'Người viết thư'

def dump():
    expr = ("({CH1:{title:CHAPTERS[0].title,ages:CHAPTERS[0].ages,intro:CHAPTERS[0].intro,complete:CHAPTERS[0].complete},"
            "HINTS:LEVEL_1_HINTS,CH2:CH2_TEXT,CH3:CH3_TEXT,ENDING:ENDING,LF:LETTER_FROM,LP:LETTER_PAGES,Q:SOCIAL_BATTLE_QUESTIONS})")
    r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'dump_data.js'), expr], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)

def slots(d):
    """Danh sách ô hội thoại: dict(path, list, idx, ch, sc, kind, char, en)."""
    out = []
    def one(path, ch, sc, kind, char, en, key=None): out.append(dict(path=path, ch=ch, sc=sc, kind=kind, char=char, en=en, key=key))
    def lst(path, arr, ch, sc, char):
        n = max(len(arr), EMPTY_SLOTS)
        for i in range(n):
            e = dict(path='%s[%d]' % (path, i), list=path, idx=i, ch=ch, sc=sc, kind='DLG', char=char, en=arr[i] if i < len(arr) else '', key=None)
            out.append(e)
    c1 = d['CH1']
    one('CHAPTERS[0].title', 'CH1', 1, 'TTL', NARR, c1['title']); one('CHAPTERS[0].ages', 'CH1', 1, 'TTL', NARR, c1['ages'])
    lst('CHAPTERS[0].intro', c1['intro'], 'CH1', 1, NARR)
    for k in sorted(d['HINTS']): one("LEVEL_1_HINTS['%s']" % k, 'CH1', 2, 'HNT', NARR, d['HINTS'][k])
    lst('CHAPTERS[0].complete', c1['complete'], 'CH1', 3, NARR)
    c2 = d['CH2']
    one('CH2_TEXT.chapterTitle', 'CH2', 1, 'TTL', NARR, c2['chapterTitle']); one('CH2_TEXT.chapterAges', 'CH2', 1, 'TTL', NARR, c2['chapterAges'])
    lst('CH2_TEXT.intro', c2['intro'], 'CH2', 1, NARR)
    for st in ('child', 'preteen', 'teen'):
        one('CH2_TEXT.growthLabel.%s' % st, 'CH2', 2, 'LBL', NARR, c2['growthLabel'][st])
        lst('CH2_TEXT.afterGrowth.%s' % st, c2['afterGrowth'][st], 'CH2', 2, NARR)
    for g in ('artist', 'language', 'friends', 'discover'): lst('CH2_TEXT.afterGame.%s' % g, c2['afterGame'][g], 'CH2', 3, NARR)
    one('CH2_TEXT.battle.opponentName', 'CH2', 4, 'NAM', VINH, c2['battle']['opponentName'])
    for k, ch in (('intro', NARR), ('victory', VINH), ('defeat', VINH)): lst('CH2_TEXT.battle.' + k, c2['battle'][k], 'CH2', 4, ch)
    for q in d['Q']:
        b = 'SOCIAL_BATTLE_QUESTIONS[id=%s]' % q['id']
        one(b + '.situation', 'CH2', 5, 'SIT', NARR, q.get('situation', ''), q['id'])
        one(b + '.prompt', 'CH2', 5, 'PRM', NARR, q.get('prompt', ''), q['id'])
        for c in q['choices']: one(b + '.choices[id=%s].text' % c['id'], 'CH2', 5, 'CHO', YOU, c['text'], q['id'] + '_' + c['id'])
        fb = q.get('feedback') or {}
        one(b + '.feedback.correct', 'CH2', 5, 'FBC', VINH, fb.get('correct', ''), q['id'])
        one(b + '.feedback.wrong', 'CH2', 5, 'FBW', VINH, fb.get('wrong', ''), q['id'])
    lst('CH2_TEXT.finale', c2['finale'], 'CH2', 6, NARR)
    c3 = d['CH3']
    one('CH3_TEXT.chapterTitle', 'CH3', 1, 'TTL', NARR, c3['chapterTitle']); one('CH3_TEXT.chapterAges', 'CH3', 1, 'TTL', NARR, c3['chapterAges'])
    lst('CH3_TEXT.intro', c3['intro'], 'CH3', 1, NARR)
    for st in ('young', 'adult'):
        one('CH3_TEXT.growthLabel.%s' % st, 'CH3', 2, 'LBL', NARR, c3['growthLabel'].get(st, ''))
        lst('CH3_TEXT.afterGrowth.%s' % st, c3['afterGrowth'].get(st, []), 'CH3', 2, NARR)
    for k in ('intro', 'phase2', 'phase3', 'phase4', 'victory', 'defeat'):      # lời dẫn trận boss Tuổi 18 (chỉ khi dữ liệu có khóa 'boss')
        arr = (c3.get('boss') or {}).get(k)
        if arr is not None: lst('CH3_TEXT.boss.' + k, arr, 'CH3', 3, NARR)
    lst('CH3_TEXT.finale', c3['finale'], 'CH3', 4, NARR)
    for k in ('line1', 'line2', 'line3'): one('ENDING.' + k, 'ENDING', 1, 'DLG', NARR, d['ENDING'][k])
    one('LETTER_FROM', 'ENDING', 2, 'LET', LETTER, d['LF'])
    lst('LETTER_PAGES', d['LP'], 'ENDING', 2, LETTER)
    return out

def build_manifest():
    from narrative_tr import TR
    old = {e['path']: e for e in json.load(open(MANIFEST, encoding='utf-8'))} if os.path.exists(MANIFEST) else {}
    d = dump(); sl = slots(d)
    used = {e['id'] for e in old.values()}
    counters = {}
    for e in old.values():
        m = re.match(r'(\w+_SC\d\d)_DLG(\d+)$', e['id'])
        if m: counters[m.group(1)] = max(counters.get(m.group(1), 0), int(m.group(2)))
    res, errs = [], []
    for s in sl:
        p = s['path']; pre = '%s_SC%02d' % (s['ch'], s['sc'])
        if p in old: e = old[p]; e.update({k: s[k] for k in ('ch', 'sc', 'char', 'list', 'idx') if k in s}); res.append(e); continue
        if s['kind'] == 'DLG' or s['kind'] in ('TTL', 'HNT', 'LBL', 'NAM', 'LET'):
            counters[pre] = counters.get(pre, 0) + 1; i = '%s_DLG%03d' % (pre, counters[pre])
        else: i = '%s_%s_%s' % (pre, s['kind'], s['key'])
        if i in used: errs.append('ID trùng khi tạo: ' + i)
        used.add(i)
        en = s['en']; vi = TR.get(en, en) if en else ''
        if en and en not in TR and re.search(r'[A-Za-z]{3}', en): errs.append('Chưa có bản dịch: %r (%s)' % (en, p))
        e = dict(id=i, path=p, ch=s['ch'], sc=s['sc'], kind=s['kind'], char=s['char'], en=en, vi=vi)
        if 'list' in s: e['list'] = s['list']; e['idx'] = s['idx']
        res.append(e)
    return res, errs

def write_md(man, edited=None):
    edited = edited or {}
    L = ['# NARRATIVE_SCRIPT_VI – CMSN CON THƯ BÉO PHÌ', '',
         'Sửa nội dung ở dòng sau **EDITED TEXT:**. Để trống = giữ CURRENT TEXT. **Không đổi dòng `### ID:`**.',
         'Xuống dòng trong game = xuống dòng trong ô văn bản. Sau khi sửa chạy: `python tools/narrative.py import`.',
         'Ô có ghi `Note: THIẾU` là chỗ game đang để trống (do bạn tự viết); chỉ cần điền EDITED TEXT.',
         'Phần Language Detective (từ vựng/câu tiếng Anh, `data/vocab.js`) cố ý không nằm trong file này.', '']
    last = None
    for e in sorted(man, key=lambda e: (['CH1', 'CH2', 'CH3', 'ENDING'].index(e['ch']), e['sc'])):
        key = (e['ch'], e['sc'])
        if key != last:
            head = ('CHAPTER %s' % e['ch'][2:]) if e['ch'].startswith('CH') else 'KẾT THÚC GAME'
            L += ['', '## %s – SCENE %02d · %s' % (head, e['sc'], SCENES[key]), '']; last = key
        L += ['### ID: ' + e['id'], 'Character: ' + e['char'], 'Loại: ' + KIND.get(e['kind'], e['kind']), 'Nguồn: ' + e['path']]
        if not e['vi']: L.append('Note: THIẾU – game đang để trống ô này (tùy chọn). Điền EDITED TEXT nếu muốn dùng.')
        L += ['', 'CURRENT TEXT:', e['vi'], '', 'EDITED TEXT:', edited.get(e['id'], ''), '', '---', '']
    open(MD, 'w', encoding='utf-8').write('\n'.join(L).rstrip('\n') + '\n')

def parse_md():
    txt = open(MD, encoding='utf-8').read().replace('\r\n', '\n')
    blocks = re.split(r'^### ID:[ \t]*', txt, flags=re.M)[1:]
    res, errs = {}, []
    for b in blocks:
        i, _, rest = b.partition('\n'); i = i.strip()
        rest = re.split(r'^## ', rest, flags=re.M)[0]                       # cắt tiêu đề cảnh kế tiếp
        m = re.search(r'^CURRENT TEXT:[ \t]*\n(.*?)^EDITED TEXT:[ \t]*\n?(.*)$', rest, flags=re.M | re.S)
        if not m: errs.append('%s: thiếu "CURRENT TEXT:" hoặc "EDITED TEXT:"' % i); continue
        clean = lambda s: re.sub(r'\n---\s*$', '', s.rstrip()).strip('\n')
        cur = clean(m.group(1)); ed = clean(re.sub(r'\n?---\s*$', '', m.group(2).rstrip()))
        if i in res: errs.append('ID trùng trong file: ' + i); continue
        res[i] = (cur, ed)
    return res, errs

def check(man):
    res, errs = parse_md(); known = {e['id']: e for e in man}; warns = []
    for i in res:
        if i not in known: errs.append('ID không tồn tại trong game: ' + i)
    for i, e in known.items():
        if i not in res: warns.append('Thiếu khối %s trong file (giữ CURRENT TEXT)' % i)
        elif res[i][0] != e['vi']: warns.append('%s: CURRENT TEXT trong file khác bản gốc (bỏ qua, chỉ dùng EDITED TEXT)' % i)
    return res, errs, warns

def do_import(man):
    res, errs, warns = check(man)
    for w in warns: print('CẢNH BÁO', w)
    if errs:
        for e in errs: print('LỖI', e)
        print('=> KHÔNG ghi %s (sửa lỗi rồi chạy lại).' % os.path.relpath(OUT, ROOT)); return 1
    entries, edited = [], 0
    for e in man:
        ed = res.get(e['id'], ('', ''))[1]; txt = ed if ed.strip() else e['vi']; edited += bool(ed.strip())
        x = dict(id=e['id'], path=e['path'], text=txt)
        if 'list' in e: x['list'] = e['list']; x['idx'] = e['idx']
        entries.append(x)
    open(OUT, 'w', encoding='utf-8').write('// AUTO-GENERATED by tools/narrative.py import - đừng sửa tay (sửa NARRATIVE_SCRIPT_VI.md rồi import lại)\n'
        'const NARRATIVE_DATA = %s;\n' % json.dumps(entries, ensure_ascii=False, indent=0))
    print('OK: %d ô, %d ô dùng EDITED TEXT -> %s' % (len(entries), edited, os.path.relpath(OUT, ROOT))); return 0

if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(__file__))
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'init':
        man, errs = build_manifest()
        if errs: print('\n'.join(errs)); sys.exit(1)
        old_ed = {}
        if os.path.exists(MD): old_ed = {i: v[1] for i, v in parse_md()[0].items() if v[1].strip()}     # giữ EDITED TEXT đã viết
        json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); write_md(man, old_ed)
        print('init OK: %d ô -> %s, NARRATIVE_SCRIPT_VI.md' % (len(man), os.path.relpath(MANIFEST, ROOT)))
    else:
        man = json.load(open(MANIFEST, encoding='utf-8'))
        if cmd == 'md': write_md(man); print('md OK (đã ghi đè EDITED TEXT!)')
        elif cmd == 'check':
            _, errs, warns = check(man); [print('CẢNH BÁO', w) for w in warns]; [print('LỖI', e) for e in errs]
            print('check:', 'LỖI' if errs else 'OK'); sys.exit(1 if errs else 0)
        elif cmd == 'import': sys.exit(do_import(man))
        else: print(__doc__)
