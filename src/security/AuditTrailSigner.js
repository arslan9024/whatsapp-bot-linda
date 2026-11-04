/**
 * @file AuditTrailSigner.js
 * @description Cryptographically signs administrative and automated audit log entries
 * using HMAC-SHA256 hash chains, providing tamper-evident forensic records.
 * Category: Domain / Feature (Security)
 */

import crypto from 'node:crypto';

export class AuditTrailSigner {
  constructor(signingSecret) {
    this.secret = signingSecret || process.env.AUDIT_SIGNING_SECRET || 'linda_immutable_audit_secret_key';
    this.lastHash = 'GENESIS_BLOCK_HASH_0000000000000000';
    this.chain = [];
  }

  /**
   * Computes HMAC-SHA256 hash for record bundle
   * @param {Object} record
   * @param {string} prevHash
   * @returns {string}
   */
  computeHash(record, prevHash) {
    const serialized = JSON.stringify(record) + prevHash;
    return crypto.createHmac('sha256', this.secret).update(serialized).digest('hex');
  }

  /**
   * Appends and signs a new audit entry into the immutable chain
   * @param {Object} actionData
   * @param {string} actionData.actor - 'system' | 'admin_user' | 'agent_id'
   * @param {string} actionData.action - e.g. 'CONFIG_CHANGE', 'RIGHT_TO_ERASURE', 'BROADCAST_TRIGGERED'
   * @param {Object} [actionData.details]
   * @returns {Object} Signed audit block
   */
  recordAction(actionData) {
    const timestamp = new Date().toISOString();
    const entry = {
      index: this.chain.length,
      timestamp,
      actor: actionData.actor || 'system',
      action: actionData.action,
      details: actionData.details || {},
      prevHash: this.lastHash
    };

    const signature = this.computeHash(entry, this.lastHash);
    const block = { ...entry, signature };

    this.chain.push(block);
    this.lastHash = signature;

    return block;
  }

  /**
   * Verifies the entire cryptographic integrity of the audit chain
   * @returns {{ intact: boolean, verifiedEntries: number, brokenAt?: number }}
   */
  verifyChainIntegrity() {
    let currentPrev = 'GENESIS_BLOCK_HASH_0000000000000000';

    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      if (block.prevHash !== currentPrev) {
        return { intact: false, verifiedEntries: i, brokenAt: i };
      }

      const { signature, ...entryWithoutSig } = block;
      const expected = this.computeHash(entryWithoutSig, currentPrev);

      if (signature !== expected) {
        return { intact: false, verifiedEntries: i, brokenAt: i };
      }

      currentPrev = signature;
    }

    return { intact: true, verifiedEntries: this.chain.length };
  }
}

export default new AuditTrailSigner();

