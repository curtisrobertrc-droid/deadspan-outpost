// Portal layer: one codebase for Telegram, CrazyGames, Poki and plain web (itch.io).
// The target is set by the portal build (window.PORTAL). The GitHub Pages / Telegram build leaves it unset.
export const TARGET = window.PORTAL || 'telegram';
export const IS_PORTAL = TARGET !== 'telegram';
const ADS_ON = window.PORTAL_ADS !== false;
let cg = null, poki = null, playing = false, inAd = false, plays = 0;
let muteHook = () => {};
const log = []; if (new URLSearchParams(location.search).get('qa') === '1') window.__portalEv = log; // QA only
const ev = n => { log.push(n); if (log.length > 200) log.shift(); };
export function onAdMute(fn) { muteHook = fn; }

const timeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
export async function initPortal() {
  if (TARGET === 'crazygames' && window.CrazyGames && window.CrazyGames.SDK) {
    try { await timeout(window.CrazyGames.SDK.init(), 5000); const s = window.CrazyGames.SDK; if (s.environment && s.environment !== 'disabled') cg = s; } catch (e) { console.warn('CrazyGames SDK init failed', e); }
    try { cg && cg.game.loadingStart(); } catch (e) {}
  }
  if (TARGET === 'poki' && window.PokiSDK) {
    // Poki: if init fails (e.g. adblock) the game must still load; the SDK calls stay safe no-ops.
    try { await timeout(window.PokiSDK.init(), 5000); } catch (e) { console.warn('Poki SDK init failed, continuing', e); }
    poki = window.PokiSDK;
  }
  if (IS_PORTAL) {
    document.body.classList.add('portal', 'portal-' + TARGET);
    // keep arrow keys / space / wheel from scrolling the host page
    window.addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); });
    window.addEventListener('wheel', e => e.preventDefault(), { passive: false });
  }
}

// Saves: CrazyGames Data module (synced to the player's CrazyGames account) when available, otherwise localStorage.
export const store = {
  get(k) { try { if (cg && cg.data) { const v = cg.data.getItem(k); if (v != null) return v; } } catch (e) {} try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (cg && cg.data) cg.data.setItem(k, v); } catch (e) {} try { localStorage.setItem(k, v); } catch (e) {} },
};

export function loadingDone() {
  ev('loadingDone');
  try { cg && cg.game.loadingStop(); } catch (e) {}
  try { poki && poki.gameLoadingFinished(); } catch (e) {}
}
// gameplayStart/Stop, de-duplicated (Poki rejects two starts or two stops in a row) and never during an ad.
export function gameplay(on) {
  if (on === playing || inAd) return; playing = on; ev(on ? 'gameplayStart' : 'gameplayStop');
  try { cg && (on ? cg.game.gameplayStart() : cg.game.gameplayStop()); } catch (e) {}
  try { poki && (on ? poki.gameplayStart() : poki.gameplayStop()); } catch (e) {}
}

// Full-screen input blocker + mute while an ad plays.
function adBegin() { ev('adStart'); inAd = true; muteHook(true); let b = document.getElementById('adBlock'); if (!b) { b = document.createElement('div'); b.id = 'adBlock'; b.style.cssText = 'position:fixed;inset:0;z-index:9999;background:transparent'; document.body.appendChild(b); } b.style.display = 'block'; }
function adEnd() { ev('adEnd'); inAd = false; muteHook(false); const b = document.getElementById('adBlock'); if (b) b.style.display = 'none'; }
const cgAd = type => new Promise(res => {
  let done = false; const fin = ok => { if (done) return; done = true; adEnd(); res(ok); };
  try {
    ev('requestAd:' + type); cg.ad.requestAd(type, { adStarted: () => adBegin(), adFinished: () => fin(true), adError: e => { console.warn('ad error', e); fin(false); } });
  } catch (e) { fin(false); }
});

export const PortalAds = {
  // only meaningful when IS_PORTAL
  available() { return ADS_ON && (!!cg || !!poki); },
  async rewarded() {
    if (!ADS_ON) return false;
    if (cg) { gameplay(false); return cgAd('rewarded'); }
    if (poki) {
      gameplay(false); ev('rewardedBreak'); adBegin();
      try { return !!(await poki.rewardedBreak(() => {})); } catch (e) { return false; } finally { adEnd(); }
    }
    return false;
  },
  // Called right before gameplay resumes after the player chose to continue.
  // CrazyGames: midgame only at a natural break after a cleared level (never combined with a rewarded continue).
  // Poki: commercialBreak before every gameplayStart except the first one of the session.
  async beforePlay({ afterWin = false } = {}) {
    plays++;
    if (!ADS_ON) return;
    if (cg && afterWin) { await cgAd('midgame'); return; }
    if (poki && plays > 1) { ev('commercialBreak'); adBegin(); try { await poki.commercialBreak(() => {}); } catch (e) {} finally { adEnd(); } }
  },
};

// CrazyGames leaderboard (invite-only; one board per game; weekly seasons run by CrazyGames).
// Inert until build_portals.py is run with CG_LB_KEY_<GAME> (the 32-byte base64 encryption key from the CrazyGames dev portal).
export async function portalScore(score) {
  if (!cg || !window.CG_LB_KEY || !cg.user || !cg.user.submitScore) return;
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12)), alg = { name: 'AES-GCM', iv };
    const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(window.CG_LB_KEY), c => c.charCodeAt(0)), alg, false, ['encrypt']);
    const enc = new Uint8Array(await crypto.subtle.encrypt(alg, key, new TextEncoder().encode(String(score))));
    const all = new Uint8Array(iv.length + enc.length); all.set(iv); all.set(enc, iv.length);
    cg.user.submitScore({ encryptedScore: btoa(String.fromCharCode(...all)), score }); ev('submitScore');
  } catch (e) { /* never let a leaderboard error touch gameplay */ }
}
