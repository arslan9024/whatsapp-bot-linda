/**
 * @file SessionBackupVerifier.js
 * @description Validates integrity of session backup archives before rotation or restore,
 * verifying checksums, minimum size, and presence of critical IndexedDB/Local Storage state.
 * Category: Dev-ops / Tools
 */

import crypto from 'node:crypto';

export class SessionBackupVerifier {
  constructor(config = {}) {
    this.minValidArchiveBytes = config.minValidArchiveBytes || 50000; // ~50KB
  }

  /**
   * Verifies archive payload buffer
   * @param {Buffer} archiveBuffer
   * @param {string} expectedChecksum
   * @param {Array<string>} internalFileListing
   * @returns {{ valid: boolean, errors: Array<string>, computedChecksum: string }}
   */
  verifyArchive(archiveBuffer, expectedChecksum, internalFileListing = []) {
    const errors = [];

    if (!Buffer.isBuffer(archiveBuffer) || archiveBuffer.length < this.minValidArchiveBytes) {
      errors.push(`Archive buffer is missing or below minimum size threshold (${this.minValidArchiveBytes} bytes)`);
    }

    const computedChecksum = Buffer.isBuffer(archiveBuffer)
      ? crypto.createHash('sha256').update(archiveBuffer).digest('hex')
      : '';

    if (expectedChecksum && computedChecksum !== expectedChecksum) {
      errors.push(`Checksum mismatch: expected ${expectedChecksum.slice(0, 8)}, computed ${computedChecksum.slice(0, 8)}`);
    }

    // Check essential authentication artifacts
    const hasAuthData = internalFileListing.some(f => /IndexedDB|Local Storage|Cookies/i.test(f));
    if (internalFileListing.length > 0 && !hasAuthData) {
      errors.push('Archive lacks essential WhatsApp Web authentication records');
    }

    return {
      valid: errors.length === 0,
      errors,
      computedChecksum
    };
  }
}

export default new SessionBackupVerifier();

