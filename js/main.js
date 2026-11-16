import { CFG, AUTOPLAY, DEVOK } from './config.js';
import { IS_PORTAL, TARGET, gameplay, loadingDone, PortalAds, onAdMute, portalScore, happytime } from './portal.js?v3';
import { tg, initPlatform, inTelegram, loadLocal, loadCloud, save, haptic, startParam, shareInvite, copyInvite, inviteLink, userId } from './platform.js';
import { Ads } from './ads.js';
import { Payments } from './payments.js';
import { setSound, setAdMute, unlockAudio, SFX } from './audio.js?v2';
onAdMute(setAdMute);
import { Game, fmt, nightInfo, PERKS, TIERS } from './game.js?v9';
import { loadAssets } from './assets.js?v7';
import { createMeta } from './meta.js?v12';
import { CATALOG, CATS, applyTo } from './catalog.js?v7';

initPlatform();
const $ = s => document.querySelector(s);
const DEF = { v: 1, night: 1, coins: 0, best: 0, bestTier: 1, up: { dmg: 0, scrap: 0, armor: 0, luck: 0 }, daily: { last: '', streak: 0 }, runs: 0, sound: true, refClaimed: false, created: Date.now() };
const norm = o => { const s = Object.assign({}, DEF, o || {}); s.up = Object.assign({}, DEF.up, s.up); s.daily = Object.assign({}, DEF.daily, s.daily); return s; };
let S = norm(loadLocal());
const persist = () => save(S);
loadCloud().then(c => { if (c && (c.night > S.night || (c.night === S.night && c.coins > S.coins))) { const ref = S.referrer, pend = S.refPending, paid = S.refInviteePaid; S = norm(c); if (ref && !S.referrer) { S.referrer = ref; S.refPending = S.refPending || pend; S.refInviteePaid = S.refInviteePaid || paid; } persist(); refresh(); if (typeof meta !== "undefined") meta.reapply(); } });
setSound(S.sound);

// Store the referrer locally. Coin rewards (both players, once the invitee finishes night 1) are paid by the Worker when leaderboards are on; until then they are queued quietly.
{
  const p = startParam(); const me = userId();
  if (p && /^ref_\d{1,15}$/.test(p)) {
    const id = p.slice(4);
    if (id && id !== String(me || '') && !S.referrer) { S.referrer = id; persist(); }
  }
}

const UPS = [
  { id: 'dmg', name: 'Turret damage', icon: '💥', desc: '+15% damage for every turret', base: 45, g: 1.5, max: 40 },
  { id: 'scrap', name: 'Starting scrap', icon: '🔩', desc: '+15 scrap at dusk', base: 40, g: 1.45, max: 30 },
  { id: 'armor', name: 'Wall armour', icon: '🧱', desc: '+8 wall HP', base: 50, g: 1.5, max: 30 },
  { id: 'luck', name: 'Lucky deploys', icon: '🍀', desc: '+4% chance a deploy is Lv 2', base: 80, g: 1.7, max: 10 },
];
const cost = u => Math.round(u.base * Math.pow(u.g, S.up[u.id]));

const game = new Game($('#cv'), {
  onTick: g => {
    $('#hudLevel').textContent = `NIGHT ${g.N} · WAVE ${Math.max(1, g.wave)}/${g.info.waves}`;
    $('#hudCoins').textContent = fmt(S.coins + g.coins);
    $('#hudScrap').textContent = fmt(g.scrap);
    $('#hudBar').style.width = (Math.max(0, g.wave - 1 + (g.spawnQ.length ? 0 : 1)) / g.info.waves * 100).toFixed(1) + '%';
    const c = g.deployCost(), full = !g.empty().length; const b = $('#btnDeploy');
    b.classList.toggle('no', g.scrap < c || full);
    $('#deployCost').textContent = full ? 'GRID FULL: DRAG TO MERGE' : `🔩 ${c} scrap`;
  },
  onWave: (w, n, boss) => banner(boss ? '☠ BOSS WAVE' : w === n ? 'FINAL WAVE' : `WAVE ${w}`, boss ? 'Merge up. Hold the wall!' : w === 1 ? 'Deploy turrets · drag same numbers together' : ''),
  onPerk: opts => { gameplay(false); showPerks(opts); },
  onMerge: lv => { if (lv > S.bestTier) { S.bestTier = lv; persist(); if (lv >= 3) setTimeout(() => toast(`New turret unlocked: ${TIERS[lv].name}!`), 200); } },
  onEnd: r => showResult(r),
});
if (DEVOK) window.__game = game;

