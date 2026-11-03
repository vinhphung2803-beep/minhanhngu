// ============================================================
// level.js - Turns the level strings into a solid-tile grid plus
// lists of things to draw/collect. Physics only needs isSolid().
// (See data/level1.js for the legend.)
// ============================================================
class Level {
  constructor(rows, hints) {
    this.rowCount = rows.length;
    this.colCount = rows[0].length;
    this.widthPx = this.colCount * CONFIG.TILE;
    this.heightPx = this.rowCount * CONFIG.TILE;
    this.spawn = { x: 0, y: 0 };
    this.hints = hints || {};

    this.kind = [];          // tile kind per cell: 0 empty, '#','B','W'
    this.solid = [];
    this.collectibles = [];  // {type, x, y, taken, t, ...}
    this.decor = [];         // {frame, x, y}
    this.checkpoints = [];   // {x, y, active}
    this.triggers = [];      // {x, y, w, h, key, done}
    this.exit = null;        // {x, y, w, h}
    this.stations = [];      // hub stations {id, x, y}
    this.plates = {};        // id -> {id, x, y, w, h, pressed}
    this.gates = {};         // id -> {id, tiles, open, timer, plate}
    this.npcSpawns = [];     // {slot, x, y}
    this.gather = null;      // {x, y}

    const T = CONFIG.TILE;
    const DECOR = { f: 0, g: 1, T: 2, b: 3, m: 4, s: 5, k: 7 };
    const ITEM = { '*': 'star', h: 'heart', p: 'plane' };

    for (let ty = 0; ty < this.rowCount; ty++) {
      const krow = [], srow = [];
      for (let tx = 0; tx < this.colCount; tx++) {
        const ch = rows[ty][tx];
        let kind = 0;
        if (ch === '#' || ch === 'B' || ch === 'W') kind = ch;
        krow.push(kind);
        srow.push(kind !== 0);
        const px = tx * T, py = ty * T;
        if (ch === 'S') this.spawn = { x: px, y: py };
        else if (ITEM[ch]) this.collectibles.push({ type: ITEM[ch], x: px + T / 2, y: py + T / 2, taken: false, t: 0, phase: (tx * 0.7) % 6.28 });
        else if (ch in DECOR) this.decor.push({ frame: DECOR[ch], x: px + T / 2 - 16, y: py + T - 32 });
        else if (ch === 'C') this.checkpoints.push({ x: px, y: py, active: false });
        else if (ch === 'E') this.exit = { x: px - 8, y: py - 16, w: 32, h: 32 };
        else if ('ALFDK'.includes(ch)) this.stations.push({ id: { A: 'artist', L: 'language', F: 'friends', D: 'discover', K: 'boss18' }[ch], x: px, y: py });
        else if (ch === 'x' || ch === 'y') { const p = this.plates[ch] || (this.plates[ch] = { id: ch, x: px, y: py, w: 0, h: T, pressed: false, minx: px }); p.w += T; p.minx = Math.min(p.minx, px); p.x = p.minx; }
        else if (ch === 'X' || ch === 'Y') { const g = this.gates[ch] || (this.gates[ch] = { id: ch, tiles: [], open: false, timer: 0, plate: ch.toLowerCase() }); g.tiles.push({ tx, ty }); }
        else if ('QRZ'.includes(ch)) this.npcSpawns.push({ slot: 'QRZ'.indexOf(ch), x: px + T / 2, y: py + T });
        else if (ch === 'G') this.gather = { x: px, y: py };
        else if (ch >= '1' && ch <= '9') this.triggers.push({ x: px, y: py - 32, w: T, h: 64, key: ch, done: false });
      }
      this.kind.push(krow);
      this.solid.push(srow);
    }
    Object.values(this.gates).forEach((g) => g.tiles.forEach((t) => { this.solid[t.ty][t.tx] = true; }));
    this.totals = { star: 0, heart: 0, plane: 0 };
    this.collectibles.forEach((c) => this.totals[c.type]++);
  }

  isSolid(tx, ty) {
    if (tx < 0 || tx >= this.colCount) return true;   // invisible side walls
    if (ty < 0 || ty >= this.rowCount) return false;  // fall into a pit -> respawn
    return this.solid[ty][tx];
  }

  // Pressure plates open gates while something stands on them. After the weight is
  // removed the gate stays open for GATE_DELAY seconds (so a lone player cannot simply run
  // from the plate to the gate when the plate is far away -> teamwork needed).
  updatePuzzle(dt, entities) {
    const GATE_DELAY = 1.4;
    for (const p of Object.values(this.plates)) {
      p.pressed = entities.some((e) => e.onGround && e.x + e.w > p.x + 2 && e.x < p.x + p.w - 2 && e.y + e.h > p.y + 4 && e.y + e.h <= p.y + p.h + 2);
    }
    for (const g of Object.values(this.gates)) {
      const plate = this.plates[g.plate];
      if (plate && plate.pressed) { g.timer = GATE_DELAY; if (!g.open) this.setGate(g, true); }
      else if (g.open) {
        g.timer -= dt;
        const blocked = entities.some((e) => g.tiles.some((t) => e.x + e.w > t.tx * CONFIG.TILE && e.x < (t.tx + 1) * CONFIG.TILE && e.y + e.h > t.ty * CONFIG.TILE && e.y < (t.ty + 1) * CONFIG.TILE));
        if (g.timer <= 0 && !blocked) this.setGate(g, false);
      }
    }
  }

  setGate(g, open) {
    g.open = open;
    g.tiles.forEach((t) => { this.solid[t.ty][t.tx] = !open; });
    if (typeof Sfx !== 'undefined') Sfx.play(open ? 'ui' : 'land');
  }

  tileKind(tx, ty) {
    if (tx < 0 || tx >= this.colCount || ty < 0 || ty >= this.rowCount) return 0;
    return this.kind[ty][tx];
  }
}
