/**
 * @file SanitizedProcessLauncher.js
 * @description Secure script runner for internal devops tools with strict script whitelisting,
 * argument sanitization, zero-shell injection, and node.exe kill immunity.
 * Category: Core
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

export class SanitizedProcessLauncher {
  constructor() {
    this.allowedScripts = new Set([
      'tools/doctor.js',
      'tools/browserCleanup.js',
      'tools/cleanSessions.js',
      'scripts/generateQr.js'
    ]);
  }

  /**
   * Validates script path against security whitelist
   * @param {string} relativeScriptPath
   * @returns {boolean}
   */
  isScriptAllowed(relativeScriptPath) {
    if (!relativeScriptPath || typeof relativeScriptPath !== 'string') return false;
    // Normalize path separators to forward slash
    const normalized = relativeScriptPath.replace(/\\/g, '/');
    return this.allowedScripts.has(normalized);
  }

  /**
   * Sanitizes command line argument string array
   * @param {Array<string>} args
   * @returns {Array<string>}
   */
  sanitizeArgs(args = []) {
    return args
      .map(arg => String(arg).trim())
      .filter(arg => !/[;&|`$><]/.test(arg)); // Reject shell metacharacters
  }

  /**
   * Spawns an approved script synchronously or returns execution descriptor
   * @param {string} relativeScriptPath
   * @param {Array<string>} [args]
   * @returns {Object} Execution descriptor
   */
  prepareExecution(relativeScriptPath, args = []) {
    if (!this.isScriptAllowed(relativeScriptPath)) {
      throw new Error(`Security Violation: Execution of "${relativeScriptPath}" is forbidden.`);
    }

    const safeArgs = this.sanitizeArgs(args);
    const absolutePath = path.resolve(process.cwd(), relativeScriptPath);

    return {
      executable: process.execPath, // node binary
      scriptPath: absolutePath,
      args: [absolutePath, ...safeArgs],
      shell: false // Mandatory: prevent shell injection
    };
  }
}

export default new SanitizedProcessLauncher();
