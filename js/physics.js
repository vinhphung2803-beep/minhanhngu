// ============================================================
// physics.js - Trọng lực và va chạm với tile.
// Dùng được cho BẤT KỲ thực thể nào có: x, y, w, h, vx, vy, onGround
// (nhân vật, quả bóng, quái...). Không biết gì về đồ họa.
//
// Nguyên lý: di chuyển từng TRỤC một.
//   1. Dịch theo X  -> nếu đâm tường thì đẩy ra.
//   2. Dịch theo Y  -> nếu đâm sàn/trần thì đẩy ra.
// Tách trục giúp biết chính xác "đâm từ phía nào".
// ============================================================
const Physics = {
  step(e, level, dt) {
    // --- Trục X ---
    e.x += e.vx * dt;
    this.resolveX(e, level);

    // --- Trục Y ---
    e.vy += CONFIG.GRAVITY * dt;
    if (e.vy > CONFIG.MAX_FALL_SPEED) e.vy = CONFIG.MAX_FALL_SPEED;
    e.y += e.vy * dt;
    e.onGround = false;       // mặc định đang lơ lửng, chạm sàn mới bật lại
    this.resolveY(e, level);
  },

  resolveX(e, level) {
    const T = CONFIG.TILE;
    // Các hàng tile mà thân nhân vật đang phủ lên
    const top = Math.floor(e.y / T);
    const bottom = Math.floor((e.y + e.h - 0.001) / T);

    if (e.vx > 0) {                           // đi sang phải: kiểm tra mép phải
      const tx = Math.floor((e.x + e.w) / T);
      for (let ty = top; ty <= bottom; ty++) {
        if (level.isSolid(tx, ty)) {
          e.x = tx * T - e.w;                 // dán sát mặt trái của tile
          e.vx = 0;
          break;
        }
      }
    } else if (e.vx < 0) {                    // đi sang trái: kiểm tra mép trái
      const tx = Math.floor(e.x / T);
      for (let ty = top; ty <= bottom; ty++) {
        if (level.isSolid(tx, ty)) {
          e.x = (tx + 1) * T;                 // dán sát mặt phải của tile
          e.vx = 0;
          break;
        }
      }
    }
  },

  resolveY(e, level) {
    const T = CONFIG.TILE;
    const left = Math.floor(e.x / T);
    const right = Math.floor((e.x + e.w - 0.001) / T);

    if (e.vy > 0) {                           // đang rơi: kiểm tra mép dưới
      const ty = Math.floor((e.y + e.h) / T);
      for (let tx = left; tx <= right; tx++) {
        if (level.isSolid(tx, ty)) {
          e.y = ty * T - e.h;                 // đứng trên mặt tile
          e.vy = 0;
          e.onGround = true;
          break;
        }
      }
    } else if (e.vy < 0) {                    // đang bay lên: kiểm tra mép trên
      const ty = Math.floor(e.y / T);
      for (let tx = left; tx <= right; tx++) {
        if (level.isSolid(tx, ty)) {
          e.y = (ty + 1) * T;                 // đụng đầu vào đáy tile
          e.vy = 0;
          break;
        }
      }
    }
  }
};