// cosmetics, daily shop, season pass, leaderboards (cosmetic only; see js/meta.js)
const net = {
  enabled: () => !!(CFG.LEADERBOARDS && CFG.BACKEND_URL && inTelegram),
  configured: () => !!(CFG.LEADERBOARDS && CFG.BACKEND_URL),
  post: (path, body) => fetch(CFG.BACKEND_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ initData: tg.initData }, body)) }).then(r => r.json()),
};
const CAT_BY_ID = Object.fromEntries(CATALOG.map(i => [i.id, i]));
const meta = createMeta({ portal: IS_PORTAL, getS: () => S, persist, game: 'outpost', catalog: CATALOG, cats: CATS, toast: m => toast(m), fmt, sfx: () => SFX.coin(),
  apply: eq => applyTo(game, eq, CAT_BY_ID), net, refresh: () => refresh(), metricLabel: v => `Night ${Math.floor(v / 10000)} · ${fmt(v % 10000)} pts` });
if (DEVOK) window.__meta = meta;

function banner(t, sub) { const b = $('#waveBanner'); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), 1500); }
let revived = false;
let lastWin = false, lastReviveOffer = -1e9;
async function play() {
  unlockAudio(); haptic('medium'); revived = false;
  if (IS_PORTAL) await PortalAds.beforePlay({ afterWin: lastWin });
  show('hud'); game.start(S.night, S.up); game.runT0 = game.t; gameplay(true);
}
function show(id) { for (const el of document.querySelectorAll('.screen')) el.classList.toggle('on', el.id === id); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }

function showPerks(opts) {
  const box = $('#perkList'); box.innerHTML = '';
  for (const id of opts) {
    const p = PERKS[id]; const b = document.createElement('button'); b.className = 'perk';
    b.innerHTML = `<span class="ic">${p.i}</span><span><b>${p.t}</b><br><small>${p.d}</small></span>`;
    b.onclick = () => { $('#perk').classList.remove('on'); game.resumeFromPerk(id); gameplay(true); };
    box.appendChild(b);
  }
  $('#perk').classList.add('on');
  if (AUTOPLAY) setTimeout(() => { const pri = ['dmg', 'rate', 'free', 'crit', 'repair', 'luck', 'scrap', 'slow']; const best = opts.slice().sort((a, b) => pri.indexOf(a) - pri.indexOf(b))[0]; box.children[opts.indexOf(best)].click(); }, 900);
}

