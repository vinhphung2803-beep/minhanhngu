"""Generate all game art procedurally (no manual drawing needed).
Run:  python tools/make_assets.py
Outputs go to assets/. Character frames are DERIVED from the single static
baby sprite (row-shifts / squash) - a procedural animation, not hand-drawn frames.
"""
from PIL import Image, ImageDraw
import os, random
random.seed(7)
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
for d in ('characters', 'environments', 'collectibles', 'effects'):
    os.makedirs(os.path.join(A, d), exist_ok=True)

OUT = (58, 42, 77, 255)  # dark purple outline

# ---------- CHARACTER: derived frames ----------
base = Image.open(os.path.join(A, 'characters', 'baby_idle_crawl.png')).convert('RGBA')

def bbox_rows(im):
    px = im.load(); rows = [y for y in range(32) if any(px[x, y][3] > 20 for x in range(32))]
    return rows[0], rows[-1]
top, bot = bbox_rows(base)

def make_frame(head_dy=0, body_dx=0, squash=0, head_dx=0, lift=0, whole_dy=0):
    """Split sprite at HEAD_SPLIT; shift head & body independently; squash = shrink height by n rows."""
    split = 19
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    head = base.crop((0, 0, 32, split)); body = base.crop((0, split, 32, 32))
    # body: vertical squash by dropping rows evenly (keeps feet on the floor)
    if squash > 0:
        bh = body.size[1]; keep = bh - squash
        nb = Image.new('RGBA', (32, keep), (0, 0, 0, 0))
        for i in range(keep):
            nb.paste(body.crop((0, int(i * bh / keep), 32, int(i * bh / keep) + 1)), (0, i))
        body = nb
    elif squash < 0:  # stretch
        bh = body.size[1]; ext = bh - squash
        nb = Image.new('RGBA', (32, ext), (0, 0, 0, 0))
        for i in range(ext):
            nb.paste(body.crop((0, int(i * bh / ext), 32, int(i * bh / ext) + 1)), (0, i))
        body = nb
    by = 32 - body.size[1] - lift
    out.alpha_composite(body, (body_dx, by))
    out.alpha_composite(head, (head_dx, head_dy + (by - split)))
    if whole_dy:
        o2 = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); o2.alpha_composite(out, (0, whole_dy)); out = o2
    return out

frames = {
    'idle_crawl': [make_frame(), make_frame(head_dy=1, squash=1)],
    'crawl': [make_frame(), make_frame(body_dx=1, head_dx=1, whole_dy=-1),
              make_frame(head_dy=1, squash=1), make_frame(body_dx=-1, head_dx=-1, whole_dy=-1)],
    'hop': [make_frame(squash=2, head_dy=1), make_frame(whole_dy=-2), make_frame(whole_dy=-1)],
    'land': [make_frame(squash=3, head_dy=2), make_frame(squash=1, head_dy=1)],
}
order = ['idle_crawl', 'crawl', 'hop', 'land']
n = sum(len(frames[k]) for k in order)
sheet = Image.new('RGBA', (32 * n, 32), (0, 0, 0, 0))
i = 0
meta = {}
for k in order:
    meta[k] = [i, len(frames[k])]
    for f in frames[k]:
        sheet.paste(f, (32 * i, 0)); i += 1
sheet.save(os.path.join(A, 'characters', 'baby_sheet.png'))
print('baby_sheet', sheet.size, meta)

# ---------- TILESET (16x16 tiles) ----------
def px(d, pts, c):
    for p in pts: d.point(p, c)

tiles = Image.new('RGBA', (16 * 6, 16), (0, 0, 0, 0))
GRASS = (150, 214, 132, 255); GRASS_D = (111, 184, 106, 255); GRASS_L = (190, 236, 160, 255)
DIRT = (190, 140, 112, 255); DIRT_D = (160, 110, 94, 255); DIRT_L = (214, 168, 134, 255)
STONE = (170, 164, 190, 255); STONE_D = (132, 124, 160, 255); STONE_L = (203, 198, 220, 255)

def tile_grass_top():
    t = Image.new('RGBA', (16, 16), DIRT); d = ImageDraw.Draw(t)
    for _ in range(10): d.point((random.randrange(16), random.randrange(5, 16)), random.choice([DIRT_D, DIRT_L]))
    d.rectangle([0, 0, 15, 4], fill=GRASS)
    d.rectangle([0, 0, 15, 1], fill=GRASS_L)
    for x in range(16):  # wavy lower edge
        h = 5 + ((x * 7) % 3 == 0) + ((x * 5) % 4 == 0)
        d.line([(x, 4), (x, h)], fill=GRASS_D if x % 2 else GRASS)
    d.line([(0, 0), (15, 0)], fill=(104, 168, 98, 255))
    return t
def tile_dirt():
    t = Image.new('RGBA', (16, 16), DIRT); d = ImageDraw.Draw(t)
    for _ in range(14): d.point((random.randrange(16), random.randrange(16)), random.choice([DIRT_D, DIRT_L]))
    d.rectangle([3, 5, 4, 6], fill=DIRT_D); d.rectangle([10, 11, 12, 12], fill=DIRT_D)
    return t
