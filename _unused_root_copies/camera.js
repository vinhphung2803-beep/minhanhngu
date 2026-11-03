// ============================================================
// camera.js - Camera chỉ là một con số: góc trên-trái của
// "khung nhìn 320x180" nằm ở đâu trong thế giới.
// Khi vẽ, ta lấy vị trí thế giới TRỪ vị trí camera.
// ============================================================
class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
  }

  follow(target, level, snap = false) {
    // Muốn nhân vật ở giữa khung nhìn
    let tx = target.x + target.w / 2 - CONFIG.WIDTH / 2;
    let ty = target.y + target.h / 2 - CONFIG.HEIGHT / 2;

    // Không cho camera lòi ra ngoài rìa màn chơi
    tx = Math.max(0, Math.min(level.widthPx - CONFIG.WIDTH, tx));
    ty = Math.max(0, Math.min(level.heightPx - CONFIG.HEIGHT, ty));

    if (snap) {                       // dùng khi bắt đầu / respawn: nhảy thẳng tới
      this.x = tx;
      this.y = ty;
    } else {                          // bình thường: trượt mượt về phía mục tiêu
      this.x += (tx - this.x) * CONFIG.CAMERA_LERP;
      this.y += (ty - this.y) * CONFIG.CAMERA_LERP;
    }
  }
}
