// Deadspan: Outpost: runtime config. Monetisation is OFF until filled in.
export const CFG = {
  GAME_NAME: 'Deadspan: Outpost',
  VERSION: '0.1.1',
  BOT_USERNAME: 'DeadspanGameBot',     // same bot as Deadspan
  MINI_APP_SHORT_NAME: '',     // e.g. 'outpost' (via /newapp on the same bot)
  ADSGRAM_BLOCK_ID: '',        // separate AdsGram Rewarded block for this game
  ADSGRAM_DEBUG: false,
  BACKEND_URL: 'https://deadspan-bot.curtis-robert-rc.workers.dev',  // shared Deadspan Cloudflare Worker
  // Leaderboards (needs Telegram so initData can be checked). In a normal browser the Ranks tab still shows personal bests.
  LEADERBOARDS: true,
  // Telegram Stars products: COSMETIC ONLY (no coins, no power), fixed contents, no random rewards (UK loot-box safe).
  STAR_PRODUCTS: [
    { sku: 'op_pass', title: 'Premium season pass', desc: 'Unlocks this month\'s premium cosmetic track', stars: 150 },
    { sku: 'op_gold', title: 'Gold Outpost bundle', desc: 'Gold Plated turrets + Gold Bars wall + Rainbow tracers', stars: 100 },
  ],
  REFERRAL_BONUS: 500,         // coins each for inviter and invitee, once the friend finishes night 1 (paid by the Worker)
  MORE_GAMES: [
    { name: 'Deadspan', tag: 'Zombie bridge runner', url: 'https://curtisrobertrc-droid.github.io/deadspan/', icon: 'https://curtisrobertrc-droid.github.io/deadspan/assets/icon.svg' },
  ],
};
export const QS = new URLSearchParams(location.search);
export const DEVOK = !window.PORTAL || QS.get('qa') === '1'; // dev helpers are stripped from portal builds
export const DEV_FAKE_ADS = DEVOK && QS.get('devads') === '1';
export const AUTOPLAY = DEVOK && QS.get('bot') === '1';
