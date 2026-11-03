// ============================================================
// main.js - "Nhạc trưởng": khởi tạo mọi thứ và chạy vòng lặp.
// Không chứa luật chơi chi tiết, chỉ gọi các module khác.
//
// Vòng lặp dùng FIXED TIMESTEP:
//   - Vẽ: mỗi lần trình duyệt cho phép (60Hz, 120Hz...).
//   - Cập nhật logic: luôn từng bước đúng 1/60 giây.
// Nhờ vậy nhảy cao/chạy nhanh như nhau trên mọi máy.
// ============================================================
const Game = {
  canvas: null,
  ctx: null,
  level: null,
  player: null,
  camera: null,
  debug: false,

  lastTime: 0,
  accumulator: 0,
  fps: 0,
  _fpsFrames: 0,
  _fpsTimer: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;   // giữ pixel sắc nét

    Input.init();
    this.level = new Level(LEVEL_1);
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
    this.camera = new Camera();
    this.camera.follow(this.player, this.level, true);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    requestAnimationFrame((t) => {
      this.lastTime = t;
      this.loop(t);
    });
  },

  // Phóng canvas theo SỐ NGUYÊN (x2, x3, x4...) để pixel không bị méo
  resize() {
    const scale = Math.max(1, Math.floor(Math.min(
      window.innerWidth / CONFIG.WIDTH,
      window.innerHeight / CONFIG.HEIGHT
    )));
    this.canvas.style.width = CONFIG.WIDTH * scale + 'px';
    this.canvas.style.height = CONFIG.HEIGHT * scale + 'px';
  },

  loop(now) {
    // Thời gian giữa hai khung hình (giây), giới hạn để tránh "nhảy cóc"
    // khi người chơi chuyển tab rồi quay lại
    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frameTime > 0.1) frameTime = 0.1;

    this.accumulator += frameTime;
    while (this.accumulator >= CONFIG.FIXED_STEP) {
      this.update(CONFIG.FIXED_STEP);
      this.accumulator -= CONFIG.FIXED_STEP;
    }

    this.render();
    this.countFps(frameTime);
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    if (Input.wasPressed('KeyG')) this.debug = !this.debug;   // G = bật/tắt debug
    if (Input.wasPressed('KeyR')) this.respawn();             // R = về điểm xuất phát

    this.player.update(dt, this.level);

    // Rơi khỏi màn chơi -> về điểm xuất phát
    if (this.player.y > this.level.heightPx + 64) this.respawn();

    this.camera.follow(this.player, this.level);
    Input.endStep();   // luôn gọi CUỐI mỗi bước cập nhật
  },

  respawn() {
    this.player.reset();
    this.camera.follow(this.player, this.level, true);
  },

  render() {
    Renderer.render(this.ctx, this);
  },

  countFps(frameTime) {
    this._fpsFrames++;
    this._fpsTimer += frameTime;
    if (this._fpsTimer >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsTimer);
      this._fpsFrames = 0;
      this._fpsTimer = 0;
    }
  }
};

window.addEventListener('load', () => Game.init());
