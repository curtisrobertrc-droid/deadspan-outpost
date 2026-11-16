// Deadspan: Outpost: runtime config. Monetisation is OFF until filled in.
export const CFG = {
  GAME_NAME: 'Deadspan: Outpost',
  VERSION: '0.1.0',
  BOT_USERNAME: '',            // same Deadspan bot once Rob creates it
  MINI_APP_SHORT_NAME: '',     // e.g. 'outpost' (via /newapp on the same bot)
  ADSGRAM_BLOCK_ID: '',        // separate AdsGram Rewarded block for this game
  ADSGRAM_DEBUG: false,
  BACKEND_URL: '',             // shared Deadspan Cloudflare Worker
  STAR_PRODUCTS: [
    { sku: 'op_coins_5k',  title: '5,000 coins',  stars: 50 },
    { sku: 'op_coins_15k', title: '15,000 coins', stars: 120 },
  ],
  REFERRAL_BONUS: 300,
  MORE_GAMES: [
    { name: 'Deadspan', tag: 'Zombie bridge runner', url: 'https://curtisrobertrc-droid.github.io/deadspan/', icon: 'https://curtisrobertrc-droid.github.io/deadspan/assets/icon.svg' },
  ],
};
export const QS = new URLSearchParams(location.search);
export const DEVOK = !window.PORTAL || QS.get('qa') === '1'; // dev helpers are stripped from portal builds
export const DEV_FAKE_ADS = DEVOK && QS.get('devads') === '1';
export const AUTOPLAY = DEVOK && QS.get('bot') === '1';
