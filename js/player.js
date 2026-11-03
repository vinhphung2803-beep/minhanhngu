// ============================================================
// player.js - Trạng thái và hành vi của nhân vật.
// KHÔNG chứa code vẽ. Vẽ nằm ở renderer.js.
//
// `state` và `facing` được tính sẵn từ bây giờ để sau này
// chọn đúng animation (idle/run/jump/fall) mà không phải sửa logic.
// ============================================================
class Player {
  constructor(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    // Hitbox (vùng va chạm). Sau này có sprite 32x32 thì hitbox
    // vẫn có thể giữ 16x16 hoặc 20x14, độc lập với kích thước ảnh.
    this.w = 16;
    this.h = 16;
    this.reset();
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;       // 1 = nhìn phải, -1 = nhìn trái
    this.state = 'idle';   // 'idle' | 'run' | 'jump' | 'fall'
  }

  update(dt, level) {
    // 1. Đọc ý muốn của người chơi
    const dir = (Input.right() ? 1 : 0) - (Input.left() ? 1 : 0);
    this.vx = dir * CONFIG.MOVE_SPEED;
    if (dir !== 0) this.facing = dir;

    // 2. Nhảy (chỉ khi đang đứng trên đất)
    if (Input.jumpPressed() && this.onGround) {
      this.vy = -CONFIG.JUMP_SPEED;
      this.onGround = false;
    }
    // Thả phím sớm khi đang bay lên -> cắt bớt lực nhảy
    if (!Input.jumpHeld() && this.vy < -CONFIG.JUMP_RELEASE_SPEED) {
      this.vy = -CONFIG.JUMP_RELEASE_SPEED;
    }

    // 3. Giao cho physics xử lý trọng lực + va chạm
    Physics.step(this, level, dt);

    // 4. Cập nhật trạng thái (để dành cho animation sau này)
    if (!this.onGround) this.state = this.vy < 0 ? 'jump' : 'fall';
    else this.state = dir !== 0 ? 'run' : 'idle';
  }
}
