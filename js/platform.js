// Telegram WebApp wrapper + persistence (localStorage, mirrored to Telegram CloudStorage when available).
import { store } from './portal.js?v3';
const W = window.Telegram && window.Telegram.WebApp;
export const tg = W || null;
export const inTelegram = !!(W && W.initData);
const DEFAULT_BOT = 'DeadspanGameBot';

export function initPlatform() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7') && tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    if (tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
      tg.setHeaderColor && tg.setHeaderColor('#14121c');
      tg.setBackgroundColor && tg.setBackgroundColor('#14121c');
    }
  } catch (e) { console.warn('tg init', e); }
}

export function userId() {
  try { return (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || null; } catch (e) { return null; }
}
export function startParam() {
  try {
    const p = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
    return p || new URLSearchParams(location.search).get('startapp') || null;
  } catch (e) { return null; }
}

let lastHap = 0;
export function haptic(kind = 'light') {
  const now = performance.now();
  if (now - lastHap < 60) return; lastHap = now;
  try {
    if (inTelegram && tg.HapticFeedback) {
      if (kind === 'success' || kind === 'error' || kind === 'warning') tg.HapticFeedback.notificationOccurred(kind);
      else tg.HapticFeedback.impactOccurred(kind);
    } else if (navigator.vibrate && kind !== 'light' && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(kind === 'heavy' ? 30 : 12);
  } catch (e) {}
}

const KEY = 'outpost_save_v1';
const cloudOk = () => inTelegram && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9');

export function loadLocal() {
  try { return JSON.parse(store.get(KEY) || 'null'); } catch (e) { return null; }
}
export function loadCloud() {
  return new Promise(res => {
    if (!cloudOk()) return res(null);
    try { tg.CloudStorage.getItem(KEY, (err, v) => { if (err || !v) return res(null); try { res(JSON.parse(v)); } catch (e) { res(null); } }); }
    catch (e) { res(null); }
  });
}
let cloudTimer = null;
export function save(data) {
  const s = JSON.stringify(data);
  store.set(KEY, s);
  if (cloudOk()) {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => { try { tg.CloudStorage.setItem(KEY, s, () => {}); } catch (e) {} }, 800);
  }
}

export function inviteLink(botUsername) {
  const bot = botUsername || DEFAULT_BOT;
  const uid = userId();
  return uid ? `https://t.me/${bot}?startapp=ref_${uid}` : `https://t.me/${bot}?startapp`;
}

async function copyText(s) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(s); return true; }
  } catch (e) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = s; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return !!ok;
  } catch (e) { return false; }
}

// Share a challenge / invite: prepared Telegram message if we have one, else t.me/share, else navigator.share, else copy the link.
export async function shareInvite(botUsername, text, opts = {}) {
  const link = inviteLink(botUsername);
  const title = opts.title || 'Deadspan: Outpost';
  if (inTelegram && tg && typeof tg.shareMessage === 'function' && opts.preparedId) {
    try {
      const ok = await new Promise(res => {
        try { tg.shareMessage(String(opts.preparedId), sent => res(!!sent)); } catch (e) { res(false); }
      });
      if (ok) return { ok: true, method: 'shareMessage', link };
    } catch (e) {}
  }
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  if (inTelegram && tg && tg.openTelegramLink) {
    try { tg.openTelegramLink(shareUrl); return { ok: true, method: 'telegram', link }; } catch (e) {}
  }
  if (navigator.share) {
    try { await navigator.share({ title, text, url: link }); return { ok: true, method: 'share', link }; }
    catch (e) { if (e && e.name === 'AbortError') return { ok: false, method: 'share', aborted: true, link }; }
  }
  const copied = await copyText(text ? `${text}\n${link}` : link);
  return { ok: copied, method: 'copy', link };
}

export async function copyInvite(botUsername, text) {
  const link = inviteLink(botUsername);
  const copied = await copyText(text ? `${text}\n${link}` : link);
  return { ok: copied, method: 'copy', link };
}
