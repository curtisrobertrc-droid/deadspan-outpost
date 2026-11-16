// Deadspan: Outpost: merge tower defence. Plain canvas. v2: sprite art (shared with Deadspan), procedural fallback.
import { AUTOPLAY } from './config.js';
import { IMG, BG, pick } from './assets.js?v7';
import { haptic as _haptic } from './platform.js';
import { SFX as _SFX } from './audio.js';
/* fairness check: the night is fast-forwarded silently once before play (SIM), see fairScale() */
let SIM = false;
const SFX = new Proxy(_SFX, { get: (t, k) => SIM ? () => {} : t[k] });
const haptic = (...a) => SIM ? 0 : _haptic(...a);

const W = 400, COLS = 5, ROWS = 3, MAXLV = 8;
const BGW = 540, BGH = 960, BG_EDGE = 0.652;
const ZIMG = { walker: ['zombie1', 'zombie2'], runner: ['runner'], brute: ['brute'], spitter: ['spitter'], boss: ['boss'] };
const TIMG = [null, 't_gun', 'turret', 't_mg', 't_mg', 't_rocket', 't_tesla', 't_tesla', 't_rocket'];
function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function shade(hex) { const n = parseInt(hex.slice(1).padEnd(6, hex.slice(1)), 16); const f = v => Math.round(v * 0.45); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; }
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n));

// turret tiers: merge two of the same tier to get the next
export const TIERS = [
  null,
  { name: 'Pistol',   col: '#9aa5b1', rate: 1.6, dmg: 1,    kind: 'bullet' },
  { name: 'Rifle',    col: '#5fa8ff', rate: 1.8, dmg: 2.1,  kind: 'bullet' },
  { name: 'MG',       col: '#4ade80', rate: 5.0, dmg: 1.6,  kind: 'bullet' },
  { name: 'Shotgun',  col: '#facc15', rate: 1.4, dmg: 3.2,  kind: 'shot', pellets: 5 },
  { name: 'Rocket',   col: '#fb923c', rate: 1.0, dmg: 16,   kind: 'rocket', splash: 55 },
  { name: 'Tesla',    col: '#a78bfa', rate: 1.6, dmg: 18,   kind: 'tesla', chain: 5 },
  { name: 'Laser',    col: '#f472b6', rate: 2.2, dmg: 30,   kind: 'laser' },
  { name: 'Railstorm', col: '#fff',   rate: 2.0, dmg: 80,   kind: 'rocket', splash: 85 },
];
const ZT = {
  walker:  { hp: 1,   sp: 30, dmg: 1,  r: 14, scrap: 2, skin: '#7fb069', shirt: '#6b4f3a' },
  runner:  { hp: 0.6, sp: 62, dmg: 1,  r: 13, scrap: 2, skin: '#a3c45a', shirt: '#8a2b2b' },
  brute:   { hp: 7,   sp: 17, dmg: 4,  r: 24, scrap: 8, skin: '#5d8a4a', shirt: '#3b3b55' },
  spitter: { hp: 1.5, sp: 26, dmg: 1,  r: 15, scrap: 4, skin: '#b8d35a', shirt: '#2f6d5b' },
  boss:    { hp: 1,   sp: 10, dmg: 6,  r: 50, scrap: 60, skin: '#6e9b4f', shirt: '#4a2f5e' },
};
export const PERKS = {
  dmg:    { t: 'Hollow points', d: 'All turrets +25% damage', i: '💥' },
  rate:   { t: 'Oiled bolts', d: '+20% fire rate', i: '⚡' },
  scrap:  { t: 'Scavengers', d: '+50% scrap from kills', i: '🔩' },
  repair: { t: 'Patch the wall', d: 'Repair wall +40%', i: '🧱' },
  free:   { t: 'Airdrop', d: 'Free Lv 3 turret', i: '📦' },
  crit:   { t: 'Headshots', d: '+15% chance of ×3 crits', i: '🎯' },
  luck:   { t: 'Lucky crates', d: '+30% chance a deploy is Lv 2', i: '🍀' },
  slow:   { t: 'Tar pits', d: 'Zombies 15% slower', i: '🛢' },
};
export function nightInfo(N) { return { waves: 8, boss: N % 3 === 0 }; }

const SPR = {};
function mk(w, h, draw, s = 2) { const c = document.createElement('canvas'); c.width = w * s; c.height = h * s; const x = c.getContext('2d'); x.scale(s, s); draw(x); return c; }
function circ(x, cx, cy, r, col) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
function zsprite(t) {
  const z = ZT[t], size = z.r * 2.2;
  return mk(size, size * 1.25, x => {
    const s = size / 24; x.scale(s, s);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(12, 27, 8, 3, 0, 0, 7); x.fill();
    x.fillStyle = z.shirt; x.fillRect(6, 13, 12, 12);
    x.fillStyle = z.skin; x.fillRect(2, 15, 4, 9); x.fillRect(18, 15, 4, 9);
    circ(x, 12, 9, 6.5, z.skin);
    x.fillStyle = t === 'boss' ? '#ffde3b' : '#ff2a2a'; x.fillRect(8, 8, 3, 2.5); x.fillRect(13.5, 8, 3, 2.5);
    x.fillStyle = '#1a1a1a'; x.fillRect(9, 12.5, 6, 1.5);
    if (t === 'spitter') { circ(x, 12, 14, 2.5, '#d9f99d'); }
    if (t === 'boss') { x.fillStyle = '#8b1e1e'; x.fillRect(6, 18, 12, 2); x.fillStyle = '#ccc'; x.fillRect(4, 3, 3, 4); x.fillRect(17, 3, 3, 4); }
  });
}

