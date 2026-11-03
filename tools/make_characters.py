"""Procedural character generator for the growth system.
Outputs (assets/characters/):
  child.png preteen.png teen.png young.png        hero, 11 frames of 32x32 (idle2 run4 hop3 land2)
  npc_<type>_<stage>.png                          NPCs, 13 frames (idle2 walk4 wave3 happy2 shy2)
Identity kept across ages: short black hair + tuft, golden star hair clip, same eye/blush
style, mint outfit with a golden star. Proportions, pose, clothes and animation differ per age.
Run: python tools/make_characters.py
"""
from PIL import Image, ImageDraw
import os, sys
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'characters')
C = lambda r, g, b: (r, g, b, 255)
OUTLINE = C(62, 44, 64)
SKIN, SKIN_D = C(254, 217, 193), C(236, 186, 160)
HAIR, HAIR_L = C(67, 47, 53), C(108, 82, 92)
EYE, BLUSH, GOLD = C(58, 42, 77), C(255, 160, 170), C(255, 214, 90)
MINT, MINT_D = C(204, 229, 213), C(150, 200, 175)
WHITE, CREAM = C(255, 255, 255), C(255, 244, 230)

# ---------- age stages (hero) ----------
STAGES = {
    'child':   dict(hw=11, hh=10, tw=7, th=7,  leg=6,  band=3, skirt=True,  top=MINT, bottom=MINT_D, legs=SKIN, sock=WHITE, shoe=C(255, 170, 190), star=3, arm=5, th_leg=2),
    'preteen': dict(hw=10, hh=9,  tw=7, th=9,  leg=9,  band=3, skirt=True,  top=MINT, bottom=C(200, 180, 240), legs=SKIN, sock=WHITE, shoe=C(255, 170, 190), star=3, arm=7, th_leg=2),
    'teen':    dict(hw=10, hh=9,  tw=8, th=10, leg=10, band=0, skirt=False, top=MINT, bottom=C(120, 150, 205), legs=C(120, 150, 205), sock=None, shoe=C(250, 250, 255), star=1, arm=8, th_leg=3, hood=True),
    'young':   dict(hw=10, hh=9,  tw=8, th=11, leg=11, band=0, skirt=False, top=MINT, bottom=C(88, 104, 150), legs=C(88, 104, 150), sock=None, shoe=C(250, 250, 255), star=0, arm=9, th_leg=3, pack=True, books=True, blouse=True),
}
HERO_HAIR = dict(color=HAIR, style='short', clip=True)

# ---------- poses ----------
def P(**k):
    d = dict(dy=0, hdy=0, crouch=0, up=0, nl=(0, 0), fl=(0, 0), na=(0, 4), fa=(0, 4), eyes='open', mouth='smile', lean=0)
    d.update(k); return d
HERO_POSES = [
    P(), P(hdy=1, dy=0, na=(0, 4), fa=(0, 5)),                                           # idle
    P(nl=(4, 0), fl=(-3, 2), na=(-3, 3), fa=(3, 3)), P(nl=(1, 2), fl=(-1, 0), dy=-1, na=(-1, 3), fa=(1, 3)),
    P(nl=(-3, 1), fl=(4, 0), na=(3, 3), fa=(-3, 3)), P(nl=(-1, 0), fl=(1, 2), dy=-1, na=(1, 3), fa=(-1, 3)),  # run
    P(crouch=2, dy=2, nl=(2, 0), fl=(-2, 0), na=(-3, 3), fa=(-3, 4), mouth='flat'),       # hop 0 crouch
    P(up=2, dy=0, nl=(2, 3), fl=(-2, 4), na=(3, -5), fa=(-2, -5), mouth='open'),          # hop 1 up
    P(up=1, nl=(3, 1), fl=(-3, 2), na=(4, 0), fa=(-4, 0), mouth='open'),                  # hop 2 fall
    P(crouch=3, dy=3, nl=(3, 0), fl=(-3, 0), na=(4, 2), fa=(-4, 2), mouth='flat'),        # land 0
    P(crouch=1, dy=1, nl=(1, 0), fl=(-1, 0), na=(2, 3), fa=(-2, 3)),                      # land 1
]
NPC_POSES = HERO_POSES[0:2] + [
    P(nl=(3, 0), fl=(-2, 1), na=(-2, 3), fa=(2, 3)), P(nl=(1, 1), fl=(-1, 0), dy=-1, na=(-1, 3), fa=(1, 3)),
    P(nl=(-2, 1), fl=(3, 0), na=(2, 3), fa=(-2, 3)), P(nl=(-1, 0), fl=(1, 1), dy=-1, na=(1, 3), fa=(-1, 3)),   # walk
    P(na=(3, -6), mouth='open'), P(na=(5, -5), mouth='open'), P(na=(3, -6), mouth='open'),                       # wave
    P(up=2, na=(3, -5), fa=(-3, -5), eyes='happy', mouth='open', nl=(2, 2), fl=(-2, 3)), P(na=(3, -5), fa=(-3, -5), eyes='happy', mouth='open'),  # happy
    P(hdy=1, lean=-1, na=(2, -2), fa=(1, -1), eyes='closed', mouth='flat'), P(hdy=1, lean=-1, dy=0, na=(2, -1), fa=(1, 0), eyes='closed', mouth='flat'),  # shy
]

