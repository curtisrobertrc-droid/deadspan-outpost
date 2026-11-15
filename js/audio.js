// Tiny WebAudio synth — no audio files needed.
let ctx = null, master = null, on = true;
export function setSound(v) { on = v; }
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.25; master.connect(ctx.destination); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function unlockAudio() { ac(); }
const last = {};
function tone(name, f0, f1, dur, type = 'square', vol = 0.3, gap = 40) {
  if (!on) return; const c = ac(); if (!c) return;
  const t = c.currentTime; if (last[name] && t - last[name] < gap / 1000) return; last[name] = t;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(name, dur, vol = 0.4, gap = 60) {
  if (!on) return; const c = ac(); if (!c) return;
  const t = c.currentTime; if (last[name] && t - last[name] < gap / 1000) return; last[name] = t;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900; s.buffer = b; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export const SFX = {
  shoot: () => tone('shoot', 900, 300, 0.05, 'square', 0.05, 70),
  hit: () => tone('hit', 300, 120, 0.06, 'triangle', 0.12, 35),
  kill: () => tone('kill', 220, 60, 0.12, 'sawtooth', 0.12, 45),
  gateGood: () => { tone('g1', 520, 1040, 0.15, 'triangle', 0.3, 0); setTimeout(() => tone('g2', 780, 1560, 0.15, 'triangle', 0.25, 0), 70); },
  gateBad: () => tone('gb', 300, 90, 0.3, 'sawtooth', 0.25, 0),
  boom: () => noise('boom', 0.45, 0.6, 80),
  bite: () => tone('bite', 160, 50, 0.15, 'sawtooth', 0.3, 60),
  power: () => { tone('p1', 400, 800, 0.1, 'square', 0.2, 0); setTimeout(() => tone('p2', 600, 1200, 0.12, 'square', 0.2, 0), 90); },
  coin: () => tone('coin', 1200, 1800, 0.08, 'square', 0.12, 50),
  win: () => [0, 120, 240, 400].forEach((d, i) => setTimeout(() => tone('w' + i, [523, 659, 784, 1046][i], [523, 659, 784, 1046][i] * 1.01, 0.22, 'triangle', 0.3, 0), d)),
  lose: () => [0, 180, 360].forEach((d, i) => setTimeout(() => tone('l' + i, [330, 262, 196][i], [320, 250, 150][i], 0.3, 'sawtooth', 0.2, 0), d)),
};
