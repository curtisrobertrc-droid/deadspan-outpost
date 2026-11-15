// Telegram Stars purchases. Needs a bot backend (Cloudflare Worker) that calls Bot API createInvoiceLink
// with currency "XTR" and an empty provider_token, then credits the purchase after successful_payment.
import { CFG } from './config.js';
import { tg, inTelegram } from './platform.js';

export const Payments = {
  enabled() { return !!CFG.BACKEND_URL && inTelegram && !!tg.openInvoice; },
  // Collects coins credited by completed purchases (also called on start-up in case the app closed mid-purchase).
  async claim() {
    if (!this.enabled()) return 0;
    try {
      const c = await fetch(CFG.BACKEND_URL + '/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, game: 'outpost' }) }).then(x => x.json());
      return c.coins || 0;
    } catch (e) { return 0; }
  },
  async buy(sku) {
    if (!this.enabled()) return { ok: false, reason: 'disabled' };
    try {
      const r = await fetch(CFG.BACKEND_URL + '/invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, initData: tg.initData }),
      });
      const { link } = await r.json();
      if (!link) return { ok: false, reason: 'no_link' };
      const status = await new Promise(res => tg.openInvoice(link, res));
      if (status !== 'paid') return { ok: false, reason: status };
      // Server is the source of truth: the webhook credits the purchase, then we claim it.
      await new Promise(r => setTimeout(r, 1500));
      return { ok: true, coins: await this.claim() };
    } catch (e) { return { ok: false, reason: 'error' }; }
  },
};
