/**
 * ====================================================================
 * KEYPAD SESSION TRACKER
 * ====================================================================
 * Tracks the current menu hierarchy position and pagination state
 * for each master account interacting with the WhatsApp keypad dashboard.
 *
 * @since Development Phase — October 2026
 */

import { phoneKey } from '../../outreach/OwnerPhoneNormalizer.js';

export class KeypadSessionTracker {
  constructor(ttlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
  }

  /**
   * Get or initialize session state for a user phone.
   *
   * @param {string} phone
   * @returns {object}
   */
  getSession(phone) {
    const key = phoneKey(phone);
    const now = Date.now();
    const existing = this.sessions.get(key);

    if (existing && now - existing.lastActive < this.ttlMs) {
      existing.lastActive = now;
      return existing;
    }

    const initial = {
      menuId: 'root',
      lastActive: now,
      pages: [],
      currentPage: 0,
    };
    this.sessions.set(key, initial);
    return initial;
  }

  /**
   * Update active menu location for user.
   *
   * @param {string} phone
   * @param {string} menuId
   */
  setMenu(phone, menuId) {
    const session = this.getSession(phone);
    session.menuId = menuId;
    session.pages = [];
    session.currentPage = 0;
    session.lastActive = Date.now();
  }

  /**
   * Store paginated output chunks for user.
   *
   * @param {string} phone
   * @param {string[]} pages
   * @param {number} [currentPage=0]
   */
  setPagination(phone, pages = [], currentPage = 0) {
    const session = this.getSession(phone);
    session.pages = pages;
    session.currentPage = currentPage;
    session.lastActive = Date.now();
  }

  /**
   * Clear session.
   *
   * @param {string} phone
   */
  clear(phone) {
    this.sessions.delete(phoneKey(phone));
  }
}

export const keypadSessionTracker = new KeypadSessionTracker();
export default keypadSessionTracker;