def tile_stone():
    t = Image.new('RGBA', (16, 16), STONE); d = ImageDraw.Draw(t)
    d.rectangle([0, 0, 15, 0], fill=STONE_L); d.line([(0, 7), (15, 7)], fill=STONE_D)
    d.line([(5, 0), (5, 7)], fill=STONE_D); d.line([(11, 8), (11, 15)], fill=STONE_D)
    d.line([(0, 15), (15, 15)], fill=STONE_D); d.point((2, 2), STONE_L); d.point((8, 11), STONE_L)
    return t
def tile_wood():  # wooden plank platform (full tile so it matches the hitbox)
    t = Image.new('RGBA', (16, 16), (226, 176, 120, 255)); d = ImageDraw.Draw(t)
    d.rectangle([0, 0, 15, 2], fill=(246, 208, 150, 255))
    d.rectangle([0, 12, 15, 15], fill=(184, 132, 96, 255))
    d.line([(0, 7), (15, 7)], fill=(196, 146, 104, 255)); d.line([(8, 3), (8, 6)], fill=(196, 146, 104, 255)); d.line([(4, 8), (4, 11)], fill=(196, 146, 104, 255))
    d.rectangle([0, 0, 15, 15], outline=OUT)
    return t
def tile_grass_dirt_edge():
    return tile_dirt()
for i, f in enumerate([tile_grass_top, tile_dirt, tile_stone, tile_wood, tile_dirt, tile_dirt]):
    tiles.paste(f(), (16 * i, 0))
tiles.save(os.path.join(A, 'environments', 'tiles.png'))

# ---------- DECORATIONS (one sheet, fixed cells 32x32) ----------
deco = Image.new('RGBA', (32 * 8, 32), (0, 0, 0, 0))
def blank(): return Image.new('RGBA', (32, 32), (0, 0, 0, 0))
def flower(col, cx=16):
    t = blank(); d = ImageDraw.Draw(t)
    d.line([(cx, 31), (cx, 22)], fill=(104, 168, 98, 255)); d.point((cx - 1, 27), (104, 168, 98, 255)); d.point((cx + 1, 25), (104, 168, 98, 255))
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]: d.point((cx + dx, 21 + dy), col)
    d.point((cx, 21), (255, 232, 140, 255)); return t
def tree():
    t = blank(); d = ImageDraw.Draw(t)
    d.rectangle([14, 20, 17, 31], fill=(166, 116, 98, 255)); d.line([(14, 20), (14, 31)], fill=(140, 94, 84, 255))
    for (x0, y0, x1, y1) in [(5, 8, 26, 24), (9, 3, 22, 16)]: d.ellipse([x0, y0, x1, y1], fill=(132, 200, 120, 255), outline=OUT)
    d.ellipse([9, 3, 22, 16], fill=(132, 200, 120, 255))
    for p in [(12, 8), (18, 6), (14, 14), (20, 16), (9, 17)]: d.rectangle([p[0], p[1], p[0] + 1, p[1] + 1], fill=(170, 228, 150, 255))
    return t
def bush():
    t = blank(); d = ImageDraw.Draw(t)
    d.ellipse([2, 18, 18, 31], fill=(120, 190, 112, 255), outline=OUT); d.ellipse([12, 16, 30, 31], fill=(132, 200, 120, 255), outline=OUT)
    d.rectangle([4, 29, 28, 31], fill=(132, 200, 120, 255))
    for p in [(8, 22), (20, 21), (24, 26)]: d.point(p, (255, 170, 200, 255))
    return t
def mushroom():
    t = blank(); d = ImageDraw.Draw(t)
    d.rectangle([15, 26, 17, 31], fill=(250, 236, 220, 255)); d.ellipse([11, 20, 21, 28], fill=(246, 130, 150, 255), outline=OUT)
    d.point((14, 23), (255, 255, 255, 255)); d.point((18, 24), (255, 255, 255, 255)); return t
def sign():
    t = blank(); d = ImageDraw.Draw(t)
    d.rectangle([15, 20, 17, 31], fill=(166, 116, 98, 255)); d.rectangle([7, 12, 25, 22], fill=(236, 190, 140, 255), outline=OUT)
    d.polygon([(20, 15), (23, 17), (20, 19)], fill=OUT); d.line([(10, 17), (18, 17)], fill=OUT); return t
def flag():
    t = blank(); d = ImageDraw.Draw(t)
    d.rectangle([15, 6, 16, 31], fill=(166, 116, 98, 255)); d.polygon([(17, 7), (28, 11), (17, 15)], fill=(255, 150, 180, 255), outline=OUT)
    return t
def toy_block():
    t = blank(); d = ImageDraw.Draw(t)
    d.rectangle([10, 20, 22, 31], fill=(255, 214, 120, 255), outline=OUT); d.rectangle([13, 24, 19, 28], fill=(250, 150, 170, 255)); return t
