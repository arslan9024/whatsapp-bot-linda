// @ts-nocheck
/**
 * MorningBriefingService.js
 *
 * Sends a daily morning briefing to the bot admin at 09:00 Asia/Dubai.
 * Covers: device health, campaign status, Vardon owner stats.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

import services from '../core/ServiceRegistry.js';

const DUBAI_TZ = 'Asia/Dubai';
const BRIEFING_HOUR = 9; // 09:00 GST

export class MorningBriefingService {
  constructor() {
    this._timer = null;
    this._lastSentDate = null;
    this._active = false;
    this._sendFn = null;
    this._adminPhone = null;
  }

  /**
   * Start the daily briefing scheduler.
   * @param {Function} sendFn - async (phone, text) => void
   * @param {string} adminPhone - Master admin phone (E.164)
   */
  start(sendFn, adminPhone) {
    if (this._active) return;
    if (!adminPhone) {
      console.warn('[MorningBriefing] No admin phone — briefing disabled.');
      return;
    }
    this._sendFn = sendFn;
    this._adminPhone = adminPhone;
    this._active = true;
    this._scheduleNext();
    console.log(`[MorningBriefing] ✅ Daily briefing scheduled for ${adminPhone} at 09:00 GST`);
  }

  stop() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._active = false;
    console.log('[MorningBriefing] Stopped.');
  }

  _scheduleNext() {
    const msToNext = this._msUntilNextBriefing();
    const hrsToNext = (msToNext / 3600000).toFixed(1);
    console.log(`[MorningBriefing] Next briefing in ${hrsToNext}h`);
    this._timer = setTimeout(async () => {
      try { await this._send(); } catch (e) { console.error('[MorningBriefing]', e.message); }
      if (this._active) this._scheduleNext();
    }, msToNext);
  }

  _msUntilNextBriefing() {
    const now = new Date();
    // Build a Dubai-time Date object
    const dubaiStr = now.toLocaleString('en-US', { timeZone: DUBAI_TZ });
    const dubaiNow = new Date(dubaiStr);
    const target = new Date(dubaiNow);
    target.setHours(BRIEFING_HOUR, 0, 0, 0);
    if (dubaiNow >= target) target.setDate(target.getDate() + 1);
    return target - dubaiNow;
  }

  async _send() {
    const today = new Date().toLocaleDateString('en-AE', { timeZone: DUBAI_TZ });
    if (this._lastSentDate === today) return; // already sent today
    this._lastSentDate = today;

    const briefing = await this._buildBriefing(today);

    try {
      const bridge = services.get('whatsAppCommandBridge');
      if (bridge?.sendToAdmin) {
        await bridge.sendToAdmin(briefing);
      } else if (this._sendFn) {
        await this._sendFn(this._adminPhone, briefing);
      } else {
        console.log('[MorningBriefing] No send channel available. Briefing:\n', briefing);
        return;
      }
      console.log('[MorningBriefing] ✅ Morning briefing sent');
    } catch (e) {
      console.error('[MorningBriefing] Failed to send:', e.message);
    }
  }

  async _buildBriefing(today) {
    const timeStr = new Date().toLocaleTimeString('en-AE', {
      timeZone: DUBAI_TZ, hour: '2-digit', minute: '2-digit',
    });
    const lines = [
      `🌅 *Good Morning — Linda Daily Briefing*`,
      `📅 ${today} | ${timeStr} GST`,
      ``,
    ];

    // Device health
    try {
      const monitor = services.get('accountHealthMonitor');
      const h = monitor?.getHealthSummary?.() || {};
      const failed = h.failed ?? 0;
      lines.push(`📱 *Devices:* ${h.linked ?? '?'}/${h.total ?? '?'} linked${failed > 0 ? ` | ⚠️ ${failed} failed` : ' ✅'}`);
    } catch { lines.push('📱 Devices: status unavailable'); }

    // Campaign config
    try {
      const env = process.env;
      const mode = env.OUTREACH_DAILY_MODE || 'draft';
      const project = env.OUTREACH_DAILY_PROJECTS || 'VARDON';
      const dailyLimit = env.NEW_CONVERSATIONS_DAILY_LIMIT || 12;
      const monthlyLimit = env.NEW_CONVERSATIONS_MONTHLY_LIMIT || 300;
      lines.push(`📢 *Campaign:* ${project} | ${mode.toUpperCase()} | Daily: ${dailyLimit} | Monthly: ${monthlyLimit}`);
    } catch { lines.push('📢 Campaign: config unavailable'); }

    // Live sent count
    try {
      const guard = services.get('newConversationGuard');
      if (guard?.getTodayCount) {
        lines.push(`✉️ *Sent today:* ${guard.getTodayCount()} messages`);
      }
    } catch {}

    // AI memory stats
    try {
      const gemini = services.get('geminiChatService');
      if (gemini?.memoryStats) {
        const { activeSessions } = gemini.memoryStats();
        if (activeSessions > 0) lines.push(`🧠 *Active AI sessions:* ${activeSessions}`);
      }
    } catch {}

    lines.push(``);
    lines.push(`💡 *Quick commands:* linda status | linda campaign | linda report`);
    lines.push(`_Linda AI Assistant — White Caves Real Estate LLC_`);

    return lines.join('\n');
  }

  /** Manual trigger for testing */
  async sendNow() {
    this._lastSentDate = null; // reset guard so it sends
    return this._send();
  }
}

export default new MorningBriefingService();

