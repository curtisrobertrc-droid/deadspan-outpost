// Rewarded ads. AdsGram integration is ready but disabled until CFG.ADSGRAM_BLOCK_ID is set.
import { CFG, DEV_FAKE_ADS } from './config.js';
import { inTelegram } from './platform.js';

let controller = null, loading = null;
function loadSdk() {
  if (window.Adsgram) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://sad.adsgram.ai/js/sad.min.js';
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return loading;
}

export const Ads = {
  // AdsGram only serves inside Telegram, so real ads are only offered there.
  available() { return (!!CFG.ADSGRAM_BLOCK_ID && inTelegram) || DEV_FAKE_ADS; },
  async preload() { if (CFG.ADSGRAM_BLOCK_ID && inTelegram) { try { await loadSdk(); } catch (e) {} } },
  // Resolves true only if the user watched to the end.
  async showRewarded() {
    if (CFG.ADSGRAM_BLOCK_ID && inTelegram) {
      try {
        await loadSdk();
        if (!controller) controller = window.Adsgram.init({ blockId: CFG.ADSGRAM_BLOCK_ID, debug: !!CFG.ADSGRAM_DEBUG });
        const r = await controller.show();
        return !!(r && r.done);
      } catch (e) { console.warn('ad not shown', e); return false; }
    }
    if (DEV_FAKE_ADS) return fakeAd();
    return false;
  },
};

function fakeAd() {
  return new Promise(res => {
    const d = document.createElement('div');
    d.className = 'fakead';
    d.innerHTML = '<div>TEST AD<br><small>(dev mode, no real ad)</small></div>';
    document.body.appendChild(d);
    setTimeout(() => { d.remove(); res(true); }, 1500);
  });
}
