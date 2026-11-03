"""Generates Chapter 2 art + painting data.  Run: python tools/make_ch2_assets.py
 assets/environments/stations.png  props.png
 assets/ui/icons.png  badges.png  vocab.png
 data/paintings.js   (paint-by-region pictures, generated from shapes)"""
from PIL import Image, ImageDraw
import os, json, math
ROOT = os.path.join(os.path.dirname(__file__), '..')
A = lambda *p: os.path.join(ROOT, 'assets', *p)
os.makedirs(A('ui'), exist_ok=True)
OUT = (58, 42, 77, 255)
def col(r, g, b, a=255): return (r, g, b, a)
PINK, GOLD, SKY, GREEN, LAV, ORANGE, CREAM, BROWN = col(255,140,180), col(255,214,90), col(150,208,255), col(143,211,168), col(200,170,255), col(255,154,107), col(255,244,230), col(138,90,68)
DBROWN, WHITE, RED, DGREEN, DBLUE = col(110,70,56), col(255,255,255), col(240,100,120), col(80,160,110), col(80,140,210)

def new(w=16, h=16): 
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def pat(d, rows, color, ox=0, oy=0):
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '#': d.point((ox + x, oy + y), color)

# ---------------- ICONS (16x16) ----------------
ICON_NAMES = ['lock','wave','gift','ball','heart','exclaim','question','check','cross','follow','wait','brush','bucket','eraser','undo','trash','palette','book','speaker','medal','hint','sparkle','menu','back']
def icon(name):
    im, d = new()
    if name == 'lock':
        d.rectangle([4,7,11,14], fill=GOLD, outline=OUT); d.rectangle([5,2,10,8], outline=OUT); d.point((7,10), OUT); d.point((8,10), OUT); d.line([(7,11),(8,11)], fill=OUT)
    elif name == 'wave':
        SK = col(254,217,193)
        d.rectangle([4,7,11,13], fill=SK, outline=OUT)
        for i, top in enumerate([3,2,2,3]): d.rectangle([4+i*2,top,5+i*2,7], fill=SK, outline=OUT)
        d.rectangle([5,8,10,12], fill=SK); d.arc([0,5,6,12], 90, 250, fill=OUT)
    elif name == 'gift':
        d.rectangle([3,6,12,14], fill=PINK, outline=OUT); d.rectangle([3,6,12,8], fill=col(255,180,205), outline=OUT); d.rectangle([7,6,8,14], fill=GOLD); d.ellipse([4,2,7,6], outline=OUT, fill=GOLD); d.ellipse([8,2,11,6], outline=OUT, fill=GOLD)
    elif name == 'ball':
        d.ellipse([2,2,13,13], fill=SKY, outline=OUT); d.arc([2,2,13,13], 200, 340, fill=WHITE); d.line([(3,8),(12,8)], fill=WHITE); d.arc([4,4,11,11], 60, 160, fill=DBLUE)
    elif name == 'heart':
        d.polygon([(8,14),(2,8),(2,5),(5,3),(8,6),(11,3),(14,5),(14,8)], fill=PINK, outline=OUT)
    elif name == 'exclaim':
        d.ellipse([2,2,13,13], fill=ORANGE, outline=OUT); d.rectangle([7,4,8,9], fill=WHITE); d.rectangle([7,11,8,11], fill=WHITE)
    elif name == 'question':
        d.ellipse([2,2,13,13], fill=LAV, outline=OUT); pat(d, ['.###.','#...#','....#','..##.','..#..','.....','..#..'], WHITE, 5, 4)
    elif name == 'check':
        d.ellipse([1,1,14,14], fill=GREEN, outline=OUT); pat(d, ['.....##','....##.','#..##..','.###...','..#....'], WHITE, 4, 5)
    elif name == 'cross':
        d.ellipse([1,1,14,14], fill=RED, outline=OUT); pat(d, ['##...##','.##.##.','..###..','.##.##.','##...##'], WHITE, 4, 5)
    elif name == 'follow':
        d.ellipse([1,1,14,14], fill=SKY, outline=OUT); pat(d, ['#..#....','##.##...','###.##..','####.##.','###.##..','##.##...','#..#....'], WHITE, 4, 4)
    elif name == 'wait':
        d.ellipse([1,1,14,14], fill=LAV, outline=OUT); d.rectangle([5,5,6,10], fill=WHITE); d.rectangle([9,5,10,10], fill=WHITE)
    elif name == 'brush':
        d.line([(3,13),(10,6)], fill=BROWN, width=3); d.polygon([(9,4),(13,2),(14,3),(12,7)], fill=PINK, outline=OUT); d.point((3,13), OUT)
    elif name == 'bucket':
        d.polygon([(3,6),(12,6),(11,14),(4,14)], fill=col(170,180,210), outline=OUT); d.rectangle([4,7,11,9], fill=PINK); d.arc([4,1,11,9], 180, 360, fill=OUT); d.ellipse([12,10,14,13], fill=PINK)
    elif name == 'eraser':
        d.polygon([(2,10),(9,3),(14,8),(7,15)], fill=col(255,190,210), outline=OUT); d.polygon([(2,10),(5,13),(7,15),(2,12)], fill=WHITE, outline=OUT)
    elif name == 'undo':
        d.ellipse([1,1,14,14], fill=CREAM, outline=OUT); pat(d, ['..#....','.##....','######.','.##..##','..#...#','.....##','..####.'], OUT, 4, 4)
    elif name == 'trash':
        d.rectangle([4,5,11,14], fill=col(190,200,225), outline=OUT); d.rectangle([3,3,12,5], fill=col(170,180,210), outline=OUT); d.line([(6,7),(6,12)], fill=OUT); d.line([(9,7),(9,12)], fill=OUT)
    elif name == 'palette':
        d.ellipse([1,3,14,13], fill=col(240,215,170), outline=OUT)
        for (x,y,c) in [(4,6,PINK),(7,5,GOLD),(10,6,SKY),(11,9,GREEN)]: d.rectangle([x,y,x+1,y+1], fill=c)
        d.ellipse([5,9,7,11], fill=(0,0,0,0), outline=OUT)
    elif name == 'book':
        d.rectangle([2,3,7,13], fill=SKY, outline=OUT); d.rectangle([8,3,13,13], fill=WHITE, outline=OUT); d.line([(9,6),(12,6)], fill=OUT); d.line([(9,8),(12,8)], fill=OUT)
    elif name == 'speaker':
        d.polygon([(2,6),(5,6),(9,2),(9,13),(5,9),(2,9)], fill=col(200,205,225), outline=OUT); d.arc([8,4,13,11], 290, 70, fill=OUT); d.arc([9,2,15,13], 290, 70, fill=OUT)
    elif name == 'medal':
        d.polygon([(4,1),(8,6),(6,8),(2,3)], fill=RED); d.polygon([(12,1),(8,6),(10,8),(14,3)], fill=DBLUE); d.ellipse([3,6,12,15], fill=GOLD, outline=OUT); d.point((7,10), WHITE)
    elif name == 'hint':
        d.ellipse([3,1,12,10], fill=GOLD, outline=OUT); d.rectangle([6,10,9,13], fill=col(190,190,210), outline=OUT); d.point((6,4), WHITE)
    elif name == 'sparkle':
        d.polygon([(8,0),(10,6),(16,8),(10,10),(8,16),(6,10),(0,8),(6,6)], fill=col(255,244,190), outline=GOLD)
    elif name == 'menu':
        for y in (4, 8, 12): d.rectangle([3,y,12,y+1], fill=OUT)
    elif name == 'back':
        pat(d, ['...#...','..##...','.#######','..##...','...#...'], OUT, 4, 5)
    return im
