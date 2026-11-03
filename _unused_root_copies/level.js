// ============================================================
// level.js - Biến dữ liệu màn chơi (mảng chuỗi) thành đối tượng
// biết trả lời: "ô (tx, ty) có đặc không?"
//
// Ký hiệu trong data/level1.js:
//   #  = tile đặc (đứng lên được)
//   .  = trống
//   S  = điểm xuất phát của người chơi (là ô trống)
// ============================================================
class Level {
  constructor(rows) {
    this.rowCount = rows.length;
    this.colCount = rows[0].length;
    this.widthPx = this.colCount * CONFIG.TILE;
    this.heightPx = this.rowCount * CONFIG.TILE;
    this.spawn = { x: 0, y: 0 };

    this.solid = rows.map((row, ty) =>
      [...row].map((ch, tx) => {
        if (ch === 'S') {
          this.spawn = { x: tx * CONFIG.TILE, y: ty * CONFIG.TILE };
        }
        return ch === '#';
      })
    );
  }

  isSolid(tx, ty) {
    // Hai biên trái/phải của màn là tường vô hình -> không đi ra ngoài được
    if (tx < 0 || tx >= this.colCount) return true;
    // Phía trên và dưới màn là khoảng trống (rơi xuống hố thì respawn)
    if (ty < 0 || ty >= this.rowCount) return false;
    return this.solid[ty][tx];
  }
}
