/**
 * ====================================================================
 * KEYPAD DASHBOARD SERVICE
 * ====================================================================
 * Interactive hierarchical USSD/keypad style dashboard for WhatsApp.
 * Enables authorized masters to control and monitor the entire system
 * via intuitive numbered menus (00 = Home, 0 = Back, n/p = pagination).
 *
 * @since Development Phase — October 2026
 */

import { Logger } from '../../core/Logger.js';
import services from '../../core/ServiceRegistry.js';
import { maskPhone, phoneKey } from '../../outreach/OwnerPhoneNormalizer.js';
import { chunkOutput } from '../bridge/bridgeUtils.js';
import {
  MENUS,
  formatMenuScreen,
  getMenu,
  findOptionByCode,
} from './KeypadMenuRegistry.js';
import { keypadSessionTracker } from './KeypadSessionTracker.js';
import { KeypadActionExecutor } from './KeypadActionExecutor.js';

const logger = new Logger('KeypadDashboardService');

export class KeypadDashboardService {
  constructor(deps = {}) {
    this.sessionTracker = deps.sessionTracker || keypadSessionTracker;
    this.executor = deps.executor || new KeypadActionExecutor(deps);
  }

  /**
   * Determine if an inbound message should be processed by the keypad dashboard.
   *
   * @param {object} msg - Incoming WhatsApp message
   * @param {boolean} isMasterSender - Whether sender is an authorized master
   * @returns {boolean}
   */
  shouldHandle(msg, isMasterSender = false) {
    if (!msg || msg.fromMe || msg.isGroupMsg || !isMasterSender) {
      return false;
    }

    const text = String(msg.body || '').trim().toLowerCase();

    // 1. Direct menu triggers
    const menuTriggers = ['menu', 'dashboard', '00', 'home', '!menu', 'linda menu', 'linda dashboard'];
    if (menuTriggers.includes(text)) {
      return true;
    }

    // 2. Direct sub-menu code trigger (e.g. "3.1", "1.2", "2.1")
    if (/^\d\.\d$/.test(text)) {
      return true;
    }

    // 3. Navigation controls
    if (['0', 'back', 'n', 'next', 'p', 'prev'].includes(text)) {
      return true;
    }

    // 4. Single digit selection (1-7) when an active keypad session exists
    if (/^[1-7]$/.test(text)) {
      const session = this.sessionTracker.getSession(msg.from);
      if (session && session.menuId) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle interactive keypad navigation and action execution.
   *
   * @param {object} msg - Incoming message
   * @param {object} [client] - Primary client instance
   * @returns {Promise<boolean>}
   */
  async handleMessage(msg, client = null) {
    const sender = msg.from;
    const text = String(msg.body || '').trim().toLowerCase();
    const session = this.sessionTracker.getSession(sender);

    logger.info(`⌨️ Keypad dashboard input "${text}" from ${maskPhone(sender)} (Current: ${session.menuId})`);

    // ── 1. Pagination Navigation (Next / Prev) ──
    if (text === 'n' || text === 'next') {
      if (session.pages.length > 0 && session.currentPage < session.pages.length - 1) {
        session.currentPage++;
        await this._sendReply(msg, session.pages[session.currentPage], client);
        return true;
      }
      await this._sendReply(msg, 'ℹ️ You are already on the last page. Reply [0] for Back or [00] for Home.', client);
      return true;
    }

    if (text === 'p' || text === 'prev') {
      if (session.pages.length > 0 && session.currentPage > 0) {
        session.currentPage--;
        await this._sendReply(msg, session.pages[session.currentPage], client);
        return true;
      }
      await this._sendReply(msg, 'ℹ️ You are on the first page. Reply [0] for Back or [00] for Home.', client);
      return true;
    }

    // ── 2. Home Navigation (00 or home or menu or dashboard) ──
    if (['00', 'home', 'menu', 'dashboard', '!menu', 'linda menu', 'linda dashboard'].includes(text)) {
      this.sessionTracker.setMenu(sender, 'root');
      const rootMenu = getMenu('root');
      await this._sendReply(msg, formatMenuScreen(rootMenu), client);
      return true;
    }

    // ── 3. Back Navigation (0 or back) ──
    if (text === '0' || text === 'back') {
      const currentMenu = getMenu(session.menuId);
      const targetMenuId = currentMenu?.parentId || 'root';
      this.sessionTracker.setMenu(sender, targetMenuId);
      const targetMenu = getMenu(targetMenuId);
      await this._sendReply(msg, formatMenuScreen(targetMenu), client);
      return true;
    }

    // ── 4. Direct Code Execution (e.g. "3.1", "1.2") ──
    const directMatch = findOptionByCode(text);
    if (directMatch) {
      const { menu, option } = directMatch;
      if (option.action) {
        this.sessionTracker.setMenu(sender, menu.id);
        const result = await this.executor.execute(option.action, { sender, msg });
        await this._sendFormattedResult(msg, result, menu.id, client);
        return true;
      }
      if (option.subMenuId) {
        this.sessionTracker.setMenu(sender, option.subMenuId);
        const sub = getMenu(option.subMenuId);
        await this._sendReply(msg, formatMenuScreen(sub), client);
        return true;
      }
    }

    // ── 5. Context-Aware Digit Selection from Current Menu ──
    const currentMenu = getMenu(session.menuId) || getMenu('root');
    const selectedOption = currentMenu.options.find((opt) => opt.key === text || opt.code === text);

    if (selectedOption) {
      // Sub-menu transition
      if (selectedOption.subMenuId) {
        this.sessionTracker.setMenu(sender, selectedOption.subMenuId);
        const subMenu = getMenu(selectedOption.subMenuId);
        await this._sendReply(msg, formatMenuScreen(subMenu), client);
        return true;
      }

      // Action execution
      if (selectedOption.action) {
        const result = await this.executor.execute(selectedOption.action, { sender, msg });
        await this._sendFormattedResult(msg, result, currentMenu.id, client);
        return true;
      }
    }

    // Fallback if unrecognized input
    await this._sendReply(
      msg,
      `❓ *Unrecognized Choice "${text}"*\n\nReply with an option number, [0] for Back, or [00] for Main Menu.`,
      client
    );
    return true;
  }

  async _sendFormattedResult(msg, outputText, returnMenuId, client) {
    const navFooter = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n[0] ⬅️ Back | [00] 🏠 Home Menu`;
    const fullText = `${outputText}${navFooter}`;
    const chunks = chunkOutput(fullText, 3500);

    if (chunks.length > 1) {
      this.sessionTracker.setPagination(msg.from, chunks, 0);
      const firstChunkWithHint = `${chunks[0]}\n\n_(Reply [n] for next page)_`;
      await this._sendReply(msg, firstChunkWithHint, client);
    } else {
      await this._sendReply(msg, fullText, client);
    }
  }

  async _sendReply(msg, text, client) {
    const opts = { allowClosedCirclePrompt: true };
    if (msg && typeof msg.reply === 'function') {
      try {
        await msg.reply(text, undefined, opts);
        return;
      } catch (_) {
        /* fallback to client.sendMessage */
      }
    }
    if (client?.sendMessage) {
      await client.sendMessage(msg.from, text, opts);
    }
  }
}

export const keypadDashboardService = new KeypadDashboardService();
services.register('keypadDashboardService', keypadDashboardService);

export default keypadDashboardService;