sheet = Image.new('RGBA', (16 * len(ICON_NAMES), 16), (0, 0, 0, 0))
for i, n in enumerate(ICON_NAMES): sheet.paste(icon(n), (16 * i, 0))
sheet.save(A('ui', 'icons.png'))

# ---------------- BADGES ----------------
G = {
 'star': ['...#...','...#...','#######','.#####.','..###..','.##.##.','.#...#.'],
 'heart': ['.##.##.','#######','#######','.#####.','..###..','...#...','.......'],
 'book': ['##...##','#.#.#.#','#.#.#.#','#.#.#.#','#.#.#.#','#######','.......'],
 'brush': ['......#','.....##','....##.','...##..','.##....','##.....','#......'],
 'speech': ['#######','#.....#','#.....#','#######','..#....','.#.....','.......'],
 'people': ['.##.##.','.##.##.','..#.#..','#######','#.###.#','..#.#..','.##.##.'],
 'crown': ['#.#.#.#','#######','#######','#######','.......','.......','.......'],
 'leaf': ['...####','..#####','.######','######.','#####..','##.....','#......'],
}
BADGE_DEFS = [('first_brush','brush',PINK),('colorful','brush',GREEN),('true_colors','star',GOLD),('first_words','book',SKY),('polyglot','speech',LAV),('word_detective','book',GOLD),
              ('hello_friend','heart',PINK),('team_player','people',GREEN),('best_buddies','heart',GOLD),('discoverer','crown',GOLD),('growing_up','leaf',DGREEN),('all_rounder','star',LAV)]
