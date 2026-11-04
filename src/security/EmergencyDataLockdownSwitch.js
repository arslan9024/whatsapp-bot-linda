/**
 * @file EmergencyDataLockdownSwitch.js
 * @description Emergency circuit breaker providing instant security lockdown: freezes
 * outbound message dispatch and halts API mutations while strictly protecting sessions.
 * Category: Domain / Feature (Security)
 */

export class EmergencyDataLockdownSwitch {
  constructor() {
    this.isLockedDown = false;
    this.lockdownReason = null;
    this.lockdownTimestamp = null;
    this.authorizedOperators = new Set(['admin', 'security_officer']);
  }

  /**
   * Activates full emergency lockdown
   * @param {string} operator
   * @param {string} reason
   * @returns {{ success: boolean, message: string }}
   */
  engageLockdown(operator, reason = 'Suspected security incident') {
    if (!this.authorizedOperators.has(operator)) {
      throw new Error(`Unauthorized operator "${operator}" attempted emergency lockdown.`);
    }

    this.isLockedDown = true;
    this.lockdownReason = reason;
    this.lockdownTimestamp = new Date().toISOString();

    return {
      success: true,
      message: `Emergency lockdown ENGAGED by ${operator}. Outbound traffic halted.`,
      timestamp: this.lockdownTimestamp
    };
  }

  /**
   * Releases emergency lockdown after threat neutralization
   * @param {string} operator
   * @returns {{ success: boolean, message: string }}
   */
  disengageLockdown(operator) {
    if (!this.authorizedOperators.has(operator)) {
      throw new Error(`Unauthorized operator "${operator}" attempted to lift lockdown.`);
    }

    this.isLockedDown = false;
    this.lockdownReason = null;
    this.lockdownTimestamp = null;

    return {
      success: true,
      message: `Emergency lockdown LIFTED by ${operator}. Standard operations restored.`
    };
  }

  /**
   * Enforces lockdown check in dispatch loops
   */
  assertOperatingState() {
    if (this.isLockedDown) {
      throw new Error(`Operation Rejected: System is in EMERGENCY LOCKDOWN (${this.lockdownReason})`);
    }
    return true;
  }
}

export default new EmergencyDataLockdownSwitch();

