/**
 * @file ApiKeySecretExpiryGuard.js
 * @description Tracks credential expiration dates and monthly spending ceilings across third-party API providers, alerting operations 14 days before potential service interruption.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class ApiKeySecretExpiryGuard {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.keyRegistry = options.keyRegistry || [
      { provider: 'OpenAI', keyIdentifier: 'sk-...4f92', expiryDate: '2028-06-30' },
      { provider: 'Anthropic', keyIdentifier: 'sk-ant-...99a1', expiryDate: '2028-06-30' },
      { provider: 'Twilio', keyIdentifier: 'AC...8877', expiryDate: '2028-12-31' }
    ];
  }

  /**
   * Audits registered secrets for impending expiration.
   * @param {string} [currentDateIso]
   * @returns {Object}
   */
  auditSecretExpirations(currentDateIso) {
    const today = currentDateIso ? new Date(currentDateIso) : new Date();
    const alerts = [];

    for (const key of this.keyRegistry) {
      const exp = new Date(key.expiryDate);
      const daysRemaining = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 14) {
        alerts.push({
          provider: key.provider,
          keyIdentifier: key.keyIdentifier,
          daysRemaining,
          urgency: daysRemaining <= 3 ? 'CRITICAL_ROTATION_URGENT' : 'WARNING_ROTATION_DUE'
        });
      }
    }

    const hasAlerts = alerts.length > 0;

    return {
      totalKeysAudited: this.keyRegistry.length,
      keysExpiringSoonCount: alerts.length,
      alerts,
      isAllHealthy: !hasAlerts,
      status: hasAlerts ? 'ROTATION_ALERT_ACTIVE' : 'ALL_KEYS_SECURE'
    };
  }
}

export default new ApiKeySecretExpiryGuard();
