// ============================================================
// config.js - Mọi con số "chỉnh cảm giác chơi" nằm ở đây.
// Muốn nhảy cao hơn, chạy nhanh hơn... chỉ cần sửa file này.
// Đơn vị: pixel (trong hệ tọa độ logic 320x180) và giây.
// ============================================================
const CONFIG = {
  WIDTH: 320,
  HEIGHT: 180,
  TILE: 16,

  // Mỗi bước cập nhật game luôn dài đúng 1/60 giây (xem main.js)
  FIXED_STEP: 1 / 60,

  GRAVITY: 900,          // px/giây^2
  MAX_FALL_SPEED: 400,   // giới hạn tốc độ rơi
  MOVE_SPEED: 90,        // px/giây
  JUMP_SPEED: 270,       // độ cao nhảy ~ JUMP_SPEED^2 / (2*GRAVITY) = ~40px (2.5 tile)
  JUMP_RELEASE_SPEED: 90,// thả phím nhảy sớm -> nhảy thấp hơn

  CAMERA_LERP: 0.12      // 0 = đứng yên, 1 = bám cứng. 0.1-0.2 là mượt
};