def px(im, x, y, c):
    if 0 <= x < 32 and 0 <= y < 32: im.putpixel((x, y), c)
def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(im, x, y, c)
def ell(im, x0, y0, x1, y1, c): ImageDraw.Draw(im).ellipse([x0, y0, x1, y1], fill=c)
def line(im, x0, y0, x1, y1, c, th=2):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        x = round(x0 + (x1 - x0) * i / n); y = round(y0 + (y1 - y0) * i / n)
        rect(im, x, y, x + th - 1, y + th - 1, c)

def draw(stage, pose, hair, outfit_override=None):
    s = dict(STAGES[stage])
    if outfit_override: s.update(outfit_override)
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    p = pose
    tx = 15 + p['lean']
    leg_total = s['leg'] - p['crouch']
    hip_y = 32 - s['leg'] + p['crouch'] + p['dy'] * 0   # hips lower when crouching
    base_hip = 32 - s['leg']
    hip = base_hip + p['crouch']
    lift = -p['up']                                       # airborne frames shift whole sprite up
    sh_y = hip - s['th'] + p['dy'] - p['crouch'] * 0
    sh_y = hip - s['th'] + (p['dy'] - p['crouch'])
    sh_y = hip - s['th']                                   # shoulder row (body keeps height, legs bend)
    head_y0 = sh_y - s['hh'] + 1 + p['hdy'] + (p['dy'] if p['crouch'] == 0 else 0)
    if p['crouch']: head_y0 += 0
    hw, hh = s['hw'], s['hh']
    hx0 = tx - hw // 2 + 1; hx1 = hx0 + hw - 1; hy0 = head_y0; hy1 = hy0 + hh - 1
    th = s['th']; tw = s['tw']
    top_y = sh_y + (p['dy'] if p['crouch'] == 0 else 0)
    tl, tr = tx - tw // 2, tx + tw // 2

    # backpack
    if s.get('pack'):
        rect(im, tl - 3, top_y + 1, tl, top_y + th - 3, C(170, 150, 225)); rect(im, tl - 3, top_y + 1, tl - 3, top_y + th - 3, C(140, 120, 200))
    # far arm
    def arm(side, hand):
        sx = tr - 1 if side == 'n' else tl + 1
        sy = top_y + 1
        hx, hy = sx + hand[0], sy + hand[1] + s['arm'] - 4
        sleeve = s['top'] if side == 'n' else MINT_D
        n = max(abs(hx - sx), abs(hy - sy), 1)
        for i in range(n + 1):
            x = round(sx + (hx - sx) * i / n); y = round(sy + (hy - sy) * i / n)
            col = sleeve if (i / n < 0.7 or s.get('hood')) and i < n else SKIN
            rect(im, x, y, x + 1, y + 1, col)
        return hx, hy
    arm('f', p['fa'])
    # legs
    def leg(dx, foot):
        hxp = tx + dx
        fx, fl = hxp + foot[0], foot[1]
        fy = 31 - fl
        line(im, hxp, hip, fx, fy - 1, s['legs'], s['th_leg'])
        if s['sock']: rect(im, fx, fy - 3, fx + s['th_leg'] - 1, fy - 2, s['sock'])
        rect(im, fx, fy - 1, fx + 3, fy, s['shoe'])
        rect(im, fx, fy, fx + 3, fy, C(max(0, s['shoe'][0] - 40), max(0, s['shoe'][1] - 40), max(0, s['shoe'][2] - 40)))
    leg(-1, p['fl'])
    # torso
    ty0 = top_y
    rect(im, tl, ty0, tr, hip - 1, s['top'])
    rect(im, tl, ty0, tl, hip - 1, MINT_D)                  # back shading
    if s.get('blouse'): rect(im, tx - 1, ty0, tx + 1, ty0 + 3, CREAM)
    if s['band']:
        b = s['band']
        rect(im, tl - (1 if s['skirt'] else 0), hip - b, tr + (1 if s['skirt'] else 0), hip - 1, s['bottom'])
    elif s['bottom'] and hip - 3 >= ty0:
        rect(im, tl, hip - 2, tr, hip - 1, s['bottom'])
    # star on chest
    st = s['star']
    if st >= 3:
        cx, cy = tr - 2, ty0 + 3
        for d in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]: px(im, cx + d[0], cy + d[1], GOLD)
    elif st == 1: px(im, tr - 1, ty0 + 2, GOLD)
    leg(1, p['nl'])
    # head
    ell(im, hx0, hy0, hx1, hy1, SKIN)
    hc = hair['color']
    hcl = tuple(min(255, v + 40) for v in hc[:3]) + (255,)
    # hair cap + back
    ell(im, hx0 - 1, hy0 - 1, hx1, hy0 + int(hh * 0.75), hc)
    rect(im, hx0 - 1, hy0 + 2, hx0 + int(hw * 0.42), hy0 + int(hh * 0.8), hc)
    if hair.get('style') == 'long': rect(im, hx0 - 2, hy0 + 3, hx0 + int(hw * 0.4), hy0 + hh + 2, hc)
    # face area (skin) cut-out
    rect(im, hx0 + int(hw * 0.45), hy0 + int(hh * 0.42), hx1, hy1 - 1, SKIN)
    ell(im, hx0 + int(hw * 0.38), hy0 + int(hh * 0.4), hx1, hy1, SKIN)
    # fringe
    ImageDraw.Draw(im).polygon([(hx0 - 1, hy0 + 1), (hx1, hy0 + 1), (hx1, hy0 + int(hh * 0.38)), (hx1 - 3, hy0 + int(hh * 0.5)), (hx0 + 3, hy0 + int(hh * 0.42))], fill=hc)
    # tuft / style
    st_ = hair.get('style', 'short')
    if st_ == 'short': px(im, hx0 + hw // 2 - 1, hy0 - 2, hc); px(im, hx0 + hw // 2, hy0 - 1, hc); px(im, hx0 + hw // 2 - 2, hy0 - 1, hc)
    if st_ == 'spiky':
        for k in range(0, hw, 2): px(im, hx0 + k, hy0 - 2, hc); px(im, hx0 + k, hy0 - 1, hc)
    if st_ == 'bun': ell(im, hx0 + hw // 2 - 2, hy0 - 4, hx0 + hw // 2 + 1, hy0 - 1, hc)
    # highlights
    px(im, hx0 + 3, hy0 + 1, hcl); px(im, hx0 + 4, hy0 + 1, hcl)
    # clip
    if hair.get('clip'):
        cx, cy = hx0 + 3, hy0 + 3 if hh < 10 else hy0 + 3
        for d in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]: px(im, cx + d[0], cy + d[1], GOLD)
    if hair.get('cap'):
        rect(im, hx0 - 1, hy0 - 1, hx1 + 2, hy0 + 1, hair['cap']); rect(im, hx0 - 1, hy0, hx1 + 2, hy0, tuple(max(0, v - 30) for v in hair['cap'][:3]) + (255,))
    if hair.get('glasses'):
        for x in range(hx1 - 5, hx1 - 1): px(im, x, hy0 + int(hh * 0.55), C(90, 70, 110))
    # face
    ex, ey = hx1 - 3, hy0 + int(hh * 0.55)
    if p['eyes'] == 'open': px(im, ex, ey, EYE); px(im, ex, ey + 1, EYE)
    elif p['eyes'] == 'happy': px(im, ex - 1, ey + 1, EYE); px(im, ex, ey, EYE); px(im, ex + 1, ey + 1, EYE)
    else: px(im, ex - 1, ey + 1, EYE); px(im, ex, ey + 1, EYE)
    px(im, ex - 2, ey + 2, BLUSH); px(im, ex - 1, ey + 2, BLUSH)
    my = hy0 + int(hh * 0.82)
    if p['mouth'] == 'smile': px(im, ex, my, C(200, 100, 110)); px(im, ex - 1, my - 1 + 1, C(200, 100, 110))
    elif p['mouth'] == 'open': px(im, ex, my, C(190, 80, 100)); px(im, ex - 1, my, C(190, 80, 100))
    else: px(im, ex, my, C(200, 100, 110))
    # near arm drawn last (in front)
    arm('n', p['na'])
    if s.get('books'):
        hx_, hy_ = tr - 1 + p['na'][0], top_y + 1 + p['na'][1] + s['arm'] - 4
        rect(im, hx_ - 1, hy_ - 1, hx_ + 3, hy_ + 2, C(120, 170, 230)); rect(im, hx_ - 1, hy_ + 2, hx_ + 3, hy_ + 2, C(240, 130, 160)); px(im, hx_ + 1, hy_, GOLD)
    # whole-sprite lift for airborne frames
    if lift:
        o = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); o.alpha_composite(im, (0, lift)); im = o
    # outline
    px_ = im.load(); out = im.copy(); o = out.load()
    for y in range(32):
        for x in range(32):
            if px_[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 32 and 0 <= ny < 32 and px_[nx, ny][3] > 0: o[x, y] = OUTLINE; break
    return out

def sheet(stage, poses, hair, outfit=None):
    sh = Image.new('RGBA', (32 * len(poses), 32), (0, 0, 0, 0))
    for i, pose in enumerate(poses): sh.paste(draw(stage, pose, hair, outfit), (32 * i, 0))
    return sh

NPCS = {
    'shy':       dict(hair=dict(color=C(150, 110, 190), style='long', clip=False), skin=None, outfit=dict(top=C(255, 236, 214), bottom=C(255, 170, 200), star=0)),
    'energetic': dict(hair=dict(color=C(232, 120, 50), style='spiky', clip=False, cap=C(90, 160, 235)), outfit=dict(top=C(255, 214, 90), bottom=C(90, 130, 210), star=0)),
    'calm':      dict(hair=dict(color=C(120, 80, 60), style='bun', clip=False, glasses=True), outfit=dict(top=C(170, 205, 235), bottom=C(150, 150, 170), star=0)),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for st in STAGES:
        sheet(st, HERO_POSES, HERO_HAIR).save(os.path.join(OUT, st + '.png'))
        for name, n in NPCS.items():
            sheet(st if st != 'child' else 'child', NPC_POSES, n['hair'], n['outfit']).save(os.path.join(OUT, 'npc_%s_%s.png' % (name, st)))
    print('characters ok')
    # preview (hero stages: first idle + run + hop frames) on a sky background
    prev = Image.new('RGBA', (32 * 11, 32 * 8), (205, 232, 246, 255))
    row = 0
    base = Image.open(os.path.join(OUT, 'baby_sheet.png')).convert('RGBA')
    prev.alpha_composite(base, (0, 0))
    for i, st in enumerate(STAGES):
        prev.alpha_composite(Image.open(os.path.join(OUT, st + '.png')), (0, 32 * (i + 1)))
    for i, name in enumerate(NPCS):
        prev.alpha_composite(Image.open(os.path.join(OUT, 'npc_%s_teen.png' % name)), (0, 32 * (5 + i)))
    prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save('/home/claude/chars_preview.png')