bs = Image.new('RGBA', (16 * len(BADGE_DEFS), 16), (0, 0, 0, 0))
for i, (n, g, c) in enumerate(BADGE_DEFS):
    im, d = new(); d.ellipse([0,0,15,15], fill=c, outline=OUT); d.ellipse([2,2,13,13], outline=col(255,255,255,150))
    pat(d, G[g], WHITE, 4, 4); bs.paste(im, (16 * i, 0))
bs.save(A('ui', 'badges.png'))

# ---------------- VOCAB ICONS ----------------
VOCAB_ICONS = ['apple','cat','dog','sun','moon','star','heart','tree','house','book','cup','fish','bird','flower','ball','pencil']
def vicon(n):
    im, d = new()
    if n == 'apple': d.ellipse([2,4,13,14], fill=RED, outline=OUT); d.line([(8,4),(9,1)], fill=BROWN); d.ellipse([9,1,12,3], fill=GREEN); d.point((5,7), WHITE)
    elif n == 'cat':
        d.polygon([(2,2),(6,5),(3,7)], fill=ORANGE, outline=OUT); d.polygon([(13,2),(9,5),(12,7)], fill=ORANGE, outline=OUT); d.ellipse([2,4,13,14], fill=ORANGE, outline=OUT)
        d.point((5,8), OUT); d.point((10,8), OUT); d.point((7,10), PINK); d.point((8,10), PINK); d.line([(1,10),(4,10)], fill=OUT); d.line([(11,10),(14,10)], fill=OUT)
    elif n == 'dog':
        d.ellipse([3,3,12,14], fill=col(210,170,130), outline=OUT); d.ellipse([0,3,4,10], fill=BROWN, outline=OUT); d.ellipse([11,3,15,10], fill=BROWN, outline=OUT)
        d.point((6,7), OUT); d.point((9,7), OUT); d.rectangle([7,9,8,10], fill=OUT)
    elif n == 'sun':
        for a in range(0, 360, 45): d.line([(8+int(5*math.cos(math.radians(a))), 8+int(5*math.sin(math.radians(a)))), (8+int(7.5*math.cos(math.radians(a))), 8+int(7.5*math.sin(math.radians(a))))], fill=GOLD)
        d.ellipse([4,4,11,11], fill=GOLD, outline=OUT)
    elif n == 'moon': d.ellipse([2,2,13,13], fill=col(255,240,170), outline=OUT); d.ellipse([6,1,15,10], fill=(0,0,0,0)); d.ellipse([6,2,14,10], fill=(0,0,0,0))
    elif n == 'star': d.polygon([(8,1),(10,6),(15,6),(11,9),(13,14),(8,11),(3,14),(5,9),(1,6),(6,6)], fill=GOLD, outline=OUT)
    elif n == 'heart': d.polygon([(8,14),(2,8),(2,5),(5,3),(8,6),(11,3),(14,5),(14,8)], fill=PINK, outline=OUT)
    elif n == 'tree': d.rectangle([7,9,9,15], fill=BROWN, outline=OUT); d.ellipse([2,1,13,11], fill=GREEN, outline=OUT)
    elif n == 'house': d.rectangle([3,7,12,14], fill=CREAM, outline=OUT); d.polygon([(1,8),(8,1),(15,8)], fill=ORANGE, outline=OUT); d.rectangle([7,10,9,14], fill=BROWN)
    elif n == 'book': d.rectangle([2,2,13,14], fill=DBLUE, outline=OUT); d.rectangle([4,4,11,7], fill=CREAM); d.line([(4,10),(11,10)], fill=CREAM)
    elif n == 'cup': d.rectangle([3,5,11,14], fill=WHITE, outline=OUT); d.arc([9,6,14,12], 270, 90, fill=OUT); d.rectangle([4,6,10,8], fill=BROWN)
    elif n == 'fish': d.ellipse([1,4,11,12], fill=SKY, outline=OUT); d.polygon([(11,8),(15,4),(15,12)], fill=DBLUE, outline=OUT); d.point((4,7), OUT)
    elif n == 'bird': d.ellipse([3,4,12,13], fill=GOLD, outline=OUT); d.polygon([(12,7),(15,8),(12,9)], fill=ORANGE); d.point((9,7), OUT); d.ellipse([4,8,8,12], fill=col(255,236,140))
    elif n == 'flower':
        for (x,y) in [(8,3),(8,10),(3,6),(12,6)]: d.ellipse([x-2,y-2,x+2,y+2], fill=PINK, outline=OUT)
        d.ellipse([6,5,10,9], fill=GOLD); d.line([(8,11),(8,15)], fill=DGREEN)
    elif n == 'ball': d.ellipse([2,2,13,13], fill=ORANGE, outline=OUT); d.line([(2,8),(13,8)], fill=OUT); d.arc([4,2,11,13], 90, 270, fill=OUT)
    elif n == 'pencil': d.polygon([(2,13),(3,10),(11,2),(14,5),(6,13)], fill=GOLD, outline=OUT); d.polygon([(2,13),(3,10),(6,13)], fill=CREAM, outline=OUT); d.line([(10,3),(13,6)], fill=PINK)
    return im