export class Game {
  constructor(canvas, hooks) {
    this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.hooks = hooks;
    for (const t in ZT) SPR[t] = zsprite(t);
    SPR.shadow = mk(64, 24, x => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.scale(1, 24 / 64); x.beginPath(); x.arc(32, 32, 32, 0, 7); x.fill(); }, 1);
    this.ghosts = []; this.shx = this.shy = 0; this.fps = 60; this.frames = 0; this.fpsT0 = performance.now();
    this.parts = []; this.pops = []; this.shots = []; this.fx = []; this.zs = []; this.drops = []; this.blobs = [];
    this.state = 'idle'; this.t = 0; this.shake = 0; this.drag = null;
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.bindInput();
    this.setupNight(1, {}, {});
    this.last = performance.now(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  resize() {
    const vw = window.innerWidth, vh = (window.Telegram && Telegram.WebApp && Telegram.WebApp.viewportStableHeight) || window.innerHeight;
    this.H = clamp(Math.round(vh / vw * W), 640, 900);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(vw / W, vh / this.H);
    this.cv.style.width = W * scale + 'px'; this.cv.style.height = this.H * scale + 'px';
    this.cv.width = Math.round(W * scale * this.dpr); this.cv.height = Math.round(this.H * scale * this.dpr);
    this.wallY = this.H - 330; this.gridY = this.wallY + 50; this.bg = null; this.bs = this.cv.width / W;
  }
  slotPos(i) { const c = i % COLS, r = Math.floor(i / COLS); return { x: 52 + c * 74, y: this.gridY + r * 66 }; }
  slotAt(x, y) { for (let i = 0; i < COLS * ROWS; i++) { const p = this.slotPos(i); if (Math.abs(x - p.x) < 34 && Math.abs(y - p.y) < 32) return i; } return -1; }
  bindInput() {
    const pt = e => { const r = this.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * this.H }; };
    this.cv.addEventListener('pointerdown', e => {
      if (this.state !== 'play') return; const p = pt(e);
      for (const d of this.drops) if (!d.dead && Math.hypot(d.x - p.x, d.y - p.y) < 34) { this.collectDrop(d); return; }
      const i = this.slotAt(p.x, p.y);
      if (i >= 0 && this.slots[i]) { this.drag = { from: i, x: p.x, y: p.y }; haptic('light'); this.cv.setPointerCapture && this.cv.setPointerCapture(e.pointerId); }
    });
    this.cv.addEventListener('pointermove', e => { if (!this.drag) return; const p = pt(e); this.drag.x = p.x; this.drag.y = p.y; });
    const up = e => { if (!this.drag) return; const p = pt(e); const to = this.slotAt(p.x, p.y); this.dropTurret(this.drag.from, to); this.drag = null; };
    this.cv.addEventListener('pointerup', up); this.cv.addEventListener('pointercancel', () => this.drag = null);
  }

  setupNight(N, up, opts, scale = {}) {
    this.N = N; this.up = up; this.info = nightInfo(N); this.scale = scale;
    this.slots = new Array(COLS * ROWS).fill(null);
    this.wallMax = 30 + 8 * (up.armor || 0); this.wall = this.wallMax;
    this.scrap = 30 + 15 * (up.scrap || 0); this.deploys = 0; this.coins = 0; this.kills = 0;
    this.wave = 0; this.spawnQ = []; this.spawnT = 0; this.waveGap = 2.2; this.perks = {}; this.perkLog = []; this.perkShownFor = 0;
    this.combo = 0; this.comboT = 0; this.frenzy = 0; this.dropT = 6; this.over = false; this.bestTier = 1;
    this.zs.length = 0; this.shots.length = 0; this.fx.length = 0; this.parts.length = 0; this.pops.length = 0; this.drops.length = 0; this.blobs.length = 0;
    this.R = mulberry(N * 104729 + 7);
    this.place(Math.min(5, 1 + Math.floor((N - 1) / 4))); this.place(1);
  }
  start(N, up) { const sc = this.fairScale(N, up); this.setupNight(N, up, {}, sc); this.state = 'play'; this.last = performance.now(); }
  /* Never-impossible check: a handicapped bot (slow, misses drops, -30% damage) plays the night silently.
     Each loss eases the wave it died on (and a little after) until it survives twice in a row. Cached per night + upgrades. */
  fairScale(N, up) {
    const key = N + '|' + JSON.stringify(up || {}); this._fc = this._fc || {}; if (this._fc[key]) return this._fc[key];
    const t0 = performance.now(), sc = { w: {}, boss: 1 }, save = { t: this.t, delay: this.botDelay, nd: this.botNoDrops, cos: this.cos };
    let ok = 0, pass = 0; SIM = true;
    try {
      while (ok < 2 && pass < 24) {
        pass++; this.setupNight(N, up, {}, sc); this.state = 'play'; this.botDelay = 0.4; this.botNoDrops = true; this.botT = 0; this._hc = 0.7;
        let steps = 0; while (!this.over && steps < 30 * 600) { if (this.state === 'perk') this.resumeFromPerk(this._simPerk); this.autopilot(); this.update(1 / 30); steps++; }
        if (this.over && this.wall > 0) { ok++; continue; }
        ok = 0; const w = Math.max(1, this.wave);
        if (w === this.info.waves && this.info.boss && this.zs.some(z => z.t === 'boss')) sc.boss *= 0.55;
        for (let k = w; k <= this.info.waves; k++) sc.w[k] = (sc.w[k] || 1) * (k === w ? 0.7 : 0.9);
      }
    } finally { SIM = false; this._hc = 1; this.t = save.t; this.botDelay = save.delay; this.botNoDrops = save.nd; this.state = 'idle'; this.shake = 0; }
    if (window.__fairDebug) console.log('fair', N, pass, JSON.stringify(sc), Math.round(performance.now() - t0) + 'ms');
    return (this._fc[key] = sc);
  }
  pause(v) { if (this.state === 'play' && v) this.state = 'paused'; else if (this.state === 'paused' && !v) { this.state = 'play'; this.last = performance.now(); } }
  resumeFromPerk(id) {
    this.perks[id] = (this.perks[id] || 0) + 1; this.perkLog.push(id);
    if (id === 'repair') this.wall = Math.min(this.wallMax, this.wall + this.wallMax * 0.4);
    if (id === 'free') this.place(3);
    SFX.power(); haptic('success'); this.state = 'play'; this.last = performance.now();
    this.pop(200, this.wallY - 80, PERKS[id].t.toUpperCase(), '#facc15', 26);
  }

