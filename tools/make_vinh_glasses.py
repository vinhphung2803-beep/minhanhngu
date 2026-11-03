# Tạo npc_vinh_<stage>.png = npc_calm_<stage>.png + kính cận (chỉ dùng cho màn đánh Chapter 2).
# Không sửa npc_calm_*. Neo vị trí theo 4 pixel "kính" cũ (5a466e) nên bám đúng đầu ở mọi frame.
import os
from PIL import Image
D = os.path.join(os.path.dirname(__file__), '..', 'assets', 'characters')
OLD = (0x5a, 0x46, 0x6e); FRAME = (0x2e, 0x2a, 0x5c, 255); GLINT = (0xe8, 0xf4, 0xff, 255)
OUTLINE = (0x3e, 0x2c, 0x40); HAIR = (0x78, 0x50, 0x3c)
for st in ['child', 'preteen', 'teen', 'young']:
    im = Image.open(os.path.join(D, 'npc_calm_%s.png' % st)).convert('RGBA'); px = im.load()
    for f in range(im.width // 32):
        ox = f * 32
        pts = [(x, y) for y in range(0, 24) for x in range(32) if px[ox + x, y][:3] == OLD and px[ox + x, y][3]]
        if not pts: print('frame without glasses anchor', st, f); continue
        yg = pts[0][1]; xs = min(p[0] for p in pts)
        # ô kính 5x4 quanh mắt; chỉ vẽ lên pixel da/tóc, không đè viền outline
        ring = [(x, yg - 1) for x in range(xs, xs + 5)] + [(x, yg + 2) for x in range(xs, xs + 5)] \
             + [(xs, yg), (xs, yg + 1), (xs + 4, yg), (xs + 4, yg + 1)]
        temple = [(xs - 1, yg), (xs - 2, yg)]            # gọng nối ra phía tóc
        for x, y in ring + temple:
            p = px[ox + x, y]
            if p[3] and p[:3] != OUTLINE: px[ox + x, y] = FRAME
        # mắt/da bên trong tròng giữ nguyên; thêm điểm sáng nhỏ ở góc trên-trái tròng nếu là da
        g = px[ox + xs + 1, yg]
        if g[3] and g[:3] not in (OUTLINE, (0x3a, 0x2a, 0x4d)): px[ox + xs + 1, yg] = GLINT
    im.save(os.path.join(D, 'npc_vinh_%s.png' % st))
print('ok')
