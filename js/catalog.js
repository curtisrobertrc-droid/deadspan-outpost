// Deadspan: Outpost cosmetics catalogue. Visual only: nothing here changes damage, fire rate, scrap or rewards.
import { tinted, thumb } from './assets.js?v7';
export const CATS = {
  turret: { n: 'Turret finish', icon: '🔫' }, wall: { n: 'Wall style', icon: '🧱' }, tracer: { n: 'Bullet tracer', icon: '✨' },
  kill: { n: 'Kill effect', icon: '🧟' }, banner: { n: 'Dawn banner', icon: '🌅' }, frame: { n: 'Profile frame', icon: '🖼' }, title: { n: 'Title', icon: '🏷' },
};
const TUR = ['t_gun', 'turret', 't_mg', 't_rocket', 't_tesla'];
const tu = (id, name, r, c, mode, x = {}) => Object.assign({ id, cat: 'turret', name, r, c, mode, preview: () => thumb(c ? tinted('t_mg', id, c, mode) : 't_mg', 48) }, x);
const wl = (id, name, r, c, mode, x = {}) => Object.assign({ id, cat: 'wall', name, r, c, mode, preview: () => thumb(c ? tinted('sandbags', id, c, mode) : 'sandbags', 30) }, x);
const tr = (id, name, r, c, x = {}) => Object.assign({ id, cat: 'tracer', name, r, c: c === 'rainbow' ? ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2'] : c, v: c }, x);
const kl = (id, name, r, c, x = {}) => Object.assign({ id, cat: 'kill', name, r, c, v: c }, x);
const bn = (id, name, r, t, c, x = {}) => Object.assign({ id, cat: 'banner', name, r, v: { t, c }, c }, x);
const fr = (id, name, r, c, x = {}) => Object.assign({ id, cat: 'frame', name, r, c }, x);
const ti = (id, name, r, x = {}) => Object.assign({ id, cat: 'title', name, r, icon: '🏷' }, x);
export const CATALOG = [
  tu('tu_std', 'Factory', 'free', null), tu('tu_olive', 'Olive', 'common', '#7a8f3a'), tu('tu_sand', 'Sand', 'common', '#c9a86a'), tu('tu_steel', 'Gunmetal', 'common', '#6c7a89'),
  tu('tu_red', 'Hot Rod', 'rare', '#e03131'), tu('tu_ice', 'Glacier', 'rare', '#a5d8ff'), tu('tu_camo', 'Jungle', 'rare', '#2f9e44'),
  tu('tu_neon', 'Neon', 'epic', '#39ff14'), tu('tu_violet', 'Void', 'epic', '#9c36b5'), tu('tu_black', 'Stealth', 'epic', '#2b3150', 'multiply'),
  tu('tu_gold', 'Gold Plated', 'legendary', '#ffc61a'), tu('tu_chrome', 'Chrome', 'legendary', '#e9f2f7'),
  tu('tu_hazard', 'Hazard', 'common', '#f2d024', { pass: 'free' }), tu('tu_infra', 'Infrared', 'epic', '#ff006e', { pass: 'prem' }),
  wl('wl_std', 'Sandbags', 'free', null), wl('wl_grey', 'Concrete', 'common', '#adb5bd'), wl('wl_green', 'Army', 'rare', '#5c940d'), wl('wl_snow', 'Snowbank', 'rare', '#e7f5ff'),
  wl('wl_lava', 'Lava', 'epic', '#ff6b00'), wl('wl_gold', 'Gold Bars', 'legendary', '#ffd43b'), wl('wl_purple', 'Crystal', 'epic', '#b197fc', 'color', { pass: 'prem' }),
  tr('tr_std', 'Standard', 'free', null), tr('tr_orange', 'Ember', 'common', '#ffa94d'), tr('tr_white', 'White Hot', 'common', '#ffffff'), tr('tr_cyan', 'Cyan', 'rare', '#3bc9db'),
  tr('tr_pink', 'Bubblegum', 'rare', '#f783ac'), tr('tr_plasma', 'Plasma', 'epic', '#b197fc'), tr('tr_rainbow', 'Rainbow', 'legendary', 'rainbow'),
  tr('tr_lime', 'Lime', 'rare', '#a9e34b', { pass: 'free' }), tr('tr_blood', 'Blood Moon', 'epic', '#ff4d4d', { pass: 'prem' }),
  kl('kl_std', 'Splat', 'free', null), kl('kl_dust', 'Dust', 'common', ['#c8b89a', '#8d7b68']), kl('kl_ice', 'Shatter', 'rare', ['#a5d8ff', '#e7f5ff', '#74c0fc']),
  kl('kl_confetti', 'Confetti', 'rare', ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c']), kl('kl_coins', 'Jackpot', 'epic', ['#ffd43b', '#f59f00', '#fff3bf']),
  kl('kl_fire', 'Fireworks', 'legendary', ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ffffff']),
  kl('kl_pixel', 'Pixels', 'rare', ['#00f5d4', '#9b5de5', '#f15bb5'], { pass: 'free' }), kl('kl_shadow', 'Shadow', 'epic', ['#212529', '#495057', '#7048e8'], { pass: 'prem' }),
  bn('bn_std', 'Dawn!', 'free', 'DAWN!', '#facc15'), bn('bn_held', 'Wall Held', 'common', 'WALL HELD!', '#ffe066'), bn('bn_flaw', 'Untouched', 'rare', 'UNTOUCHED!', '#66d9e8'),
  bn('bn_fort', 'Fortress', 'epic', 'FORTRESS!', '#da77f2'), bn('bn_leg', 'Legendary', 'legendary', 'LEGENDARY!', '#ffb703'), bn('bn_gg', 'GG', 'common', 'GG EZ!', '#a9e34b', { pass: 'free' }),
  bn('bn_boom', 'Boom', 'epic', 'BOOM!', '#ff6b6b', { pass: 'prem' }),
  fr('fr_none', 'Plain', 'free', '#3a4a6b'), fr('fr_bronze', 'Bronze', 'common', '#cd7f32'), fr('fr_steel', 'Steel', 'rare', '#adb5bd'), fr('fr_toxic', 'Toxic', 'epic', '#8ce99a'), fr('fr_flame', 'Inferno', 'legendary', ['#ff6b6b', '#ffd43b']),
  fr('fr_season', 'Season', 'rare', '#4dabf7', { pass: 'free' }),
  fr('badge_gold', 'Weekly #1', 'legendary', ['#ffd700', '#fff3bf'], { badge: true }), fr('badge_silver', 'Weekly Top 3', 'epic', ['#e9ecef', '#adb5bd'], { badge: true }),
  fr('badge_bronze', 'Weekly Top 10', 'rare', ['#e8a87c', '#cd7f32'], { badge: true }), fr('badge_top100', 'Weekly Top 100', 'common', '#74c0fc', { badge: true }),
  ti('ti_rookie', 'Rookie', 'free'), ti('ti_surv', 'Survivor', 'common'), ti('ti_eng', 'Engineer', 'rare'), ti('ti_merge', 'Merge Master', 'epic'), ti('ti_last', 'Last Light', 'legendary'),
  ti('ti_vet', 'Season Veteran', 'rare', { pass: 'free' }), ti('ti_elite', 'Season Elite', 'epic', { pass: 'prem' }), ti('ti_champ', 'Weekly Champion', 'legendary', { badge: true }),
];
export function applyTo(game, eq, byId) {
  const g = id => byId[id] || {};
  const t = g(eq.turret); game.tkey = t.c ? n => (TUR.includes(n) ? tinted(n, t.id, t.c, t.mode) : n) : null;
  const w = g(eq.wall); game.wallKey = w.c ? tinted('sandbags', w.id, w.c, w.mode || 'color', 0.75) : null;
  game.cos = { tracer: g(eq.tracer).v || null, kill: g(eq.kill).v || null, banner: g(eq.banner).v || null };
}