cells = [flower((255, 150, 190, 255)), flower((190, 170, 255, 255)), tree(), bush(), mushroom(), sign(), flag(), toy_block()]
for i, c in enumerate(cells): deco.paste(c, (32 * i, 0))
deco.save(os.path.join(A, 'environments', 'decor.png'))

# ---------- COLLECTIBLES (3 frames of bob each, 16x16) ----------
def collectible(kind):
    sheet = Image.new('RGBA', (16 * 4, 16), (0, 0, 0, 0))
    for f in range(4):
        t = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
        ox = [0, 1, 0, -1][f] if kind != 'star' else 0
        if kind == 'star':
            w = [7, 6, 4, 6][f]  # spin
            pts = []
            import math
            for k in range(10):
                r = 7 if k % 2 == 0 else 3
                a = -math.pi / 2 + k * math.pi / 5
                pts.append((8 + r * math.cos(a) * w / 7, 8 + r * math.sin(a)))
            d.polygon(pts, fill=(255, 214, 90, 255), outline=OUT)
            d.point((7, 6), (255, 244, 190, 255))
        elif kind == 'heart':
            by = [0, 0, 1, 0][f]
            d.polygon([(8, 14 + by), (2, 8 + by), (2, 5 + by), (5, 3 + by), (8, 6 + by), (11, 3 + by), (14, 5 + by), (14, 8 + by)], fill=(255, 140, 180, 255), outline=OUT)
            d.point((5, 5 + by), (255, 220, 236, 255)); d.point((4, 6 + by), (255, 220, 236, 255))
        else:  # paper plane
            by = [0, -1, 0, 1][f]
            d.polygon([(1 + ox, 8 + by), (15 + ox, 2 + by), (10 + ox, 14 + by), (7 + ox, 9 + by)], fill=(150, 208, 255, 255), outline=OUT)
            d.line([(7 + ox, 9 + by), (15 + ox, 2 + by)], fill=(100, 160, 230, 255))
        sheet.paste(t, (16 * f, 0))
    return sheet
col = Image.new('RGBA', (64, 48), (0, 0, 0, 0))
for i, k in enumerate(['star', 'heart', 'plane']): col.paste(collectible(k), (0, 16 * i))
col.save(os.path.join(A, 'collectibles', 'collectibles.png'))

# ---------- BACKGROUND: hills (tileable horizontally, 320x90) ----------
import math
def hills(color, base_y, amp, period, phase, w=320, h=120):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for x in range(w):
        y = base_y + int(amp * math.sin(2 * math.pi * (x / period) + phase) + amp * 0.4 * math.sin(2 * math.pi * 2 * x / period + phase * 2))
        d.line([(x, y), (x, h)], fill=color)
    return im
hills(( 205, 226, 240, 255), 55, 14, 320, 0.5).save(os.path.join(A, 'environments', 'hills_far.png'))
hills(( 176, 214, 200, 255), 70, 12, 320, 2.0).save(os.path.join(A, 'environments', 'hills_near.png'))
# cloud
cl = Image.new('RGBA', (40, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(cl)
for b in [(2, 6, 16, 15), (10, 1, 28, 15), (22, 5, 38, 15)]: d.ellipse(b, fill=(255, 255, 255, 235))
cl.save(os.path.join(A, 'environments', 'cloud.png'))
# sparkle effect (4 frames, 8x8)
sp = Image.new('RGBA', (32, 8), (0, 0, 0, 0))
for f in range(4):
    d = ImageDraw.Draw(sp); r = [1, 3, 2, 1][f]
    cx = 4 + 8 * f
    d.line([(cx - r, 4), (cx + r, 4)], fill=(255, 244, 190, 255)); d.line([(cx, 4 - r), (cx, 4 + r)], fill=(255, 244, 190, 255))
sp.save(os.path.join(A, 'effects', 'sparkle.png'))
print('assets generated')

# ---------- EXIT ARCH 32x32 ----------
arch = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(arch)
cols = [(255, 140, 170, 255), (255, 200, 130, 255), (255, 240, 150, 255), (170, 225, 170, 255), (150, 208, 255, 255), (200, 170, 255, 255)]
for i, c in enumerate(cols):
    d.pieslice([i * 2, i * 2, 31 - i * 2, 31 - i * 2 + 16], 180, 360, fill=c)
d.pieslice([12, 12, 19, 19 + 8], 180, 360, fill=(255, 244, 214, 255))
d.rectangle([0, 15, 31, 31], fill=(0, 0, 0, 0))
for i, c in enumerate(cols):
    d.rectangle([i * 2, 16, i * 2 + 1, 31], fill=c)
    d.rectangle([30 - i * 2, 16, 31 - i * 2, 31], fill=c)
d.rectangle([12, 16, 19, 31], fill=(255, 244, 214, 255))
arch.save(os.path.join(A, 'environments', 'arch.png'))
print('arch ok')
