// ============================================================
// fx.js - Small particles: sparkles, confetti, floating text.
// ============================================================
const Fx = {
  list: [],
  floaters: [],

  burst(x, y, colors, n = 8, speed = 50) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const s = speed * (0.5 + Math.random() * 0.7);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.3, age: 0, color: colors[i % colors.length], size: Math.random() < 0.3 ? 2 : 1, grav: 120 });
    }
  },

  confetti(n = 60) {
    const cols = ['#ff8cb4', '#ffd65a', '#96d0ff', '#aae1aa', '#c8aaff'];
    for (let i = 0; i < n; i++) {
      this.list.push({ x: Math.random() * CONFIG.WIDTH, y: -Math.random() * 40, vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 30, life: 6 + Math.random() * 3, age: 0, color: cols[i % cols.length], size: 2, grav: 4, screen: true });
    }
  },

  dust(x, y) {
    for (let i = 0; i < 4; i++) this.list.push({ x: x + (i - 1.5) * 3, y, vx: (i - 1.5) * 14, vy: -8 - Math.random() * 6, life: 0.3, age: 0, color: '#f4e9d8', size: 1, grav: 20 });
  },

  text(x, y, str, color) { this.floaters.push({ x, y, str, color, age: 0, life: 0.9 }); },

  update(dt) {
    this.list = this.list.filter((p) => {
      p.age += dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      return p.age < p.life;
    });
    this.floaters = this.floaters.filter((f) => { f.age += dt; f.y -= 14 * dt; return f.age < f.life; });
  },

  draw(ctx, cx, cy) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.life - p.age) * 2));
      ctx.fillStyle = p.color;
      const x = Math.round(p.x - (p.screen ? 0 : cx)), y = Math.round(p.y - (p.screen ? 0 : cy));
      ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, (f.life - f.age) * 3);
      Text.draw(ctx, f.str, Math.round(f.x - cx), Math.round(f.y - cy), { align: 'center', color: f.color, shadow: '#3a2a4d' });
    }
    ctx.globalAlpha = 1;
  }
};