vs = Image.new('RGBA', (16 * len(VOCAB_ICONS), 16), (0, 0, 0, 0))
for i, n in enumerate(VOCAB_ICONS): vs.paste(vicon(n), (16 * i, 0))
vs.save(A('ui', 'vocab.png'))

# ---------------- STATIONS (32x32) ----------------
def station(n):
    im, d = new(32, 32)
    if n == 'easel':
        d.line([(16,10),(7,31)], fill=DBROWN, width=2); d.line([(16,10),(25,31)], fill=DBROWN, width=2); d.line([(16,14),(16,31)], fill=BROWN, width=2)
        d.rectangle([5,2,26,20], fill=CREAM, outline=OUT); d.rectangle([7,4,24,10], fill=SKY); d.polygon([(7,18),(7,12),(14,10),(24,13),(24,18)], fill=GREEN); d.ellipse([19,5,23,9], fill=GOLD)
        d.rectangle([4,21,27,23], fill=BROWN, outline=OUT); d.ellipse([20,24,27,28], fill=col(240,215,170), outline=OUT); d.point((22,26), PINK); d.point((24,26), SKY)
    elif n == 'library':
        d.rectangle([3,2,28,31], fill=BROWN, outline=OUT)
        for y in (12, 22): d.rectangle([3,y,28,y+1], fill=DBROWN)
        cols = [PINK, SKY, GOLD, GREEN, LAV, ORANGE, RED]
        for r, (y0, y1) in enumerate([(4, 11), (14, 21), (24, 30)]):
            x = 5
            for k in range(7):
                w = 2 + (k + r) % 2; h = (y1 - y0) - ((k * 3 + r) % 3)
                d.rectangle([x, y1 - h, x + w, y1], fill=cols[(k + r * 2) % len(cols)], outline=OUT); x += w + 1
                if x > 26: break
    elif n == 'playground':
        d.line([(6,31),(10,5)], fill=DBLUE, width=2); d.line([(26,31),(22,5)], fill=DBLUE, width=2); d.rectangle([7,3,25,5], fill=col(90,150,225), outline=OUT)
        for x in (13, 19): d.line([(x,6),(x,21)], fill=OUT); d.rectangle([x-3,21,x+3,23], fill=PINK if x == 13 else GOLD, outline=OUT)
        d.point((2,30), PINK); d.point((29,30), LAV)
    elif n == 'portal':
        d.rectangle([3,10,8,31], fill=LAV, outline=OUT); d.rectangle([23,10,28,31], fill=LAV, outline=OUT)
        d.pieslice([3,3,28,26], 180, 360, fill=col(220,200,255), outline=OUT); d.rectangle([9,14,22,31], fill=col(120,90,200))
        for i, c in enumerate([col(255,200,230), col(220,190,255), col(190,210,255), col(255,230,200)]): d.rectangle([9, 14 + i * 4, 22, 17 + i * 4], fill=c)
        d.polygon([(16,0),(18,4),(22,4),(19,7),(20,10),(16,8),(12,10),(13,7),(10,4),(14,4)], fill=GOLD, outline=OUT)
    return im
