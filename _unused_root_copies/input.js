// ============================================================
// input.js - Chỉ làm một việc: ghi nhớ phím nào đang bấm.
// Game không đọc phím trực tiếp, mà hỏi Input: "đang đi trái không?"
// Sau này thêm điều khiển cảm ứng chỉ cần sửa file này.
// ============================================================
const Input = {
  held: {},     // phím đang giữ
  pressed: {},  // phím vừa mới bấm trong bước này

  LEFT:  ['ArrowLeft', 'KeyA'],
  RIGHT: ['ArrowRight', 'KeyD'],
  JUMP:  ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],

  init() {
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed[e.code] = true;
      this.held[e.code] = true;
      // Chặn phím mũi tên/space làm cuộn trang
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.held[e.code] = false;
    });
    // Rời tab thì coi như thả hết phím, tránh nhân vật chạy mãi
    window.addEventListener('blur', () => { this.held = {}; });
  },

  _any(map, codes) {
    return codes.some((c) => map[c]);
  },

  left()        { return this._any(this.held, this.LEFT); },
  right()       { return this._any(this.held, this.RIGHT); },
  jumpHeld()    { return this._any(this.held, this.JUMP); },
  jumpPressed() { return this._any(this.pressed, this.JUMP); },
  wasPressed(code) { return !!this.pressed[code]; },

  // Gọi cuối mỗi bước cập nhật để xóa "vừa mới bấm"
  endStep() {
    this.pressed = {};
  }
};