  // ---------- economy ----------
  deployCost() { return Math.round(10 + this.deploys * 7); }
  empty() { const e = []; this.slots.forEach((s, i) => { if (!s) e.push(i); }); return e; }
  place(lv, at = -1) {
    const e = this.empty(); if (!e.length) return -1; const i = at >= 0 && !this.slots[at] ? at : e[Math.floor(Math.random() * e.length)];
    this.slots[i] = { lv, cd: Math.random() * 0.4, ang: -Math.PI / 2, kick: 0, born: 0.25 };
    const p = this.slotPos(i); this.burst(p.x, p.y, TIERS[lv].col, 10, 140); this.bestTier = Math.max(this.bestTier, lv);
    return i;
  }
  deploy() {
    if (this.state !== 'play') return false; const c = this.deployCost();
    if (this.scrap < c || !this.empty().length) { haptic('warning'); return false; }
    this.scrap -= c; this.deploys++;
    const lv = Math.random() < 0.06 + 0.3 * (this.perks.luck || 0) + 0.04 * (this.up.luck || 0) ? 2 : 1;
    const i = this.place(lv); const p = this.slotPos(i);
    this.pop(p.x, p.y - 30, lv === 2 ? 'LUCKY Lv2!' : 'DEPLOYED', lv === 2 ? '#4ade80' : '#fff', lv === 2 ? 20 : 14);
    SFX.coin(); haptic('light'); return true;
  }
  dropTurret(from, to) {
    if (to < 0 || to === from) return;
    const a = this.slots[from], b = this.slots[to];
    if (!b) { this.slots[to] = a; this.slots[from] = null; return; }
    if (b.lv === a.lv && a.lv < MAXLV) { this.merge(from, to); return; }
    this.slots[to] = a; this.slots[from] = b; // swap
  }
  merge(from, to) {
    const lv = this.slots[to].lv + 1; this.slots[from] = null;
    this.slots[to] = { lv, cd: 0, ang: -Math.PI / 2, kick: 0, born: 0.35 }; this.bestTier = Math.max(this.bestTier, lv);
    const p = this.slotPos(to); this.burst(p.x, p.y, TIERS[lv].col, 26, 260); this.burst(p.x, p.y, '#fff', 8, 160);
    this.pop(p.x, p.y - 36, `${TIERS[lv].name.toUpperCase()}!`, TIERS[lv].col, 22 + lv * 1.5);
    this.addShake(2 + lv * 0.6); SFX.gateGood(); haptic(lv >= 5 ? 'heavy' : 'medium');
    !SIM && this.hooks.onMerge && this.hooks.onMerge(lv);
  }
  comboMult() { return 1 + Math.min(2, Math.floor(this.combo / 10) * 0.25); }

  // ---------- waves ----------
  buildWave() {
    const N = this.N, w = this.wave, R = this.R; const q = [];
    const sw = (this.scale && this.scale.w && this.scale.w[w]) || 1;
    const hp = (N === 1 ? 6 : N === 2 ? 11 : 15) * Math.pow(1.17, N - 1) * (1 + 0.09 * w) * sw;
    const n = Math.max(4, Math.round((7 + N * 0.9 + w * 2.2) * Math.sqrt(sw)));
    for (let i = 0; i < n; i++) {
      let t = 'walker'; const r = R();
      if (N >= 2 && r < 0.22) t = 'runner'; else if (N >= 3 && w >= 2 && r < 0.3 + Math.min(N, 20) * 0.004) t = 'brute'; else if (N >= 3 && r < 0.4) t = 'spitter';
      q.push({ t, hp, delay: (i === 0 ? 0 : rnd(0.25, 0.75) * (t === 'brute' ? 1.6 : 1)) * Math.max(0.5, 1 - N * 0.02) });
    }
    if (w === this.info.waves && this.info.boss) q.push({ t: 'boss', hp: hp * (40 + N * 4) * ((this.scale && this.scale.boss) || 1), delay: 1.5 });
    if (w === this.info.waves && !this.info.boss) for (let i = 0; i < Math.round((6 + N) * Math.sqrt(sw)); i++) q.push({ t: R() < 0.5 ? 'runner' : 'walker', hp, delay: 0.12 }); // final rush
    return q;
  }
  spawn(s) {
    const z = ZT[s.t]; const sp = z.sp * (1 - 0.15 * (this.perks.slow || 0)) * (1 + Math.min(this.N, 25) * 0.012);
    this.zs.push({ t: s.t, x: rnd(40 + z.r, 360 - z.r), y: -30, hp: s.hp * z.hp, max: s.hp * z.hp, sp, r: z.r, dmg: Math.round(z.dmg * (1 + this.N * 0.06)), atk: 0, flash: 0, wob: Math.random() * 6, slowT: 0 });
  }

