import { CFG, AUTOPLAY } from './config.js';
import { initPlatform, inTelegram, loadLocal, loadCloud, save, haptic, startParam, shareInvite, userId } from './platform.js';
import { Ads } from './ads.js';
import { Payments } from './payments.js';
import { setSound, unlockAudio, SFX } from './audio.js';
import { Game, fmt, nightInfo, PERKS, TIERS } from './game.js';

initPlatform();
const $ = s => document.querySelector(s);
const DEF = { v: 1, night: 1, coins: 0, best: 0, bestTier: 1, up: { dmg: 0, scrap: 0, armor: 0, luck: 0 }, daily: { last: '', streak: 0 }, runs: 0, sound: true, refClaimed: false, created: Date.now() };
const norm = o => { const s = Object.assign({}, DEF, o || {}); s.up = Object.assign({}, DEF.up, s.up); s.daily = Object.assign({}, DEF.daily, s.daily); return s; };
let S = norm(loadLocal());
const persist = () => save(S);
loadCloud().then(c => { if (c && (c.night > S.night || (c.night === S.night && c.coins > S.coins))) { S = norm(c); persist(); refresh(); } });
setSound(S.sound);

const sp = startParam();
if (sp && /^ref_/.test(sp) && !S.refClaimed && sp !== 'ref_' + userId()) { S.refClaimed = true; S.coins += CFG.REFERRAL_BONUS; persist(); setTimeout(() => toast(`Welcome bonus: +${CFG.REFERRAL_BONUS} coins from your friend's invite!`), 600); }

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
  onPerk: opts => showPerks(opts),
  onMerge: lv => { if (lv > S.bestTier) { S.bestTier = lv; persist(); if (lv >= 3) setTimeout(() => toast(`New turret unlocked: ${TIERS[lv].name}!`), 200); } },
  onEnd: r => showResult(r),
});
window.__game = game;

function banner(t, sub) { const b = $('#waveBanner'); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ''); b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), 1500); }
let revived = false;
function play() { unlockAudio(); haptic('medium'); revived = false; show('hud'); game.start(S.night, S.up); }
function show(id) { for (const el of document.querySelectorAll('.screen')) el.classList.toggle('on', el.id === id); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }

function showPerks(opts) {
  const box = $('#perkList'); box.innerHTML = '';
  for (const id of opts) {
    const p = PERKS[id]; const b = document.createElement('button'); b.className = 'perk';
    b.innerHTML = `<span class="ic">${p.i}</span><span><b>${p.t}</b><br><small>${p.d}</small></span>`;
    b.onclick = () => { $('#perk').classList.remove('on'); game.resumeFromPerk(id); };
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
    row.innerHTML = `<div class="ic">⭐</div><div class="t"><b>${p.title}</b><br><small>Fixed amount, no random rewards</small></div><button class="buy star">${p.stars} ⭐</button>`;
    row.querySelector('button').onclick = async () => {
      if (!Payments.enabled()) return toast('Telegram Stars shop opens soon!');
      const r = await Payments.buy(p.sku);
      if (r.ok) { S.coins += r.coins; persist(); refresh(); toast('Thanks! Coins added.'); } else if (r.reason !== 'cancelled') toast('Purchase not completed.');
    };
    st.appendChild(row);
  }
  const mg = $('#moreGames'); mg.innerHTML = '';
  for (const g of CFG.MORE_GAMES) { const a = document.createElement('a'); a.className = 'more'; a.href = g.url; a.innerHTML = `<img src="${g.icon}" alt=""><span><span class="k">MORE GAMES</span><br><b>${g.name}</b><small>${g.tag}</small></span>`; mg.appendChild(a); }
}

function showResult(r) {
  S.runs++;
  $('#resTitle').textContent = r.win ? (nightInfo(r.N).boss ? 'BOSS SLAIN!' : 'YOU SURVIVED!') : 'WALL BREACHED!';
  $('#resTitle').className = r.win ? 'win' : 'lose';
  $('#resSub').textContent = r.win ? `Night ${r.N} · ${r.kills} zombies · best turret ${TIERS[r.tier].name}` : `Night ${r.N} · wave ${r.wave}/${r.waves} · ${r.kills} zombies`;
  $('#resCoins').textContent = '+' + fmt(r.coins);
  const earned = r.coins; let collected = false;
  const collect = mult => { if (collected) return; collected = true; S.coins += earned * mult; if (r.win) { S.night = r.N + 1; S.best = Math.max(S.best, r.N); } persist(); refresh(); };
  const adBtn = $('#btnDouble'), revBtn = $('#btnRevive');
  adBtn.style.display = Ads.available() && earned > 0 ? '' : 'none';
  revBtn.style.display = !r.win && !revived && Ads.available() ? '' : 'none';
  adBtn.onclick = async () => { adBtn.disabled = true; const ok = await Ads.showRewarded(); adBtn.disabled = false; if (ok) { collect(2); SFX.coin(); toast(`Doubled! +${fmt(earned * 2)} coins`); adBtn.style.display = 'none'; $('#resCoins').textContent = '+' + fmt(earned * 2); } else toast('No ad available right now'); };
  revBtn.onclick = async () => { revBtn.disabled = true; const ok = await Ads.showRewarded(); revBtn.disabled = false; if (ok) { revived = true; show('hud'); game.revive(); } };
  $('#btnNext').textContent = r.win ? `NIGHT ${r.N + 1} ▶` : 'TRY AGAIN ↻';
  $('#btnNext').onclick = () => { collect(1); play(); };
  $('#btnMenu').onclick = () => { collect(1); refresh(); show('menu'); };
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

$('#btnPlay').onclick = play;
$('#btnDeploy').onclick = () => game.deploy();
$('#btnShop').onclick = () => { refresh(); $('#shop').classList.add('on'); };
$('#btnDaily').onclick = openDaily;
$('#btnInvite').onclick = () => shareInvite(CFG.BOT_USERNAME, `I survived night ${S.best || S.night} in Deadspan: Outpost. Think you can hold the wall longer? 🧟🧱`);
$('#btnSound').onclick = () => { S.sound = !S.sound; setSound(S.sound); persist(); refresh(); };
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => b.closest('.modal').classList.remove('on');
document.addEventListener('visibilitychange', () => game.pause(document.hidden));
if (inTelegram && window.Telegram.WebApp.onEvent) window.Telegram.WebApp.onEvent('viewportChanged', () => game.resize());
Ads.preload();
Payments.claim().then(c => { if (c > 0) { S.coins += c; persist(); refresh(); toast(`Purchase delivered: +${fmt(c)} coins`); } });
refresh(); show('menu');
if (AUTOPLAY) setTimeout(play, 400);
