"""Builds data/social_levels.js with equal-length rows. Run: python tools/make_social_levels.py
(You can also edit data/social_levels.js by hand - it is plain text.)"""
import json, os
H = 12
def grid(W): return [['.'] * W for _ in range(H)]
def ground(g, W):
    for c in range(W): g[10][c] = '#'; g[11][c] = '#'
def put(g, c, r, ch): g[r][c] = ch
def rows(g): return [''.join(r) for r in g]
levels = {}

W = 40; g = grid(W); ground(g, W)                               # L1: meet two friends
put(g, 2, 9, 'S'); put(g, 12, 9, 'Q'); put(g, 27, 9, 'R')
for c, ch in [(6,'T'),(9,'f'),(17,'g'),(21,'b'),(24,'f'),(33,'T'),(36,'g'),(4,'s'),(38,'m')]: put(g, c, 9, ch)
levels['1'] = dict(rows=rows(g), npcs=['energetic', 'shy'], coop=False, goal='friends', need=100)

W = 56; g = grid(W); ground(g, W)                               # L2: plate + gate with one friend
put(g, 2, 9, 'S'); put(g, 6, 9, 'Q')
for c in (13, 14, 15): put(g, c, 9, 'x')
put(g, 22, 9, 'B'); put(g, 28, 9, 'B'); put(g, 29, 9, 'B')
for r in (6, 7, 8, 9): put(g, 36, r, 'X')
put(g, 50, 9, 'E')
for c, ch in [(4,'f'),(9,'T'),(18,'g'),(25,'b'),(33,'m'),(40,'T'),(44,'f'),(47,'g'),(53,'b')]: put(g, c, 9, ch)
levels['2'] = dict(rows=rows(g), npcs=['energetic'], coop=True, goal='exit', need=0)

W = 100; g = grid(W); ground(g, W)                              # L3: three friends, two gates
put(g, 2, 9, 'S'); put(g, 6, 9, 'Q'); put(g, 44, 9, 'R'); put(g, 80, 9, 'Z')
for c in (14, 15, 16): put(g, c, 9, 'x')
for c in (56, 57, 58): put(g, c, 9, 'y')
for r in (6, 7, 8, 9): put(g, 38, r, 'X'); put(g, 74, r, 'Y')
for c in (24, 30, 31, 63, 87, 88): put(g, c, 9, 'B')
put(g, 95, 9, 'E')
for c, ch in [(4,'f'),(10,'T'),(20,'g'),(27,'b'),(34,'m'),(42,'f'),(48,'T'),(52,'g'),(61,'b'),(67,'f'),(70,'T'),(78,'g'),(84,'f'),(91,'T'),(97,'g')]: put(g, c, 9, ch)
levels['3'] = dict(rows=rows(g), npcs=['energetic', 'shy', 'calm'], coop=True, goal='group', need=60)

W = 50; g = grid(W); ground(g, W)                               # finale phase: one shy friend + gate
put(g, 2, 9, 'S'); put(g, 6, 9, 'Q')
for c in (13, 14, 15): put(g, c, 9, 'x')
put(g, 24, 9, 'B')
for r in (6, 7, 8, 9): put(g, 32, r, 'X')
put(g, 45, 9, 'E')
for c, ch in [(4,'g'),(9,'T'),(19,'f'),(28,'b'),(38,'T'),(41,'f'),(48,'g')]: put(g, c, 9, ch)
levels['finale'] = dict(rows=rows(g), npcs=['shy'], coop=True, goal='exit', need=0)

HEAD = """// ============================================================
// data/social_levels.js - levels of Making Friends (and the Discover Yourself social phase).
// Legend: # ground  B stone block  S spawn  Q R Z = NPC slots 1/2/3  x y = pressure plates
//         X Y = gates (X opens with plate x, Y with plate y)  E = exit  f g T b m s = decoration
// npcs   : NPC types in slot order (shy | energetic | calm) - see data/npc_data.js
// coop   : adds the Follow / Wait commands
// goal   : friends (all NPC friendship >= need) | exit (reach E) | group (reach E, everyone >= need, last NPC next to you)
// ============================================================
const SOCIAL_LEVELS = {
"""
path = os.path.join(os.path.dirname(__file__), '..', 'data', 'social_levels.js')
with open(path, 'w') as f:
    f.write(HEAD)
    for k, v in levels.items():
        f.write('  %s: {\n    npcs: %s, coop: %s, goal: %s, need: %d,\n    rows: [\n' % (json.dumps(k), json.dumps(v['npcs']), 'true' if v['coop'] else 'false', json.dumps(v['goal']), v['need']))
        f.write(',\n'.join("      '%s'" % r for r in v['rows']))
        f.write('\n    ]\n  },\n')
    f.write('};\n')
print({k: (len(v['rows']), set(len(r) for r in v['rows'])) for k, v in levels.items()})
