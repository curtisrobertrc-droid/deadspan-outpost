// Deadspan Arcade meta layer (shared by both games): cosmetics, rotating daily shop, season pass and leaderboards.
// Cosmetics never change gameplay. No random or paid loot boxes: every price and reward is shown before you choose.
export const RAR = {
  common: { n: 'Common', c: '#9fb3c8', p: 400 },
  rare: { n: 'Rare', c: '#4dabf7', p: 1200 },
  epic: { n: 'Epic', c: '#c77dff', p: 3500 },
  legendary: { n: 'Legendary', c: '#ffb703', p: 9000 },
};
const TIERS = 30, XP_TIER = 150, DAILY_N = 4, DAILY_OFF = 0.25;
const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
export const seasonKey = (d = new Date()) => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1);
export function weekKey(d = new Date()) { // ISO week, UTC
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-W' + pad(Math.ceil(((t - y0) / 864e5 + 1) / 7));
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// opts: { S, persist, game:'deadspan'|'outpost', catalog:[items], cats:{id:{n,icon}}, toast, fmt, sfx, apply(eq), cfg, net:{enabled(),post(path,body)}, metricLabel(score) }
export function createMeta(o) {
  const { persist, catalog, cats, toast, fmt } = o;
  const byId = Object.fromEntries(catalog.map(i => [i.id, i]));
  let S, C, PB;
  function sync() { // the save object can be replaced (cloud restore), so re-read it on every call
    S = o.getS();
    C = S.cos = Object.assign({ own: [], eq: {}, pass: null }, S.cos || {});
    for (const i of catalog) if (i.r === 'free' && !C.own.includes(i.id)) C.own.push(i.id); // defaults
    for (const k of Object.keys(cats)) if (!C.eq[k] || !C.own.includes(C.eq[k])) { const d = catalog.find(i => i.cat === k && i.r === 'free'); if (d) C.eq[k] = d.id; }
    PB = S.pb = Object.assign({ all: 0, allLv: 0, day: { k: '', v: 0 }, week: { k: '', v: 0 }, runs: 0 }, S.pb || {});
  }
  sync();
  const owned = id => C.own.includes(id);
  const sellable = i => i.r !== 'free' && !i.pass && !i.badge;

  // ---- prices: rarity base, rising 12% for every item you already own in that category ----
  function price(i, daily) {
    const n = C.own.filter(id => byId[id] && byId[id].cat === i.cat && byId[id].r !== 'free').length;
    const p = RAR[i.r].p * (1 + 0.12 * n) * (daily ? 1 - DAILY_OFF : 1); return Math.round(p / 50) * 50;
  }
  // ---- rotating daily shop: same 4 items for everyone on a given UTC day; legendaries only ever appear here ----
  function dailyItems() {
    const R = rng(hash(o.game + dayKey())); const pool = catalog.filter(sellable); const out = [];
    const want = ['legendary', 'epic', 'rare', 'rare'];
    for (const r of want) { const cand = pool.filter(i => i.r === r && !out.includes(i)); if (cand.length) out.push(cand[Math.floor(R() * cand.length)]); }
    while (out.length < DAILY_N) { const i = pool[Math.floor(R() * pool.length)]; if (!out.includes(i)) out.push(i); }
    return out;
  }
  function buy(i, daily) {
    if (owned(i.id)) return equip(i);
    const p = price(i, daily); if (S.coins < p) { toast(`You need ${fmt(p - S.coins)} more coins`); return false; }
    S.coins -= p; C.own.push(i.id); C.eq[i.cat] = i.id; persist(); o.apply(C.eq); o.sfx && o.sfx(); toast(`Unlocked ${i.name}!`); return true;
  }
  function equip(i) { if (!owned(i.id)) return false; C.eq[i.cat] = i.id; persist(); o.apply(C.eq); return true; }
  function grant(id, why) { sync(); const i = byId[id]; if (!i || owned(id)) return false; C.own.push(id); persist(); if (why) toast(`${why}: ${i.name}`); return true; }

  // ---- season pass: a free track for everyone, earned by playing; premium track is stubbed (Telegram Stars later) ----
  function pass() {
    const sk = seasonKey(); if (!C.pass || C.pass.s !== sk) C.pass = { s: sk, xp: 0, free: [], prem: [], premium: false }; return C.pass;
  }
  const passItems = catalog.filter(i => i.pass);
  function tierReward(t, track) {
    // cosmetic every 5 tiers (free track) / every 3 tiers (premium); coins otherwise. Fixed, shown in advance.
    const list = passItems.filter(i => i.pass === track);
    const every = track === 'free' ? 5 : 3, idx = t % every === 0 ? t / every - 1 : -1;
    if (idx >= 0 && list[idx % Math.max(1, list.length)]) return { item: list[idx % list.length].id };
    return { coins: track === 'free' ? 60 + t * 12 : 120 + t * 20 };
  }
  const tierOf = xp => Math.min(TIERS, Math.floor(xp / XP_TIER));
  function addXp(n) { sync(); const P = pass(); const before = tierOf(P.xp); P.xp += Math.max(0, Math.round(n)); persist(); const after = tierOf(P.xp); if (after > before) toast(`Season pass tier ${after} reached! 🎖`); return after > before; }
  function claimTier(t, track) {
    const P = pass(); if (tierOf(P.xp) < t || P[track].includes(t)) return; if (track === 'prem' && !P.premium) return toast(o.net && o.net.enabled() ? 'Unlock the premium pass in the Shop' : 'Premium pass: coming soon');
    const r = tierReward(t, track); P[track].push(t);
    if (r.item) grant(r.item); if (r.coins) S.coins += r.coins; persist(); o.sfx && o.sfx(); toast(r.item ? `Claimed ${byId[r.item].name}!` : `+${fmt(r.coins)} coins`);
  }
  const claimable = () => { sync(); const P = pass(); const t = tierOf(P.xp); for (let k = 1; k <= t; k++) if (!P.free.includes(k) || (P.premium && !P.prem.includes(k))) return true; return false; };

  // ---- personal bests (always available) + online boards (when the backend is configured) ----
  function recordRun(score, level, extra = {}) {
    sync();
    const dk = dayKey(), wk = weekKey(); PB.runs++;
    if (PB.day.k !== dk) PB.day = { k: dk, v: 0 }; if (PB.week.k !== wk) PB.week = { k: wk, v: 0 };
    PB.day.v = Math.max(PB.day.v, score); PB.week.v = Math.max(PB.week.v, score); PB.all = Math.max(PB.all, score); PB.allLv = Math.max(PB.allLv, level); persist();
    if (o.net && o.net.enabled()) o.net.post('/score', Object.assign({ game: o.game, level, score, cos: { frame: C.eq.frame, title: C.eq.title } }, extra)).catch(() => {});
  }
  async function checkRewards() {
    sync();
    if (!o.net || !o.net.enabled()) return;
    try {
      const r = await o.net.post('/rewards', { game: o.game }); if (!r || !r.rewards) return;
      for (const w of r.rewards) { S.coins += w.coins || 0; for (const b of w.badges || []) grant(b); toast(`🏆 Week ${w.week}: #${w.rank}! +${fmt(w.coins)} coins${(w.badges || []).length ? ' & a badge' : ''}`); }
      persist(); o.refresh && o.refresh();
    } catch (e) {}
  }

  // ---------------- UI ----------------
  const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
  const modal = el(`<div id="style" class="modal"><div class="sheet meta">
    <h2><span id="mTitle">Style shop</span> <span class="pill">🪙 <b id="mCoins">0</b></span></h2>
    <div class="tabs" id="mTabs"></div><div id="mBody"></div>
    <button class="ghost" data-mclose>Close</button></div></div>`);
  document.body.appendChild(modal);
  modal.querySelector('[data-mclose]').onclick = () => modal.classList.remove('on');
  let tab = 'daily';
  function swatch(i) {
    if (i.preview) { const u = i.preview(); if (u) return `<img class="sw" src="${u}" alt="">`; }
    if (i.c) return `<span class="sw" style="background:${Array.isArray(i.c) ? `linear-gradient(135deg,${i.c.join(',')})` : i.c}"></span>`;
    return `<span class="sw em">${i.icon || cats[i.cat].icon}</span>`;
  }
  function card(i, mode) {
    const own = owned(i.id), eq = C.eq[i.cat] === i.id, rar = RAR[i.r] || { n: i.r === 'free' ? 'Default' : '', c: '#9fb3c8' };
    const p = mode === 'daily' ? price(i, true) : sellable(i) && i.r !== 'legendary' ? price(i, false) : null;
    const btn = eq ? '<button class="buy eq" disabled>EQUIPPED</button>' : own ? '<button class="buy" data-act="eq">EQUIP</button>'
      : p !== null ? `<button class="buy" data-act="buy" ${S.coins < p ? 'data-poor="1"' : ''}>🪙 ${fmt(p)}</button>`
      : `<button class="buy" disabled>${i.pass ? '🎖 Pass' : i.badge ? '🏆 Top ranks' : i.r === 'legendary' ? '🛒 Daily shop' : '—'}</button>`;
    const d = el(`<div class="cos r-${i.r}" style="--rc:${rar.c}">${swatch(i)}<div class="t"><b>${i.name}</b><small>${cats[i.cat].n} · <span style="color:${rar.c}">${rar.n}</span>${mode === 'daily' ? ' · <s>' + fmt(price(i, false)) + '</s> −25%' : ''}</small></div>${btn}</div>`);
    const b = d.querySelector('[data-act]'); if (b) b.onclick = () => { b.dataset.act === 'buy' ? buy(i, mode === 'daily') : equip(i); render(); o.refresh && o.refresh(); };
    return d;
  }
  function render() {
    sync();
    modal.querySelector('#mCoins').textContent = fmt(S.coins);
    const tabs = modal.querySelector('#mTabs'); tabs.innerHTML = '';
    for (const [k, n] of [['daily', '🛒 Daily'], ['coll', '🎨 Collection'], ['pass', '🎖 Pass'], ['ranks', '🏆 Ranks']]) {
      const b = el(`<button class="tab ${tab === k ? 'on' : ''}">${n}${k === 'pass' && claimable() ? '<i class="dot"></i>' : ''}</button>`); b.onclick = () => { tab = k; render(); }; tabs.appendChild(b);
    }
    const body = modal.querySelector('#mBody'); body.innerHTML = '';
    modal.querySelector('#mTitle').textContent = { daily: 'Style shop', coll: 'Collection', pass: 'Season pass', ranks: 'Leaderboards' }[tab];
    if (tab === 'daily') {
      const ms = Date.parse(dayKey() + 'T00:00:00Z') + 864e5 - Date.now(), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
      body.appendChild(el(`<p class="note">New items every day · refreshes in ${h}h ${m}m · cosmetic only, no gameplay boost</p>`));
      for (const i of dailyItems()) body.appendChild(card(i, 'daily'));
    } else if (tab === 'coll') {
      const total = catalog.filter(i => i.r !== 'free').length, got = C.own.filter(id => byId[id] && byId[id].r !== 'free').length;
      body.appendChild(el(`<div class="collbar"><span>Collection ${got}/${total}</span><div><i style="width:${(got / total * 100).toFixed(1)}%"></i></div></div>`));
      for (const [k, c] of Object.entries(cats)) {
        const items = catalog.filter(i => i.cat === k); const g = items.filter(i => owned(i.id)).length;
        body.appendChild(el(`<h3>${c.icon} ${c.n} <small>${g}/${items.length}</small></h3>`));
        for (const i of items) body.appendChild(card(i, 'coll'));
      }
    } else if (tab === 'pass') {
      const P = pass(), t = tierOf(P.xp), into = P.xp - t * XP_TIER, end = new Date(Date.UTC(+P.s.slice(0, 4), +P.s.slice(5), 1)), days = Math.max(0, Math.ceil((end - Date.now()) / 864e5));
      body.appendChild(el(`<div class="collbar"><span>Tier ${t}/${TIERS} · ${t >= TIERS ? 'MAX' : into + '/' + XP_TIER + ' XP'} · season ends in ${days}d</span><div><i style="width:${t >= TIERS ? 100 : (into / XP_TIER * 100).toFixed(1)}%"></i></div></div>`));
      body.appendChild(el(`<p class="note">Earn XP by playing. Free rewards for everyone. ${o.portal ? 'A new season with new rewards starts every month.' : P.premium ? 'Premium track unlocked, thanks for the support!' : o.net && o.net.enabled() ? 'The premium track (Telegram Stars, in Shop) is cosmetic-only.' : 'The premium track (Telegram Stars) is coming soon and is cosmetic-only.'}</p>`));
      const grid = el(`<div class="pass ${o.portal ? 'one' : ''}"></div>`); body.appendChild(grid);
      for (let k = 1; k <= TIERS; k++) {
        const row = el(`<div class="tier ${k <= t ? 'got' : ''}"><b>${k}</b></div>`);
        for (const tr of o.portal ? ['free'] : ['free', 'prem']) {
          const r = tierReward(k, tr), done = P[tr].includes(k), can = k <= t && !done && (tr === 'free' || P.premium);
          const lab = r.item ? `${swatch(byId[r.item])}<span>${byId[r.item].name}</span>` : `<span>🪙 ${fmt(r.coins)}</span>`;
          const c = el(`<button class="rw ${tr} ${done ? 'done' : ''} ${can ? 'can' : ''}" ${can ? '' : 'disabled'}>${tr === 'prem' && !P.premium ? '🔒 ' : ''}${lab}${done ? '<i>✓</i>' : ''}</button>`);
          c.onclick = () => { claimTier(k, tr); render(); o.refresh && o.refresh(); }; row.appendChild(c);
        }
        grid.appendChild(row);
      }
    } else renderRanks(body);
  }
  let board = 'day';
  async function renderRanks(body) {
    const tabs = el('<div class="tabs sm"></div>'); body.appendChild(tabs);
    if (o.portal && board === 'friends') board = 'day';
    for (const [k, n] of [['day', 'Today'], ['week', 'This week'], ['all', 'All-time'], ['friends', 'Friends']].filter(x => !o.portal || x[0] !== 'friends')) { const b = el(`<button class="tab ${board === k ? 'on' : ''}">${n}</button>`); b.onclick = () => { board = k; render(); }; tabs.appendChild(b); }
    const mine = board === 'day' ? (PB.day.k === dayKey() ? PB.day.v : 0) : board === 'week' ? (PB.week.k === weekKey() ? PB.week.v : 0) : PB.all;
    body.appendChild(el(`<div class="pbrow"><span>Your best ${board === 'day' ? 'today' : board === 'week' ? 'this week' : board === 'friends' ? 'ever' : 'ever'}</span><b>${mine ? o.metricLabel(mine) : '—'}</b></div>`));
    const list = el('<div class="lb"></div>'); body.appendChild(list);
    if (o.portal) { list.appendChild(el(`<div class="pbrow"><span>Runs played</span><b>${fmt(PB.runs || 0)}</b></div>`)); list.appendChild(el('<p class="note">Beat your own records: today, this week and all-time.</p>')); return; }
    if (!o.net || !o.net.enabled()) {
      list.appendChild(el(`<p class="note">🏆 Global and friends leaderboards are coming soon. Your personal bests are saved now. Top players each week will win coins and exclusive badges.</p>`));
      return;
    }
    list.innerHTML = '<p class="note">Loading…</p>';
    try {
      const r = await o.net.post('/lb', { game: o.game, board }); list.innerHTML = '';
      if (!r || !r.top || !r.top.length) { list.appendChild(el('<p class="note">No scores yet. Be the first!</p>')); return; }
      r.top.forEach((e, n) => {
        const fr = byId[e.frame], ti = byId[e.title];
        list.appendChild(el(`<div class="lbr ${e.me ? 'me' : ''}"><span class="rk">${n + 1}</span><span class="nm" style="${fr && fr.c ? 'border-color:' + (Array.isArray(fr.c) ? fr.c[0] : fr.c) : ''}">${esc(e.name)}${ti && ti.r !== 'free' ? `<small>${esc(ti.name)}</small>` : ''}</span><b>${o.metricLabel(e.score)}</b></div>`));
      });
      if (r.me && r.me.rank > r.top.length) list.appendChild(el(`<div class="lbr me"><span class="rk">${r.me.rank}</span><span class="nm">You</span><b>${o.metricLabel(r.me.score)}</b></div>`));
      if (board === 'week') list.appendChild(el(`<p class="note">Weekly rewards (paid out Monday): #1 15,000 🪙 + Gold frame &amp; Champion title · #2–3 5,000 🪙 + Silver frame · #4–10 1,500 🪙 + Bronze frame · top 100 500 🪙 + Top 100 frame. In-game rewards only.</p>`));
      if (board === 'friends' && r.top.length < 2) list.appendChild(el('<p class="note">Invite friends with your link to compete with them here.</p>'));
    } catch (e) { list.innerHTML = '<p class="note">Leaderboard unavailable right now.</p>'; }
  }
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function open(t) { tab = t || tab; render(); modal.classList.add('on'); }

  pass(); persist();
  const reapply = () => { sync(); o.apply(C.eq); };
  reapply();
  return { reapply, premium: v => { sync(); pass().premium = !!v; persist(); }, open, render, addXp, recordRun, checkRewards, grant, claimable, equipped: () => C.eq, item: id => byId[id], dailyItems, price, pass, tierOf };
}
