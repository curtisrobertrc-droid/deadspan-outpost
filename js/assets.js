// Deadspan: Outpost art loader: fetches the WebP sprites, pre-scales them into offscreen canvases (mip levels)
// and builds white silhouettes for hit flashes. If anything fails the game falls back to procedural shapes.
export const VERSION = 'v2';
const LIST = ['bg', 'zombie1', 'zombie2', 'runner', 'brute', 'spitter', 'boss', 'coin', 'crate', 'sandbags', 'flash', 'turret', 't_gun', 't_mg', 't_rocket', 't_tesla'];
// max on-screen height (CSS px) we ever draw each sprite at; pre-scaled to that x dpr
const MAXH = { zombie1: 64, zombie2: 64, runner: 62, brute: 100, spitter: 66, boss: 200, coin: 26, crate: 40, sandbags: 50, flash: 36, turret: 66, t_gun: 66, t_mg: 66, t_rocket: 66, t_tesla: 66 };
export const IMG = {};   // name -> { w, h, aspect, mips:[canvas...], white:[canvas...] | null }
export let BG = null;    // raw background image
let ready = false;
export const assetsReady = () => ready;

function scaled(img, h) {
  const c = document.createElement('canvas'); const w = Math.max(1, Math.round(h * img.width / img.height));
  c.width = w; c.height = Math.max(1, Math.round(h));
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); return c;
}
function whiten(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return c;
}
function prep(name, img, dpr) {
  const top = Math.min(img.height, Math.ceil(MAXH[name] * dpr * 1.15));
  const mips = [scaled(img, top)]; while (mips[mips.length - 1].height > 24) mips.push(scaled(mips[mips.length - 1], mips[mips.length - 1].height / 2));
  const flashable = /zombie|runner|brute|spitter|boss|crate/.test(name);
  IMG[name] = { aspect: img.width / img.height, mips, white: flashable ? mips.map(whiten) : null };
}
// pick the smallest mip that's still >= the on-screen pixel height
export function pick(entry, pxH, white) {
  const arr = white ? entry.white : entry.mips; let m = arr[0];
  for (let i = 1; i < arr.length; i++) { if (arr[i].height >= pxH) m = arr[i]; else break; }
  return m;
}
export function loadAssets(onProgress, dpr = Math.min(window.devicePixelRatio || 1, 2)) {
  let done = 0;
  const base = new URL('../assets/img/', import.meta.url);
  const one = name => new Promise(res => {
    const im = new Image(); im.decoding = 'async';
    const fin = ok => { done++; onProgress && onProgress(done / LIST.length); if (ok) { try { if (name === 'bg') BG = im; else prep(name, im, dpr); } catch (e) { console.warn('asset prep failed', name, e); } } else console.warn('asset failed', name); res(); };
    im.onload = () => fin(true); im.onerror = () => fin(false);
    im.src = new URL(name + '.webp?' + VERSION, base).href;
  });
  const all = Promise.all(LIST.map(one));
  const timeout = new Promise(r => setTimeout(r, 12000)); // never block the game on slow networks
  return Promise.race([all, timeout]).then(() => { ready = true; });
}
// Cosmetic recolour: builds (once) a tinted copy of a sprite and returns its key. mode 'color' keeps shading, 'multiply' darkens.
export function tinted(name, key, color, mode = 'color', amt = 0.9) {
  const k = name + '@' + key; if (IMG[k]) return k; const e = IMG[name]; if (!e) return name;
  const rc = src => {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d');
    x.drawImage(src, 0, 0); x.globalCompositeOperation = mode; x.globalAlpha = amt; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0); return c;
  };
  try { IMG[k] = { aspect: e.aspect, mips: e.mips.map(rc), white: e.white }; return k; } catch (err) { return name; }
}
// small data-URL thumbnail of a (possibly tinted) sprite for shop cards
const thumbs = {};
export function thumb(key, h = 48) {
  if (thumbs[key]) return thumbs[key]; const e = IMG[key]; if (!e) return null;
  let m = e.mips[0]; for (const c of e.mips) if (c.height >= h) m = c;
  try { const c = document.createElement('canvas'); c.height = h; c.width = Math.round(h * e.aspect); c.getContext('2d').drawImage(m, 0, 0, c.width, c.height); return (thumbs[key] = c.toDataURL()); } catch (err) { return null; }
}
