/**
 * @file MultiAccountSwitcherManager.js
 * @description Manages active session selection across multi-account deployments
 * (e.g. Linda, PowerAgent, GorahaBot) for the Web UI top-bar account switcher.
 * Category: Accounts
 */

export class MultiAccountSwitcherManager {
  constructor(initialAccounts = []) {
    this.accounts = new Map();
    this.activeAccountId = null;

    for (const acc of initialAccounts) {
      this.registerAccount(acc);
    }
  }

  /**
   * Registers an account descriptor
   * @param {Object} account
   * @param {string} account.id
   * @param {string} account.name
   * @param {string} account.phone
   * @param {string} [account.status]
   */
  registerAccount(account) {
    this.accounts.set(account.id, {
      id: account.id,
      name: account.name || account.id,
      phone: account.phone || '',
      status: account.status || 'CONNECTED',
      registeredAt: new Date().toISOString()
    });

    if (!this.activeAccountId) {
      this.activeAccountId = account.id;
    }
  }

  /**
   * Sets the currently focused account
   * @param {string} accountId
   */
  switchAccount(accountId) {
    if (!this.accounts.has(accountId)) {
      throw new Error(`Account "${accountId}" does not exist in registry`);
    }
    this.activeAccountId = accountId;
    return this.getActiveAccount();
  }

  /**
   * Returns active account details
   * @returns {Object|null}
   */
  getActiveAccount() {
    return this.accounts.get(this.activeAccountId) || null;
  }

  /**
   * Returns list of all registered accounts
   * @returns {Array<Object>}
   */
  listAccounts() {
    return Array.from(this.accounts.values()).map(acc => ({
      ...acc,
      isActive: acc.id === this.activeAccountId
    }));
  }
}

export default new MultiAccountSwitcherManager([
  { id: 'linda_primary', name: 'Linda (Primary Concierge)', phone: '+971501112233' },
  { id: 'power_agent', name: 'PowerAgent (Campaigns)', phone: '+971559998877' }
]);

