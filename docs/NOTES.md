# Deadspan: Outpost: ops notes
- Uses the same Telegram bot and the same Cloudflare Worker as Deadspan (see the deadspan repo `docs/AUTOMATION-PLAN.md`).
- To list it in Telegram, Rob sends `/newapp` to @BotFather → choose the Deadspan bot → title `Deadspan: Outpost` → photo `assets/telegram/miniapp-photo-640x360.png` → GIF `/empty` → URL `https://curtisrobertrc-droid.github.io/deadspan-outpost/` → short name `outpost`. The link becomes `t.me/<bot>/outpost`.
- AdsGram: add a second Rewarded block in the same AdsGram platform and paste its blockId into `js/config.js`.
- Stars SKUs (already in the shared Worker `PRODUCTS`): `op_coins_5k` (50 Stars, 5,000 coins), `op_coins_15k` (120 Stars, 15,000 coins).
- Leaderboards / Stars backend: shared with Deadspan, see deadspan/docs/LEADERBOARDS.md (set BACKEND_URL + LEADERBOARDS in js/config.js).
