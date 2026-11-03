"""Checks the generated game assets: real dimensions, RGBA mode, transparency.
Run: python tools/validate_assets.py   (exit code 1 if something is wrong)"""
from PIL import Image
import os, sys
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
EXPECT = {  # path: (width, height)
    'characters/baby_sheet.png': (32 * 11, 32),
    'characters/baby_idle_crawl.png': (32, 32),
    'environments/tiles.png': (16 * 6, 16),
    'environments/decor.png': (32 * 8, 32),
    'environments/hills_far.png': (320, 120),
    'environments/hills_near.png': (320, 120),
    'environments/cloud.png': (40, 16),
    'environments/arch.png': (32, 32),
    'collectibles/collectibles.png': (64, 48),
    'effects/sparkle.png': (32, 8),
}
bad = 0
for rel, size in EXPECT.items():
    im = Image.open(os.path.join(A, rel))
    has_alpha = im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 255
    ok = im.size == size and im.mode == 'RGBA'
    print(('OK  ' if ok else 'BAD ') + rel, im.size, im.mode, 'transparent' if has_alpha else 'opaque')
    bad += not ok
sys.exit(1 if bad else 0)