SN = ['easel','library','playground','portal']
ss = Image.new('RGBA', (32 * len(SN), 32), (0, 0, 0, 0))
for i, n in enumerate(SN): ss.paste(station(n), (32 * i, 0))
ss.save(A('environments', 'stations.png'))

# ---------------- PROPS: gates + plates (16x16 each) ----------------
def prop(kind, color):
    im, d = new()
    dark = tuple(max(0, v - 60) for v in color[:3]) + (255,)
    if kind == 'gate':
        d.rectangle([0,0,15,15], fill=(0,0,0,0)); d.rectangle([5,0,10,15], fill=color, outline=OUT)
        for y in (3, 8, 13): d.line([(5,y),(10,y)], fill=dark)
        d.rectangle([4,0,11,1], fill=dark, outline=OUT)
    elif kind == 'plate_up':
        d.rectangle([0,10,15,15], fill=dark, outline=OUT); d.rectangle([1,9,14,11], fill=color, outline=OUT)
    else:
        d.rectangle([0,12,15,15], fill=dark, outline=OUT); d.rectangle([1,12,14,13], fill=color, outline=OUT)
    return im
pr = Image.new('RGBA', (16 * 6, 16), (0, 0, 0, 0))
for gi, c in enumerate([ORANGE, SKY]):
    for ki, k in enumerate(['gate', 'plate_up', 'plate_down']): pr.paste(prop(k, c), (16 * (gi * 3 + ki), 0))
pr.save(A('environments', 'props.png'))

# ---------------- PAINTINGS ----------------
W, H = 48, 30
CH = '0123456789abcdefghijklmnopqrstuvwxyz'
def make(name, shapes, targets, names):
    im = Image.new('L', (W, H), 1); d = ImageDraw.Draw(im)
    for rid, kind, *args in shapes:
        if kind == 'rect': d.rectangle(args[0], fill=rid)
        elif kind == 'ell': d.ellipse(args[0], fill=rid)
        elif kind == 'poly': d.polygon(args[0], fill=rid)
    px = im.load(); rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            v = px[x, y]; edge = False
            if v != 1:
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and px[nx, ny] != v: edge = True
            r += '.' if edge else CH[v]
        rows.append(r)
    return dict(w=W, h=H, rows=rows, targets={CH[k]: v for k, v in targets.items()}, names={CH[k]: v for k, v in names.items()})

P = {}
P['flower'] = make('flower', [
  (2,'rect',[0,24,47,29]), (8,'ell',[4,3,16,8]), (7,'ell',[38,2,44,8]), (3,'rect',[23,14,25,24]), (4,'ell',[26,16,33,21]),
  (5,'ell',[19,0,29,8]), (5,'ell',[19,10,29,18]), (5,'ell',[13,5,22,14]), (5,'ell',[26,5,35,14]), (6,'ell',[20,5,28,13])],
  {}, {1:'sky',2:'ground',3:'stem',4:'leaf',5:'petals',6:'center',7:'sun',8:'cloud'})
P['house'] = make('house', [
  (2,'rect',[0,22,47,29]), (11,'poly',[(18,22),(23,22),(28,29),(13,29)]), (7,'ell',[38,2,45,9]), (8,'rect',[38,16,40,22]), (9,'ell',[34,8,44,17]),
  (3,'rect',[11,12,29,22]), (10,'rect',[24,4,27,10]), (4,'poly',[(9,12),(20,4),(31,12)]), (5,'rect',[17,15,22,22]), (6,'rect',[24,14,28,18])],
  {1:2,2:3,3:6,4:5,5:7,6:2,7:1,8:7,9:3,10:0,11:6}, {1:'sky',2:'grass',3:'wall',4:'roof',5:'door',6:'window',7:'sun',8:'trunk',9:'leaves',10:'chimney',11:'path'})
