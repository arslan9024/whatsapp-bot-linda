/**
 * @file TamperEvidentSessionLocker.js
 * @description Computes and validates SHA-256 integrity manifests of the sessions/ directory
 * to prevent unauthorized session injection, cloning, or external tampering.
 * Category: Domain / Feature (Security)
 */

import crypto from 'node:crypto';

export class TamperEvidentSessionLocker {
  constructor() {
    this.sessionManifests = new Map(); // sessionKey -> { hash, timestamp, fileCount }
  }

  /**
   * Generates a composite hash for a list of session file descriptors
   * @param {Array<{ path: string, size: number, mtime: number }>} files
   * @returns {string} SHA-256 hash
   */
  computeSessionDigest(files = []) {
    const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
    const payload = sorted.map(f => `${f.path}:${f.size}:${f.mtime}`).join('|');
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Locks and registers baseline checksum of a session directory
   * @param {string} sessionName
   * @param {Array<Object>} files
   * @returns {string} Registered digest
   */
  registerSessionBaseline(sessionName, files = []) {
    const digest = this.computeSessionDigest(files);
    this.sessionManifests.set(sessionName, {
      digest,
      timestamp: Date.now(),
      fileCount: files.length
    });
    return digest;
  }

  /**
   * Verifies current session files against the registered baseline
   * @param {string} sessionName
   * @param {Array<Object>} currentFiles
   * @returns {{ intact: boolean, reason?: string }}
   */
  verifySessionIntegrity(sessionName, currentFiles = []) {
    const baseline = this.sessionManifests.get(sessionName);
    if (!baseline) {
      return { intact: true, reason: 'No baseline registered yet' };
    }

    const currentDigest = this.computeSessionDigest(currentFiles);
    if (currentDigest !== baseline.digest) {
      return {
        intact: false,
        reason: `Session "${sessionName}" manifest divergence detected. Baseline: ${baseline.digest.slice(0, 8)}, Current: ${currentDigest.slice(0, 8)}`
      };
    }

    return { intact: true };
  }
}

export default new TamperEvidentSessionLocker();

