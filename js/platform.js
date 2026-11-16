// Telegram WebApp wrapper + persistence (localStorage, mirrored to Telegram CloudStorage when available).
import { store } from './portal.js?v2';
const W = window.Telegram && window.Telegram.WebApp;
export const tg = W || null;
export const inTelegram = !!(W && W.initData);

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

export function shareInvite(botUsername, text) {
  const uid = userId();
  const link = botUsername ? `https://t.me/${botUsername}?startapp=ref_${uid || 'web'}` : location.origin + location.pathname;
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  if (inTelegram && tg.openTelegramLink) tg.openTelegramLink(url);
  else if (navigator.share) navigator.share({ title: 'Deadspan: Outpost', text, url: link }).catch(() => {});
  else window.open(url, '_blank');
}