P['butterfly'] = make('butterfly', [
  (2,'rect',[0,25,47,29]), (4,'ell',[-14,17,22,40]), (3,'ell',[3,1,11,9]), (5,'ell',[34,2,45,8]),
  (13,'rect',[8,19,10,25]), (14,'ell',[5,13,13,20]), (15,'ell',[7,15,11,18]),
  (6,'ell',[14,5,23,16]), (7,'ell',[25,5,34,16]), (8,'ell',[15,15,23,23]), (9,'ell',[25,15,33,23]),
  (10,'rect',[22,7,26,23]), (11,'ell',[16,7,21,12]), (12,'ell',[27,7,32,12])],
  {1:2,2:3,3:1,4:3,5:6,6:4,7:4,8:0,9:0,10:7,11:1,12:1,13:3,14:5,15:1},
  {1:'sky',2:'ground',3:'sun',4:'hill',5:'cloud',6:'left wing',7:'right wing',8:'lower left wing',9:'lower right wing',10:'body',11:'spot',12:'spot',13:'stem',14:'petals',15:'flower center'})
P['sunset'] = make('sunset', [
  (2,'rect',[0,11,47,17]), (3,'ell',[17,8,31,22]), (4,'rect',[0,17,47,29]), (5,'poly',[(15,22),(33,22),(29,27),(19,27)]), (6,'poly',[(24,11),(24,21),(31,21)])],
  {1:4,2:5,3:1,4:2,5:7,6:6}, {1:'top sky',2:'low sky',3:'sun',4:'sea',5:'boat',6:'sail'})
# rect (0,0,47,10) is region 1 (background)
P['balloon'] = make('balloon', [
  (6,'rect',[0,26,47,29]), (2,'ell',[3,3,15,9]), (2,'ell',[33,18,45,24]), (3,'ell',[9,6,21,20]), (4,'ell',[19,3,31,17]), (5,'ell',[28,8,40,22])],
  {}, {1:'sky',2:'cloud',3:'balloon',4:'balloon',5:'balloon',6:'ground'})
with open(os.path.join(ROOT, 'data', 'paintings.js'), 'w') as f:
    f.write('// AUTO-GENERATED by tools/make_ch2_assets.py (paint-by-region pictures)\n')
    f.write('// "." = outline (cannot be painted); other characters are region ids.\n')
    f.write('// targets: region id -> palette index of the reference colour (used in match/exact modes)\n')
    f.write('const PAINTINGS = ' + json.dumps(P, indent=1) + ';\n')
    f.write('const ICON_INDEX = ' + json.dumps({n: i for i, n in enumerate(ICON_NAMES)}) + ';\n')
    f.write('const VOCAB_ICON_INDEX = ' + json.dumps({n: i for i, n in enumerate(VOCAB_ICONS)}) + ';\n')
    f.write('const BADGE_ICON_INDEX = ' + json.dumps({d[0]: i for i, d in enumerate(BADGE_DEFS)}) + ';\n')
print('ch2 assets ok')
# preview
pv = Image.new('RGBA', (16 * 24, 16 * 3 + 32), (205, 232, 246, 255))
pv.alpha_composite(sheet, (0, 0)); pv.alpha_composite(bs, (0, 16)); pv.alpha_composite(vs, (0, 32)); pv.alpha_composite(ss, (0, 48)); pv.alpha_composite(pr, (200, 48))
pv.resize((pv.width * 3, pv.height * 3), Image.NEAREST).save('/home/claude/ch2_preview.png')
# painting preview
palette = {'.': (58,42,77)}
rng = {}
big = Image.new('RGB', (W * 4 * 5 + 20, H * 4), (255, 255, 255))
for i, (k, v) in enumerate(P.items()):
    im = Image.new('RGB', (W, H))
    cs = [(205,232,246),(180,210,150),(255,200,200),(250,220,120),(200,170,255),(255,154,107),(143,211,168),(150,208,255),(255,244,230),(138,90,68),(240,100,120),(120,150,200),(90,90,120),(255,140,180),(255,214,90),(210,190,255)]
    for y, r in enumerate(v['rows']):
        for x, ch in enumerate(r): im.putpixel((x, y), (58,42,77) if ch == '.' else cs[CH.index(ch) % len(cs)])
    big.paste(im.resize((W * 4, H * 4), Image.NEAREST), (i * (W * 4 + 5), 0))
big.save('/home/claude/paint_preview.png')
