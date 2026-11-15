# Deadspan: Outpost, the merge tower defence

Game #2 from **Deadspan Arcade**. A free, one-thumb zombie tower defence for **Telegram Mini Apps** that also runs in any mobile browser.

**Play:** https://curtisrobertrc-droid.github.io/deadspan-outpost/
More from Deadspan Arcade: [Deadspan](https://curtisrobertrc-droid.github.io/deadspan/), the zombie bridge runner.

## How it plays
- The horde walks down toward your wall. Your turrets sit in a 5×3 compound behind it and fire automatically at whatever is closest to the wall.
- **DEPLOY** (bottom button) spends scrap on a random Lv 1 turret. **Drag two turrets with the same number together to merge them** into the next tier: Pistol → Rifle → MG → Shotgun → Rocket (splash) → Tesla (chain) → Laser (pierce) → Railstorm.
- **Multipliers:** kill streaks build a scrap **combo multiplier** (up to ×5). Tap parachuting **supply drops** for scrap, ×2 fire-rate frenzy, a free turret or wall repair.
- Every 3 waves you **pick 1 of 3 perks** (roguelite). Each night has 8 waves, and every 3rd night ends with a boss.
- Enemy types: walkers, runners, brutes (heavy wall damage), spitters (stop short and lob acid at the wall) and the boss.
- Meta progression with coins: turret damage, starting scrap, wall armour, lucky deploys. Plus a daily supply streak and invite links.

## Monetisation hooks (disabled until configured in `js/config.js`)
- AdsGram rewarded: double coins, rebuild the wall once per night, double the daily reward.
- Telegram Stars: fixed coin packs (`op_coins_5k`, `op_coins_15k`) via the shared Deadspan Worker (see the Deadspan repo, `backend/` and `docs/AUTOMATION-PLAN.md`). These SKUs are already in the Worker's `PRODUCTS`, and credits are kept per game.
- No token, no paid random rewards, no paid-entry prizes.

## Dev
- `?bot=1` self-play bot (auto deploy, merge, pick perks), used for balancing, screenshots and clips. `?devads=1` previews ad buttons with a fake ad.
- Balance (phone-size viewport, bot that buys upgrades with its coins, up to 10 tries per night): a fast bot clears nights 1–17 at the first attempt, needs 6 tries on boss night 18 and stalls at boss night 21. A slower, human-paced bot (1.5 s reactions, ignores supply drops) starts losing wall around night 12, needs retries on nights 15–16 and stalls at boss night 18.
- Shared shell with Deadspan: `platform.js`, `ads.js`, `payments.js`, `audio.js`. All art is drawn in code and all sound is synthesised, with no third-party assets.
- Run locally: `python3 -m http.server 8000`