  // ---------- fx ----------
  pop(x, y, txt, col = '#fff', size = 18) { if (SIM) return; if (this.pops.length > 40) this.pops.shift(); this.pops.push({ x, y, txt, col, size, t: 0 }); }
  burst(x, y, col, n = 8, sp = 160) { if (SIM) return; for (let i = 0; i < n && this.parts.length < 380; i++) { const a = Math.random() * 6.283, s = rnd(sp * 0.3, sp); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.7), t: 0, col, r: rnd(1.5, 3.5) }); } }
  addShake(v) { this.shake = Math.min(14, this.shake + v); }

  hurt(z, d, crit) {
    if (z.dead) return; z.hp -= d; z.flash = 0.07;
    if (crit) this.pop(z.x + rnd(-8, 8), z.y - z.r - 6, 'CRIT ' + fmt(d), '#ff6b6b', 15);
    if (z.hp <= 0) this.kill(z);
  }
  kill(z) {
    z.dead = true; this.kills++; this.combo++; this.comboT = 1.4;
    if (this.ghosts.length < 30) this.ghosts.push({ z, t: 0 });
    const zt = ZT[z.t]; const s = Math.round(zt.scrap * (1 + 0.5 * (this.perks.scrap || 0)) * this.comboMult());
    this.scrap += s; this.coins += z.t === 'boss' ? 60 + this.N * 10 : z.t === 'brute' ? 3 : 1;
    this.burst(z.x, z.y, this.killCol(0), z.t === 'boss' ? 60 : z.t === 'brute' ? 20 : 8, z.t === 'boss' ? 380 : 180); this.burst(z.x, z.y, this.killCol(1), 5, 120);
    if (z.t === 'boss' || z.t === 'brute') { this.addShake(z.t === 'boss' ? 14 : 4); SFX.boom(); haptic('heavy'); this.pop(z.x, z.y - 20, '+' + s, '#facc15', 22); } else SFX.kill();
    if (this.combo % 10 === 0) { this.pop(200, this.wallY - 40, `COMBO ×${this.comboMult().toFixed(1)}`, '#facc15', 24); haptic('light'); }
  }
  collectDrop(d) {
    d.dead = true; const k = d.k; SFX.power(); haptic('medium'); this.burst(d.x, d.y, '#facc15', 18, 220);
    if (k === 'scrap') { const v = 15 + this.N * 6; this.scrap += v; this.pop(d.x, d.y, '+' + v + ' SCRAP', '#facc15', 22); }
    else if (k === 'frenzy') { this.frenzy = 8; this.pop(d.x, d.y, '×2 FIRE 8s!', '#f472b6', 24); }
    else if (k === 'turret') { if (this.place(2) >= 0) this.pop(d.x, d.y, 'FREE RIFLE!', '#5fa8ff', 22); else { this.scrap += 20; this.pop(d.x, d.y, '+20 SCRAP', '#facc15', 22); } }
    else if (k === 'repair') { this.wall = Math.min(this.wallMax, this.wall + 8); this.pop(d.x, d.y, '+8 WALL', '#4ade80', 22); }
  }

  lose() { if (this.over) return; this.over = true; this.state = 'end'; SFX.lose(); haptic('error'); this.addShake(12); if (SIM) return; setTimeout(() => this.hooks.onEnd({ win: false, N: this.N, coins: this.coins, kills: this.kills, wave: this.wave, waves: this.info.waves, tier: this.bestTier }), 800); }
  win() { if (this.over) return; this.over = true; this.state = 'end'; SFX.win(); haptic('success'); const bonus = 40 + this.N * 12 + (this.info.boss ? 80 + this.N * 10 : 0) + Math.round(this.wall / this.wallMax * 30); this.coins += bonus; if (SIM) return; const bn = (this.cos && this.cos.banner) || {}; this.pop(200, this.wallY - 120, bn.t || 'DAWN!', bn.c || '#facc15', 44); this.burst(200, this.wallY - 60, '#facc15', 40, 300); setTimeout(() => this.hooks.onEnd({ win: true, N: this.N, coins: this.coins, bonus, kills: this.kills, wave: this.wave, waves: this.info.waves, tier: this.bestTier, wallPct: this.wall / this.wallMax }), 1000); }

  // ---------- update ----------
  update(dt) {
    this.t += dt;
    for (const p of this.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
    this.parts = this.parts.filter(p => p.t < p.life);
    for (const p of this.pops) { p.t += dt; p.y -= 40 * dt; }
    this.pops = this.pops.filter(p => p.t < 1);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < f.life);
    for (const g of this.ghosts) g.t += dt; if (this.ghosts.length) this.ghosts = this.ghosts.filter(g => g.t < 0.22);
    this.shake *= Math.pow(0.02, dt);
    if (this.state !== 'play') return;
    if (AUTOPLAY && !SIM) this.autopilot();

    // waves
    if (!this.spawnQ.length && !this.zs.length) {
      this.waveGap -= dt;
      if (this.waveGap <= 0) {
        if (this.wave >= this.info.waves) { this.win(); return; }
        if (this.wave > 0 && this.wave % 3 === 0 && !this.perkShownFor) { this.perkShownFor = this.wave; this.offerPerks(); return; }
        this.perkShownFor = 0; this.wave++; this.spawnQ = this.buildWave(); this.spawnT = 0.3; this.waveGap = 2.0;
        !SIM && this.hooks.onWave && this.hooks.onWave(this.wave, this.info.waves, this.wave === this.info.waves && this.info.boss);
      }
    }
    if (this.spawnQ.length) { this.spawnT -= dt; while (this.spawnQ.length && this.spawnT <= 0) { const s = this.spawnQ.shift(); this.spawn(s); this.spawnT += (this.spawnQ[0] ? this.spawnQ[0].delay : 0); } }

    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.frenzy > 0) this.frenzy -= dt;

    // supply drops
    this.dropT -= dt;
    if (this.dropT <= 0 && this.zs.length) { this.dropT = rnd(9, 14); const ks = ['scrap', 'scrap', 'frenzy', 'turret', 'repair']; this.drops.push({ k: ks[Math.floor(Math.random() * ks.length)], x: rnd(70, 330), y: -20, t: 0 }); }
    for (const d of this.drops) { d.t += dt; d.y += 38 * dt; d.x += Math.sin(d.t * 2) * 12 * dt; if (d.y > this.wallY - 20) d.dead = true; }
    this.drops = this.drops.filter(d => !d.dead);

    // zombies
    const wy = this.wallY;
    for (const z of this.zs) {
      if (z.flash > 0) z.flash -= dt;
      const stopY = z.t === 'spitter' ? wy - 150 : wy - z.r * 0.6;
      if (z.y < stopY) { z.y += z.sp * dt; z.x += Math.sin(this.t * 2 + z.wob) * 8 * dt; }
      else {
        z.atk -= dt;
        if (z.atk <= 0) {
          z.atk = z.t === 'spitter' ? 2.2 : 1;
          if (z.t === 'spitter') this.blobs.push({ x: z.x, y: z.y, tx: z.x, ty: wy, t: 0, dmg: z.dmg });
          else this.hitWall(z.dmg, z.x);
          if (this.over) return;
        }
      }
    }
    for (const b of this.blobs) { b.t += dt; b.y += 220 * dt; if (b.y >= b.ty) { b.dead = true; this.hitWall(b.dmg, b.x); this.burst(b.x, b.ty, '#d9f99d', 6, 100); if (this.over) return; } }
    this.blobs = this.blobs.filter(b => !b.dead);

    // turrets fire
    const dmgMult = (1 + 0.15 * (this.up.dmg || 0)) * (1 + 0.25 * (this.perks.dmg || 0)) * (this._hc || 1);
    const rateMult = (1 + 0.2 * (this.perks.rate || 0)) * (this.frenzy > 0 ? 2 : 1);
    const crit = 0.15 * (this.perks.crit || 0);
    const live = this.zs.filter(z => !z.dead);
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i]; if (!s) continue; if (s.born > 0) s.born -= dt; if (s.kick > 0) s.kick -= dt * 6;
      if (this.drag && this.drag.from === i) continue;
      s.cd -= dt; if (!live.length) continue;
      const p = this.slotPos(i);
      // target: closest to wall
      const range = 290 + s.lv * 22; let tg = null; for (const z of live) if (!z.dead && z.y > -10 && (!tg || z.y > tg.y) && Math.hypot(z.x - p.x, z.y - p.y) < range) tg = z; if (!tg) continue;
      const want = Math.atan2(tg.y - p.y, tg.x - p.x); s.ang += (want - s.ang) * Math.min(1, dt * 18);
      if (s.cd > 0) continue;
      const T = TIERS[s.lv]; s.cd = 1 / (T.rate * rateMult); s.kick = 1;
      const base = 6 * T.dmg * dmgMult; const isCrit = Math.random() < crit; const d = base * (isCrit ? 3 : 1);
      const mx = p.x + Math.cos(s.ang) * 20, my = p.y + Math.sin(s.ang) * 20;
      if (T.kind === 'bullet') this.shots.push({ k: 'b', x: mx, y: my, tx: tg, vx: Math.cos(s.ang) * 900, vy: Math.sin(s.ang) * 900, d, crit: isCrit, col: T.col });
      else if (T.kind === 'shot') for (let k = 0; k < T.pellets; k++) { const a = s.ang + (k - (T.pellets - 1) / 2) * 0.09; this.shots.push({ k: 'b', x: mx, y: my, vx: Math.cos(a) * 850, vy: Math.sin(a) * 850, d, crit: isCrit, col: T.col }); }
      else if (T.kind === 'rocket') this.shots.push({ k: 'r', x: mx, y: my, tx: tg, sp: 520, d, splash: T.splash, crit: isCrit, col: T.col });
      else if (T.kind === 'tesla') { let cur = tg, pts = [[mx, my]], hit = new Set(); for (let c = 0; c < T.chain && cur; c++) { pts.push([cur.x, cur.y]); hit.add(cur); this.hurt(cur, d * (1 - c * 0.12), isCrit && c === 0); let nx = null, nd = 1e9; for (const z of live) if (!z.dead && !hit.has(z)) { const dd = Math.hypot(z.x - cur.x, z.y - cur.y); if (dd < 120 && dd < nd) { nd = dd; nx = z; } } cur = nx; } this.fx.push({ k: 'zap', pts, t: 0, life: 0.12, col: T.col }); SFX.hit(); }
      else if (T.kind === 'laser') { const ex = mx + Math.cos(s.ang) * 900, ey = my + Math.sin(s.ang) * 900; for (const z of live) { if (z.dead) continue; const t2 = ((z.x - mx) * (ex - mx) + (z.y - my) * (ey - my)) / (900 * 900); if (t2 < 0) continue; const qx = mx + (ex - mx) * t2, qy = my + (ey - my) * t2; if (Math.hypot(z.x - qx, z.y - qy) < z.r + 4) this.hurt(z, d, isCrit); } this.fx.push({ k: 'beam', x1: mx, y1: my, x2: ex, y2: ey, t: 0, life: 0.1, col: T.col }); }
      if (T.kind !== 'tesla') SFX.shoot();
    }
    // projectiles
    for (const b of this.shots) {
      if (b.k === 'b') {
        b.x += b.vx * dt; b.y += b.vy * dt; if (b.y < -40 || b.x < -10 || b.x > W + 10 || b.y > this.H) { b.dead = true; continue; }
        for (const z of this.zs) { if (z.dead) continue; const dx = z.x - b.x, dy = z.y - b.y; if (dx * dx + dy * dy < (z.r + 3) ** 2) { this.hurt(z, b.d, b.crit); b.dead = true; SFX.hit(); break; } }
      } else {
        if (b.tx && b.tx.dead) { let n = null; for (const z of this.zs) if (!z.dead && (!n || z.y > n.y)) n = z; b.tx = n; }
        const tx = b.tx ? b.tx.x : b.x, ty = b.tx ? b.tx.y : b.y - 100; const a = Math.atan2(ty - b.y, tx - b.x);
        b.x += Math.cos(a) * b.sp * dt; b.y += Math.sin(a) * b.sp * dt;
        if (Math.random() < 0.6) this.parts.push({ x: b.x, y: b.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.3, t: 0, col: '#888', r: 2.5 });
        if (!b.tx || Math.hypot(tx - b.x, ty - b.y) < 10) {
          b.dead = true; for (const z of this.zs) if (!z.dead && Math.hypot(z.x - b.x, z.y - b.y) < b.splash + z.r) this.hurt(z, b.d, false);
          this.burst(b.x, b.y, '#ff9f1a', 16, 220); this.burst(b.x, b.y, '#ffe066', 6, 140); this.fx.push({ k: 'ring', x: b.x, y: b.y, r: b.splash, t: 0, life: 0.25 }); this.addShake(1.5); SFX.boom();
        }
      }
    }
    this.shots = this.shots.filter(b => !b.dead);
    this.zs = this.zs.filter(z => !z.dead);
  }
  hitWall(d, x) {
    this.wall -= d; this.addShake(1 + d * 0.8); SFX.bite(); haptic(d >= 4 ? 'heavy' : 'rigid');
    this.burst(x, this.wallY, '#a8a29e', 6, 120); this.pop(x, this.wallY - 14, '-' + d, '#ff4d4d', 16 + d);
    if (this.wall <= 0) { this.wall = 0; this.lose(); }
  }
  offerPerks() {
    const keys = Object.keys(PERKS).filter(k => !(k === 'free' && !this.empty().length));
    const pick = []; while (pick.length < 3 && keys.length) pick.push(keys.splice(Math.floor(Math.random() * keys.length), 1)[0]);
    if (SIM) { const pri = ['dmg', 'rate', 'free', 'crit', 'repair', 'luck', 'scrap', 'slow']; this._simPerk = pick.sort((a, b) => pri.indexOf(a) - pri.indexOf(b))[0]; this.state = 'perk'; return; }
    this.state = 'perk'; SFX.power(); this.hooks.onPerk(pick);
  }
  revive() {
    this.over = false; this.wall = Math.max(this.wall, this.wallMax * 0.6); this.state = 'play'; this.last = performance.now();
    for (const z of this.zs) if (z.y > this.wallY - 200 && z.t !== 'boss') z.dead = true; else if (z.t === 'boss') z.y = Math.min(z.y, 60);
    this.zs = this.zs.filter(z => !z.dead); this.pop(200, this.wallY - 80, 'WALL REBUILT!', '#4ade80', 30); this.burst(200, this.wallY, '#4ade80', 30, 260);
  }

  autopilot() {
    // self-play bot: merge highest equal pair, deploy when affordable, grab drops
    if (this.state !== 'play') return;
    this.botT = (this.botT || 0) - 1 / 60; if (this.botT > 0) return; this.botT = this.botDelay || 0.35;
    if (!this.botNoDrops) for (const d of this.drops) if (d.y > 120) { this.collectDrop(d); return; }
    const by = {}; this.slots.forEach((s, i) => { if (s && s.lv < MAXLV) (by[s.lv] = by[s.lv] || []).push(i); });
    const lvls = Object.keys(by).map(Number).sort((a, b) => b - a);
    for (const l of lvls) if (by[l].length >= 2) { this.merge(by[l][1], by[l][0]); return; }
    if (this.scrap >= this.deployCost() && this.empty().length) this.deploy();
  }

  // ---------- render (v2: sprite art, falls back to procedural shapes) ----------
  spr(name, fb, X, Y, h, rot = 0, sq = 0, flash = 0, alpha = 1, pivot = 1) {
    const c = this.ctx, e = IMG[name], b = this.bs; let img, w;
    if (e) { img = pick(e, h * b); w = h * e.aspect; } else if (fb) { img = fb; w = h * fb.width / fb.height; } else return 0;
    const co = Math.cos(rot), si = Math.sin(rot), sx = 1 + sq, sy = 1 - sq;
    c.setTransform(b * co * sx, b * si * sx, -b * si * sy, b * co * sy, b * (X + this.shx), b * (Y + this.shy));
    if (alpha < 1) c.globalAlpha = alpha;
    c.drawImage(img, -w / 2, -h * pivot, w, h);
    if (flash > 0) { c.globalAlpha = Math.min(1, flash * 14) * 0.9 * alpha; c.drawImage(e && e.white ? pick(e, h * b, true) : img, -w / 2, -h * pivot, w, h); }
    c.globalAlpha = 1; this.base(); return w;
  }
  base() { const b = this.bs; this.ctx.setTransform(b, 0, 0, b, b * this.shx, b * this.shy); }
  drawBg(c) {
    const H = this.H, b = this.bs;
    if (!this.bg || this.bgHas !== !!BG) {
      this.bgHas = !!BG;
      const cv = document.createElement('canvas'); cv.width = this.cv.width; cv.height = this.cv.height; const x = cv.getContext('2d'); x.scale(b, b);
      if (BG) {
        // line the compound edge in the art (65% down) up with the wall
        const anchor = this.wallY + 16; let sc = W / BGW, y0 = anchor - BG_EDGE * BGH * sc;
        if (y0 > 0) { sc = anchor / (BG_EDGE * BGH); y0 = 0; }
        x.fillStyle = '#52545b'; x.fillRect(0, 0, W, H);
        x.drawImage(BG, (W - BGW * sc) / 2, y0, BGW * sc, BGH * sc);
        const f = x.createLinearGradient(0, 0, 0, 140); f.addColorStop(0, 'rgba(10,8,14,.75)'); f.addColorStop(1, 'rgba(10,8,14,0)'); x.fillStyle = f; x.fillRect(0, 0, W, 140);
      } else {
        const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#221a14'); g.addColorStop(0.6, '#3a2c20'); g.addColorStop(1, '#1d1822'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.fillStyle = '#4a4c55'; x.fillRect(0, this.wallY, W, H - this.wallY);
      }
      // turret pads: chunky glossy plates
      for (let i = 0; i < COLS * ROWS; i++) { const c2 = i % COLS, r = Math.floor(i / COLS); const sx = 52 + c2 * 74, sy = this.gridY + r * 66;
        x.fillStyle = 'rgba(10,12,18,.55)'; rr(x, sx - 33, sy - 27, 66, 60, 13); x.fill();
        const g = x.createLinearGradient(0, sy - 29, 0, sy + 29); g.addColorStop(0, 'rgba(120,130,150,.55)'); g.addColorStop(1, 'rgba(40,46,60,.65)');
        x.fillStyle = g; rr(x, sx - 32, sy - 29, 64, 58, 12); x.fill(); x.strokeStyle = 'rgba(10,12,18,.9)'; x.lineWidth = 2.5; x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1.5; rr(x, sx - 29, sy - 26, 58, 20, 9); x.stroke(); }
      const v = x.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,5,0,.4)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
      this.bg = cv;
    }
    c.setTransform(1, 0, 0, 1, b * this.shx, b * this.shy); c.drawImage(this.bg, 0, 0); this.base();
  }
  // cosmetics (visual only)
  tracerCol(def) { const t = this.cos && this.cos.tracer; return !t ? def : t === 'rainbow' ? `hsl(${(this.t * 240) % 360 | 0},100%,65%)` : t; }
  killCol(i) { const k = this.cos && this.cos.kill; return k ? k[(Math.random() * k.length) | 0] : i ? '#9b1c1c' : '#6fbf4f'; }
  drawTurret(c, x, y, s, alpha = 1) {
    const T = TIERS[s.lv]; const sc = s.born > 0 ? 1 + s.born * 1.2 : 1; const n = this.tkey ? this.tkey(TIMG[s.lv]) : TIMG[s.lv];
    if (!IMG[n]) return this.drawTurretOld(c, x, y, s, alpha);
    const R = (19 + Math.min(s.lv, 8) * 0.7) * sc;
    // tier ring
    c.globalAlpha = alpha; c.drawImage(SPR.shadow, x - R * 1.2, y + R * 0.3, R * 2.4, R * 0.8);
    const g = c.createRadialGradient(x, y - R * 0.3, R * 0.2, x, y, R); g.addColorStop(0, '#fff'); g.addColorStop(0.35, T.col); g.addColorStop(1, shade(T.col));
    c.fillStyle = g; c.beginPath(); c.arc(x, y + 4, R, 0, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#0a0f18'; c.stroke();
    if (s.lv >= 7) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha * (0.35 + Math.sin(this.t * 6) * 0.15); c.fillStyle = T.col; c.beginPath(); c.arc(x, y + 4, R * 1.25, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; }
    c.globalAlpha = 1;
    const k = Math.max(0, s.kick) * 3, h = 62 * sc;
    this.spr(n, null, x, y, h, s.ang + Math.PI / 2, 0, 0, alpha, 0.62);
    if (s.kick > 0.55 && IMG.flash && alpha > 0.5) { const fx = x + Math.cos(s.ang) * h * 0.62, fy = y + Math.sin(s.ang) * h * 0.62, fz = 22 + s.lv; c.globalCompositeOperation = 'lighter'; c.drawImage(pick(IMG.flash, fz * this.bs), fx - fz / 2, fy - fz / 2, fz, fz); c.globalCompositeOperation = 'source-over'; }
    // level badge
    const bx = x + 21 * sc, by = y + 19 * sc; c.globalAlpha = alpha;
    c.fillStyle = '#0a0f18'; c.beginPath(); c.arc(bx, by, 11, 0, 7); c.fill();
    const bg = c.createLinearGradient(0, by - 9, 0, by + 9); bg.addColorStop(0, '#ffe27a'); bg.addColorStop(1, '#e08a00'); c.fillStyle = bg; c.beginPath(); c.arc(bx, by, 9, 0, 7); c.fill();
    c.fillStyle = '#2a1a00'; c.font = '900 12px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s.lv, bx, by + 1);
    c.globalAlpha = 1; void k;
  }
  drawTurretOld(c, x, y, s, alpha = 1) {
    const T = TIERS[s.lv]; const sc = s.born > 0 ? 1 + s.born * 1.2 : 1; c.save(); c.globalAlpha = alpha; c.translate(x, y); c.scale(sc, sc);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, 14, 22, 7, 0, 0, 7); c.fill();
    c.fillStyle = '#3d3a48'; c.beginPath(); c.arc(0, 4, 19, 0, 7); c.fill();
    c.fillStyle = T.col; c.beginPath(); c.arc(0, 2, 14 + Math.min(s.lv, 8) * 0.5, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(0, 4, 9, 0, 7); c.fill();
    c.rotate(s.ang + Math.PI / 2); const k = Math.max(0, s.kick) * 4;
    c.fillStyle = '#1f1d26'; const bw = s.lv >= 3 ? 7 : 5, bl = 16 + s.lv * 1.5;
    if (s.lv === 3 || s.lv === 4) { c.fillRect(-bw - 1, -bl + k, bw, bl); c.fillRect(1, -bl + k, bw, bl); } else c.fillRect(-bw / 2, -bl + k, bw, bl);
    if (s.lv >= 5) { c.fillStyle = T.col; c.fillRect(-bw / 2 - 1, -bl + k - 2, bw + 2, 4); }
    c.rotate(-(s.ang + Math.PI / 2));
    c.fillStyle = '#fff'; c.font = '900 13px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(s.lv, 0, 3); c.fillText(s.lv, 0, 3);
    c.restore();
  }
  render() {
    const c = this.ctx, H = this.H;
    this.shx = (Math.random() - 0.5) * this.shake; this.shy = (Math.random() - 0.5) * this.shake; this.base();
    this.drawBg(c);
    // drops
    for (const d of this.drops) {
      const lab = { scrap: '🔩', frenzy: '×2', turret: '🔫', repair: '🧱' }[d.k];
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(d.x - 14, d.y - 10); c.lineTo(d.x, d.y - 40); c.lineTo(d.x + 14, d.y - 10); c.stroke();
      c.fillStyle = '#e5e7eb'; c.beginPath(); c.arc(d.x, d.y - 42, 16, Math.PI, 0); c.fill();
      const pulse = 1 + Math.sin(this.t * 8) * 0.08; c.save(); c.translate(d.x, d.y); c.scale(pulse, pulse);
      if (IMG.crate) { c.restore(); this.spr('crate', null, d.x, d.y + 15 * pulse, 32 * pulse); c.save(); c.translate(d.x, d.y); c.fillStyle = 'rgba(10,15,24,.75)'; c.beginPath(); c.arc(0, 1, 11, 0, 7); c.fill(); }
      else { c.fillStyle = '#b7791f'; c.fillRect(-15, -12, 30, 26); c.strokeStyle = '#facc15'; c.lineWidth = 3; c.strokeRect(-15, -12, 30, 26); }
      c.font = '900 14px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(lab, 0, 1); c.restore();
      c.font = '800 10px system-ui'; c.fillStyle = '#facc15'; c.textAlign = 'center'; c.fillText('TAP!', d.x, d.y + 24);
    }
    // zombies
    const zs = this.zs.slice().sort((a, b) => a.y - b.y);
    for (const z of zs) { const w = z.r * 2.6; c.drawImage(SPR.shadow, z.x - w / 2, z.y + z.r * 0.7 - w * 0.15, w, w * 0.3); }
    for (const z of zs) {
      const n = ZIMG[z.t][Math.floor(z.wob * 10) % ZIMG[z.t].length];
      const ph = this.t * (z.t === 'runner' ? 14 : z.t === 'brute' || z.t === 'boss' ? 6 : 9) + z.wob;
      let h = z.r * (z.t === 'boss' ? 3.6 : 3.8); const feet = z.y + z.r * 0.7, bob = Math.abs(Math.sin(ph)) * 2;
      if (IMG[n]) this.spr(n, null, z.x, feet - bob, h, Math.sin(ph) * 0.08, Math.sin(ph * 2) * 0.04, z.flash);
      else { const s = SPR[z.t]; const ww = z.r * 2.2; h = ww * 1.25; c.drawImage(s, z.x - ww / 2, z.y - h / 2, ww, h); if (z.flash > 0) { c.globalAlpha = 0.55; c.fillStyle = '#fff'; c.beginPath(); c.arc(z.x, z.y - 2, ww * 0.4, 0, 7); c.fill(); c.globalAlpha = 1; } }
      if (z.hp < z.max) { h = IMG[n] ? 2 * h - 1.4 * z.r - 6 : h; const bw = z.t === 'boss' ? 90 : z.r * 2; c.fillStyle = '#300'; c.fillRect(z.x - bw / 2, z.y - h / 2 - 7, bw, 4); c.fillStyle = z.t === 'boss' ? '#facc15' : '#e74c3c'; c.fillRect(z.x - bw / 2, z.y - h / 2 - 7, bw * Math.max(0, z.hp) / z.max, 4); }
    }
    for (const g of this.ghosts) { const z = g.z, k = g.t / 0.22; const n = ZIMG[z.t][Math.floor(z.wob * 10) % ZIMG[z.t].length]; if (IMG[n]) this.spr(n, null, z.x, z.y + z.r * 0.7, z.r * 3.8 * (1 + k * 0.5), 0, 0, 1, 1 - k); }
    for (const b of this.blobs) { c.fillStyle = '#d9f99d'; c.beginPath(); c.arc(b.x, b.y, 5, 0, 7); c.fill(); }
    // wall
    const wy = this.wallY, pct = this.wall / this.wallMax;
    if (IMG.sandbags) { const e = IMG[this.wallKey] || IMG.sandbags, sw = 150, sh = sw / e.aspect; const im = pick(e, sh * this.bs); for (let i = 0; i < 4; i++) { const x = -20 + i * 118; const dmg = pct < ((i % 3) + 1) * 0.25; c.globalAlpha = dmg ? 0.75 : 1; c.drawImage(im, x, wy - sh * 0.62 + (dmg ? 4 : 0), sw, sh); } c.globalAlpha = 1; if (pct < 0.5) { c.fillStyle = `rgba(60,20,10,${(0.5 - pct) * 0.6})`; c.fillRect(0, wy - 24, W, 36); } }
    else for (let i = 0; i < 10; i++) { const x = i * 40; const dmg = pct < (i % 3 + 1) * 0.25; c.fillStyle = dmg ? '#57534e' : '#78716c'; c.fillRect(x + 1, wy - 12, 38, 22); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 1, wy + 6, 38, 4); if (dmg) { c.strokeStyle = '#292524'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 10, wy - 12); c.lineTo(x + 18, wy); c.lineTo(x + 12, wy + 10); c.stroke(); } }
    c.fillStyle = '#0a0f18'; rr(c, 98, wy + 18, 204, 14, 7); c.fill(); c.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#ef4444'; rr(c, 100, wy + 20, Math.max(4, 200 * pct), 10, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, 102, wy + 21, Math.max(2, 196 * pct), 3, 2); c.fill();
    c.font = '800 9px system-ui'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText(`WALL ${Math.ceil(this.wall)}/${this.wallMax}`, 200, wy + 25.5); c.fillText(`WALL ${Math.ceil(this.wall)}/${this.wallMax}`, 200, wy + 25.5);
    // turrets + merge hints
    const dragLv = this.drag ? this.slots[this.drag.from].lv : 0;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i]; const p = this.slotPos(i);
      if (this.drag && i !== this.drag.from && s && s.lv === dragLv && dragLv < MAXLV) { c.strokeStyle = '#facc15'; c.lineWidth = 3; c.globalAlpha = 0.6 + Math.sin(this.t * 10) * 0.3; c.strokeRect(p.x - 31, p.y - 28, 62, 56); c.globalAlpha = 1; }
      if (!s) continue; if (this.drag && this.drag.from === i) { this.drawTurret(c, p.x, p.y, s, 0.3); continue; }
      this.drawTurret(c, p.x, p.y, s);
    }
    if (this.drag) this.drawTurret(c, this.drag.x, this.drag.y - 20, this.slots[this.drag.from], 0.9);
    // shots + fx
    c.lineCap = 'round';
    c.globalCompositeOperation = 'lighter';
    for (const b of this.shots) { if (b.k === 'b') { c.strokeStyle = this.tracerCol(b.col); c.lineWidth = 3; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012); c.stroke(); } else { c.fillStyle = b.col; c.beginPath(); c.arc(b.x, b.y, 4.5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, 2, 0, 7); c.fill(); } }
    c.globalCompositeOperation = 'source-over';
    for (const f of this.fx) {
      const a = 1 - f.t / f.life; c.globalAlpha = a;
      if (f.k === 'zap') { c.strokeStyle = f.col; c.lineWidth = 3; c.beginPath(); f.pts.forEach(([x, y], i) => { const jx = i ? rnd(-6, 6) : 0; i ? c.lineTo(x + jx, y + rnd(-6, 6)) : c.moveTo(x, y); }); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
      else if (f.k === 'beam') { c.strokeStyle = f.col; c.lineWidth = 7 * a; c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); }
      else if (f.k === 'ring') { c.strokeStyle = '#ffb347'; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, f.r * (0.4 + 0.6 * f.t / f.life), 0, 7); c.stroke(); }
    }
    c.globalAlpha = 1;
    for (const p of this.parts) { c.globalAlpha = Math.max(0, 1 - p.t / p.life); c.fillStyle = p.col; c.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
    c.globalAlpha = 1;
    if (this.frenzy > 0) { c.fillStyle = `rgba(244,114,182,${0.08 + Math.sin(this.t * 12) * 0.04})`; c.fillRect(0, 0, W, H); }
    if (this.combo >= 10) { c.font = '900 16px system-ui'; c.textAlign = 'left'; c.fillStyle = '#facc15'; c.fillText(`COMBO ×${this.comboMult().toFixed(1)}  (${this.combo})`, 12, wy - 30); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const p of this.pops) {
      const k = p.t < 0.12 ? p.t / 0.12 : 1; const s = p.size * (0.6 + 0.6 * k - 0.2 * Math.max(0, p.t - 0.12));
      c.globalAlpha = 1 - Math.max(0, p.t - 0.6) / 0.4; c.font = `900 ${s | 0}px system-ui,sans-serif`;
      c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(p.txt, p.x, p.y); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y);
    }
    c.globalAlpha = 1;
  }
  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    try { this.update(dt); this.render(); } catch (e) { console.error(e); }
    this.frames++; if (now - this.fpsT0 >= 1000) { this.fps = this.frames * 1000 / (now - this.fpsT0); this.frames = 0; this.fpsT0 = now; }
    if (this.hooks.onTick && (this.state === 'play' || this.state === 'perk')) this.hooks.onTick(this);
    requestAnimationFrame(this.loop);
  }
}
