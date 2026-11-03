// ============================================================
// input.js - Chỉ làm một việc: ghi nhớ phím nào đang bấm.
// Game không đọc phím trực tiếp, mà hỏi Input: "đang đi trái không?"
// Sau này thêm điều khiển cảm ứng chỉ cần sửa file này.
// ============================================================
const Input = {
  held: {},     // keys being held
  pressed: {},  // keys pressed this step (a tap on the canvas also counts as 'Enter')
  realPressed: {}, // only REAL keyboard presses (no synthetic tap-Enter)
  pointer: { x: -1, y: -1, down: false, pressed: false, released: false },

  LEFT:  ['ArrowLeft', 'KeyA'],
  RIGHT: ['ArrowRight', 'KeyD'],
  JUMP:  ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) { this.pressed[e.code] = true; this.realPressed[e.code] = true; }
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

    // Tap / click on the game = confirm (menus, dialogue)
    if (canvas) {
      const upd = (e) => {
        const r = canvas.getBoundingClientRect();
        this.pointer.x = (e.clientX - r.left) * CONFIG.WIDTH / r.width;
        this.pointer.y = (e.clientY - r.top) * CONFIG.HEIGHT / r.height;
      };
      canvas.addEventListener('pointerdown', (e) => {
        upd(e); this.pointer.down = true; this.pointer.pressed = true;
        this.pressed['Enter'] = true; this.pressed['_pointer'] = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      });
      canvas.addEventListener('pointermove', upd);
      const up = (e) => { upd(e); if (this.pointer.down) this.pointer.released = true; this.pointer.down = false; };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
    }
    // On-screen buttons for phones/tablets: <button data-key="ArrowLeft"> ...
    document.querySelectorAll('[data-key]').forEach((btn) => {
      const code = btn.getAttribute('data-key');
      const down = (e) => { e.preventDefault(); if (!this.held[code]) this.pressed[code] = true; this.held[code] = true; btn.classList.add('down'); };
      const up = (e) => { e.preventDefault(); this.held[code] = false; btn.classList.remove('down'); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
  },

  any() { return Object.keys(this.pressed).length > 0 || this.pointer.pressed; },
  key(code) { return !!this.realPressed[code]; },
  inRect(x, y, w, h) { const p = this.pointer; return p.x >= x && p.x < x + w && p.y >= y && p.y < y + h; },

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
    this.realPressed = {};
    this.pointer.pressed = false;
    this.pointer.released = false;
  }
};
