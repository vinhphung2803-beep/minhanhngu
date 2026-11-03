# Tạo tài sản Chapter 3 (KHÔNG ghi đè tài sản cũ):
#   assets/characters/adult.png            - nhân vật tuổi 19 (11 frame như young.png)
#   assets/characters/npc_age18_young.png  - hình tượng "Tuổi 18" (13 frame, bố cục NPC) cho trận boss
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import make_characters as M
C = M.C
M.STAGES['adult'] = dict(M.STAGES['young'], pack=False, books=False)   # giữ áo xanh bạc hà + quần như tuổi 18 (nhận dạng nhân vật), thêm tóc dài, bỏ cặp sách
M.sheet('adult', M.HERO_POSES, dict(color=M.HAIR, style='long', clip=True)).save(os.path.join(M.OUT, 'adult.png'))

# ---- Boss "Tuổi 18": một con số 18 sống (13 frame, bố cục NPC: 0-1 idle, 2-5 đi, 6-8 nói, 9-10 vui, 11-12 ngại) ----
from PIL import Image, ImageDraw, ImageOps
BODY, SHADE, HI = (205, 70, 105, 255), (150, 40, 85, 255), (240, 130, 160, 255)
LINE, LEG, SHOE, FACE = (58, 42, 77, 255), (58, 48, 92, 255), (245, 245, 245, 255), (233, 220, 248, 255)
INK = (58, 42, 77, 255)

def digits(dy1, dy8, eyes, mouth, legs):
    """Vẽ '18' hướng bình thường. dy1/dy8: độ nhấp nhô của chữ 1 / chữ 8; legs: (dx,dy) chân trái/phải của từng chữ."""
    body = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); fill = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(body); f = ImageDraw.Draw(fill)
    # chữ 1: thân + cờ + chân đế
    d.rectangle([5, 3 + dy1, 10, 25 + dy1], fill=BODY); d.polygon([(5, 3 + dy1), (5, 11 + dy1), (0, 13 + dy1), (0, 9 + dy1)], fill=BODY)
    d.rectangle([2, 22 + dy1, 13, 25 + dy1], fill=BODY)
    # chữ 8: hai vòng chồng nhau, lỗ tô sáng thành "mặt"
    d.ellipse([14, 3 + dy8, 28, 15 + dy8], fill=BODY); d.ellipse([13, 13 + dy8, 29, 26 + dy8], fill=BODY)
    f.ellipse([18, 7 + dy8, 24, 11 + dy8], fill=FACE); f.ellipse([17, 17 + dy8, 25, 22 + dy8], fill=FACE)
    for y in range(32):
        for x in range(32):
            if fill.getpixel((x, y))[3]: body.putpixel((x, y), FACE)
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); bp = body.load(); ip = im.load()
    # chân (vẽ trước, nằm dưới thân)
    (l1, l2), (l3, l4) = legs
    for (lx, ly), base in ((l1, 6), (l2, 9), (l3, 16), (l4, 24)):
        x0 = base + lx; y0 = 26 + dy1 * 0 + ly
        for y in range(y0, y0 + 3):
            for x in range(x0, x0 + 3): ip[x, min(y, 31)] = LEG
        for x in range(x0 - 1, x0 + 3): ip[x, min(y0 + 3, 31)] = SHOE
    # thân + tô bóng
    for y in range(32):
        for x in range(32):
            c = bp[x, y]
            if c[3] == 0: continue
            if c == FACE: ip[x, y] = FACE; continue
            def out(nx, ny): return not (0 <= nx < 32 and 0 <= ny < 32) or bp[nx, ny][3] == 0 or bp[nx, ny] == FACE
            col = BODY
            if out(x + 1, y) or out(x, y + 1): col = SHADE
            elif out(x - 1, y) or out(x, y - 1): col = HI
            ip[x, y] = col
    # mặt nằm ở lỗ DƯỚI của chữ 8 (banner "Tiếp: ..." trong trận che phần trên của sprite)
    ex, ey = 19, 18 + dy8
    if eyes == 'dot':
        for dx in (0, 3):
            for yy in (0, 1):
                for xx in (0, 1): ip[ex + dx + xx, ey + yy] = INK
    elif eyes == 'happy':
        for dx in (0, 3): ip[ex + dx, ey + 1] = INK; ip[ex + dx + 1, ey] = INK; ip[ex + dx + 2, ey + 1] = INK
    else:
        for dx in (0, 3):
            for xx in (0, 1): ip[ex + dx + xx, ey + 1] = INK
    my = 21 + dy8
    if mouth == 'open':
        for y in (my, my + 1):
            for x in range(20, 23): ip[x, y] = INK
        ip[21, my + 1] = (255, 140, 160, 255)
    else:
        for x in range(20, 23): ip[x, my] = INK
    # viền ngoài 1px
    sil = [[ip[x, y][3] > 0 for x in range(32)] for y in range(32)]
    for y in range(32):
        for x in range(32):
            if not sil[y][x] and any(0 <= x + a < 32 and 0 <= y + b < 32 and sil[y + b][x + a] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): ip[x, y] = LINE
    return ImageOps.mirror(im)           # trận đánh lật đối thủ -> lật sẵn để người chơi thấy "18" đọc xuôi

Z = ((0, 0), (0, 0)); LEGS0 = (Z, Z)
FR = [  # (dy1, dy8, eyes, mouth, legs)
 (0, 0, 'dot', 'flat', LEGS0), (-1, -1, 'dot', 'flat', LEGS0),
 (0, -1, 'dot', 'flat', (((-1, 0), (1, 0)), ((1, 0), (-1, 0)))), (-1, 0, 'dot', 'flat', (((0, -1), (0, 0)), ((0, 0), (0, -1)))),
 (-1, 0, 'dot', 'flat', (((1, 0), (-1, 0)), ((-1, 0), (1, 0)))), (0, -1, 'dot', 'flat', (((0, 0), (0, -1)), ((0, -1), (0, 0)))),
 (-1, 0, 'dot', 'open', LEGS0), (0, -1, 'dot', 'open', LEGS0), (-1, 0, 'dot', 'open', LEGS0),
 (-2, -2, 'happy', 'open', LEGS0), (-1, -1, 'happy', 'open', LEGS0),
 (1, 1, 'closed', 'flat', LEGS0), (1, 0, 'closed', 'flat', LEGS0),
]
sheet = Image.new('RGBA', (32 * len(FR), 32), (0, 0, 0, 0))
for i, a in enumerate(FR): sheet.alpha_composite(digits(*a), (i * 32, 0))
sheet.save(os.path.join(M.OUT, 'npc_age18_young.png'))