function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function yesterday() { const d = new Date(Date.now() - 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
const dailyReady = () => S.daily.last !== today();
const dailyAmount = () => { const st = S.daily.last === yesterday() ? S.daily.streak + 1 : 1; return { st, amt: 100 + (Math.min(st, 7) - 1) * 50 + (st % 7 === 0 ? 300 : 0) + S.night * 5 }; };

function refresh() {
  $('#menuLevel').textContent = S.night;
  $('#menuCoins').textContent = fmt(S.coins);
  const info = nightInfo(S.night); const left = 3 - (S.night % 3);
  $('#menuBoss').textContent = info.boss ? '☠ BOSS NIGHT' : `Boss in ${left} night${left === 1 ? '' : 's'} · best turret: ${TIERS[S.bestTier].name}`;
  $('#dailyDot').style.display = dailyReady() ? 'block' : 'none';
  if (typeof meta !== 'undefined') $('#passDot').style.display = meta.claimable() ? 'block' : 'none';
  $('#btnSound').textContent = S.sound ? '🔊' : '🔇';
  $('#shopCoins').textContent = fmt(S.coins);
  const list = $('#upList'); list.innerHTML = '';
  for (const u of UPS) {
    const lv = S.up[u.id], c = cost(u), maxed = lv >= u.max;
    const row = document.createElement('div'); row.className = 'up';
    row.innerHTML = `<div class="ic">${u.icon}</div><div class="t"><b>${u.name}</b> <span class="lv">Lv ${lv}</span><br><small>${u.desc}</small></div><button class="buy" ${maxed || S.coins < c ? 'disabled' : ''}>${maxed ? 'MAX' : '🪙 ' + fmt(c)}</button>`;
    row.querySelector('button').onclick = () => { if (S.coins < c || maxed) return; S.coins -= c; S.up[u.id]++; persist(); SFX.coin(); haptic('light'); refresh(); };
    list.appendChild(row);
  }
  const st = $('#starList'); st.innerHTML = '';
  for (const p of CFG.STAR_PRODUCTS) {
    const row = document.createElement('div'); row.className = 'up';
    row.innerHTML = `<div class="ic">⭐</div><div class="t"><b>${p.title}</b><br><small>${p.desc || ''} · cosmetic only, fixed contents</small></div><button class="buy star">${p.stars} ⭐</button>`;
    row.querySelector('button').onclick = async () => {
      if (!Payments.enabled()) return toast('Telegram Stars shop opens soon!');
      const r = await Payments.buy(p.sku);
      if (r.ok) { applyGrant(r.grant); toast('Thanks! Unlocked.'); } else if (r.reason !== 'cancelled') toast('Purchase not completed.');
    };
    st.appendChild(row);
  }
  const mg = $('#moreGames'); mg.innerHTML = '';
  if (!IS_PORTAL) for (const g of CFG.MORE_GAMES) { const a = document.createElement('a'); a.className = 'more'; a.href = g.url; a.innerHTML = `<img src="${g.icon}" alt=""><span><span class="k">MORE GAMES</span><br><b>${g.name}</b><small>${g.tag}</small></span>`; mg.appendChild(a); }
}

function showResult(r) {
  S.runs++; gameplay(false); lastWin = r.win;
  $('#resTitle').textContent = r.win ? (nightInfo(r.N).boss ? 'BOSS SLAIN!' : 'YOU SURVIVED!') : 'WALL BREACHED!';
  $('#resTitle').className = r.win ? 'win' : 'lose';
  if (r.win && nightInfo(r.N).boss) happytime();
  $('#resSub').textContent = r.win ? `Night ${r.N} · ${r.kills} zombies · best turret ${TIERS[r.tier].name}` : `Night ${r.N} · wave ${r.wave}/${r.waves} · ${r.kills} zombies`;
  $('#resCoins').textContent = '+' + fmt(r.coins);
  meta.addXp(r.kills * 0.5 + (r.win ? 40 + r.N * 2 : 10));
  { const cleared = r.win ? r.N : r.N - 1, pts = Math.min(9999, r.kills * 3 + (r.tier || 0) * 100);
    if (cleared > 0 && IS_PORTAL) portalScore(cleared * 10000 + pts);
  if (cleared > 0) meta.recordRun(cleared * 10000 + pts, cleared, { kills: r.kills, win: r.win, dur: Math.round(game.t - (game.runT0 || 0)), ref: refBy() }); }
  const earned = r.coins; let collected = false;
  const collect = mult => { if (collected) return; collected = true; S.coins += earned * mult; if (r.win) { S.night = r.N + 1; S.best = Math.max(S.best, r.N); } persist(); refresh(); };
  const adBtn = $('#btnDouble'), revBtn = $('#btnRevive');
  adBtn.style.display = Ads.available() && earned > 0 ? '' : 'none';
  // portals: don't offer a revive ad on every death (CrazyGames rule), at most one offer every 3 minutes
  const offerRevive = !r.win && !revived && Ads.available() && (!IS_PORTAL || performance.now() - lastReviveOffer > 180000);
  if (offerRevive && IS_PORTAL) lastReviveOffer = performance.now();
  revBtn.style.display = offerRevive ? '' : 'none';
  adBtn.onclick = async () => { adBtn.disabled = true; const ok = await Ads.showRewarded(); adBtn.disabled = false; if (ok) { collect(2); SFX.coin(); toast(`Doubled! +${fmt(earned * 2)} coins`); adBtn.style.display = 'none'; $('#resCoins').textContent = '+' + fmt(earned * 2); } else toast('No ad available right now'); };
  revBtn.onclick = async () => { revBtn.disabled = true; const ok = await Ads.showRewarded(); revBtn.disabled = false; if (ok) { revived = true; lastWin = false; show('hud'); game.revive(); gameplay(true); } else toast('No ad available right now'); };
  $('#btnNext').textContent = r.win ? `NIGHT ${r.N + 1} ▶` : 'TRY AGAIN ↻';
  $('#btnNext').onclick = () => { collect(1); play(); };
  $('#btnMenu').onclick = () => { collect(1); refresh(); show('menu'); };
  const shareBtn = $('#btnShareScore');
  if (shareBtn) {
    shareBtn.style.display = IS_PORTAL ? 'none' : '';
    const shareText = r.win
      ? `I survived night ${r.N} in Deadspan: Outpost! Think you can beat my score? 🧟🧱`
      : `I made it to wave ${r.wave}/${r.waves} on night ${r.N} in Deadspan: Outpost. Bet you can beat my score! 🧟🧱`;
    shareBtn.onclick = () => doShare(shareText);
  }
  const clearedNow = r.win ? r.N : r.N - 1;
  if (S.referrer && clearedNow >= 1) { S.refPending = true; persist(); }
  syncInvites(Math.max(0, clearedNow));
  show('result');
  if (AUTOPLAY && !window.__noAutoNext) setTimeout(() => $('#btnNext').click(), 2500);
}

function openDaily() {
  const { st, amt } = dailyAmount();
  const done = dailyReady() ? (st - 1) % 7 : ((S.daily.streak - 1) % 7) + 1;
  $('#dailyDays').innerHTML = Array.from({ length: 7 }, (_, i) => `<div class="day ${i < done ? 'got' : ''} ${dailyReady() && i === done ? 'now' : ''}">D${i + 1}</div>`).join('');
  $('#dailyAmt').textContent = dailyReady() ? `🪙 ${fmt(amt)}` : 'Come back tomorrow!';
  $('#btnClaim').style.display = dailyReady() ? '' : 'none';
  $('#btnClaim2').style.display = dailyReady() && Ads.available() ? '' : 'none';
  const claim = mult => { S.coins += amt * mult; S.daily = { last: today(), streak: st }; persist(); refresh(); SFX.coin(); haptic('success'); toast(`+${fmt(amt * mult)} coins · ${st}-day streak`); $('#daily').classList.remove('on'); };
  $('#btnClaim').onclick = () => claim(1);
  $('#btnClaim2').onclick = async () => { const ok = await Ads.showRewarded(); if (ok) claim(2); else toast('No ad available right now'); };
  $('#daily').classList.add('on');
}

function applyGrant(c) { if (!c) return; for (const id of c.items || []) meta.grant(id, 'Unlocked'); if (c.premium) meta.premium(true); persist(); refresh(); }
const refBy = () => S.referrer || undefined;
const clearedBest = () => Math.max(S.best || 0, Math.max(0, (S.night || 1) - 1));
async function tryPreparedShare(text) {
  if (!net.enabled()) return null;
  try {
    const r = await Promise.race([
      net.post('/shareprep', { game: 'outpost', text }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1200)),
    ]);
    return r && r.id ? r.id : null;
  } catch (e) { return null; }
}
async function syncInvites(cleared) {
  const cl = Math.max(clearedBest(), cleared || 0);
  if (S.referrer && cl >= 1 && !S.refInviteePaid) { S.refPending = true; persist(); }
  if (!net.enabled()) return null;
  try {
    const r = await net.post('/ref', { game: 'outpost', ref: S.referrer || undefined, cleared: cl });
    if (!r || r.error) return r;
    let got = 0;
    if (r.bonus && !S.refInviteePaid) { S.coins += r.bonus; S.refInviteePaid = true; S.refPending = false; got += r.bonus; toast(`Invite bonus: +${fmt(r.bonus)} coins!`); }
    if (r.claim) { S.coins += r.claim; got += r.claim; toast(`A friend finished night 1! +${fmt(r.claim)} coins`); }
    S.inviteStats = { invites: r.invites || 0, cleared: r.cleared || 0, earned: r.earned || 0 };
    persist(); if (got) { SFX.coin(); haptic('success'); } refresh(); renderInviteStats();
    return r;
  } catch (e) { return null; }
}
async function doShare(text) {
  const preparedId = await tryPreparedShare(text);
  const res = await shareInvite(CFG.BOT_USERNAME, text, { preparedId, title: CFG.GAME_NAME });
  if (res.aborted) return;
  if (res.method === 'copy' && res.ok) toast('Link copied — send it to a friend!');
  else if (!res.ok) toast('Could not share just now. Try Copy link in Invite.');
}
function renderInviteStats() {
  const box = $('#inviteStats'); if (!box) return;
  if (net.enabled() && S.inviteStats) {
    const s = S.inviteStats;
    box.innerHTML = `<div><b class="n">${s.invites || 0}</b> friend${(s.invites === 1) ? '' : 's'} joined</div><div>${s.cleared || 0} finished night 1 · you've earned 🪙 ${fmt(s.earned || 0)}</div>`;
  } else {
    box.innerHTML = `<p class="blurb">Your link works now. Coin rewards (🪙 ${fmt(CFG.REFERRAL_BONUS)} each, once a friend finishes night 1) start when leaderboards go live.${S.refPending ? ' Your own bonus is saved and will be added then.' : ''}</p>`;
  }
}
function openInvite() {
  const el = $('#inviteLink'); if (el) el.textContent = inviteLink(CFG.BOT_USERNAME);
  renderInviteStats();
  $('#invite').classList.add('on');
  syncInvites();
}

$('#btnStyle').onclick = () => meta.open('daily');
$('#btnPass').onclick = () => meta.open('pass');
$('#btnRanks').onclick = () => meta.open('ranks');
$('#btnPlay').onclick = play;
$('#btnDeploy').onclick = () => game.deploy();
$('#btnShop').onclick = () => { refresh(); $('#shop').classList.add('on'); };
$('#btnDaily').onclick = openDaily;
$('#btnInvite').onclick = openInvite;
$('#btnShareInvite').onclick = () => doShare(`I survived night ${S.best || S.night} in Deadspan: Outpost. Think you can hold the wall longer? 🧟🧱`);
$('#btnCopyInvite').onclick = async () => { const r = await copyInvite(CFG.BOT_USERNAME, `I survived in Deadspan: Outpost. Think you can hold the wall longer? 🧟🧱`); toast(r.ok ? 'Link copied — send it to a friend!' : 'Could not copy the link'); };
$('#btnSound').onclick = () => { S.sound = !S.sound; setSound(S.sound); persist(); refresh(); };
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => b.closest('.modal').classList.remove('on');
document.addEventListener('visibilitychange', () => { const po = document.getElementById('pauseOv'); if (document.hidden || !(po && po.classList.contains('on'))) game.pause(document.hidden); });
if (inTelegram && window.Telegram.WebApp.onEvent) window.Telegram.WebApp.onEvent('viewportChanged', () => game.resize());
if (IS_PORTAL) {
  // no Telegram invites, no Stars shop, no cross-links or outgoing links on web portals
  for (const sel of ['#btnInvite', '#btnShareScore', '#starList', '#moreGames', '#menu footer']) { const el = $(sel); if (el) el.style.display = 'none'; }
  const sl = $('#starList'); if (sl && sl.previousElementSibling && sl.previousElementSibling.tagName === 'H3') sl.previousElementSibling.style.display = 'none';
  // Poki/CrazyGames ad UX: 🎬 icon on every rewarded button, plain continue button above them
  for (const b of document.querySelectorAll('button.ad')) b.textContent = b.textContent.replace(/^▶/, '🎬');
  const nx = $('#btnNext'), first = $('#btnDouble'); if (nx && first) first.parentNode.insertBefore(nx, first);
  // Esc / P pauses (keyboard players), tap or key resumes
  const pv = document.createElement('div'); pv.id = 'pauseOv'; pv.innerHTML = '<div>PAUSED<small>Tap or press Esc to resume</small></div>'; document.body.appendChild(pv);
  const setPause = v => { if (!$('#hud').classList.contains('on')) return; if (v && game.state !== 'play') return; if (!v && game.state !== 'paused') return; game.pause(v); pv.classList.toggle('on', v); gameplay(!v); };
  window.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setPause(game.state === 'play'); });
  pv.onclick = () => setPause(false);
}
Ads.preload();
if (!IS_PORTAL) Payments.claim().then(c => { if (c && ((c.items || []).length || c.premium)) { applyGrant(c); toast('Purchase delivered!'); } });
meta.checkRewards();
syncInvites();
refresh();
if (DEVOK) window.__fps = () => game.fps;
loadAssets(p => { $('#loadFill').style.width = Math.round(p * 100) + '%'; }).then(() => {
  game.bg = null; meta.reapply(); show('menu'); loadingDone();
  if (AUTOPLAY) setTimeout(play, 400);
});
