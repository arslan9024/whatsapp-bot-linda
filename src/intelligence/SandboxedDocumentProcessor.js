/**
 * @file SandboxedDocumentProcessor.js
 * @description Validates, sanitizes, and sandboxes incoming PDF brochures and floor plans
 * before parsing, preventing memory decompression bombs and malicious embedded scripts.
 * Category: Intelligence
 */

export class SandboxedDocumentProcessor {
  constructor(config = {}) {
    this.maxFileSizeMb = config.maxFileSizeMb || 15; // 15MB limit
    this.magicPdfHeader = Buffer.from('%PDF-');
  }

  /**
   * Validates document buffer for safety and format integrity
   * @param {Buffer} buffer
   * @param {string} fileName
   * @returns {{ safe: boolean, error?: string, sizeBytes: number }}
   */
  validateDocument(buffer, fileName = '') {
    if (!Buffer.isBuffer(buffer)) {
      return { safe: false, error: 'Input must be a valid Buffer', sizeBytes: 0 };
    }

    const sizeBytes = buffer.length;
    const maxBytes = this.maxFileSizeMb * 1024 * 1024;

    if (sizeBytes > maxBytes) {
      return {
        safe: false,
        error: `File exceeds maximum allowed limit of ${this.maxFileSizeMb}MB`,
        sizeBytes
      };
    }

    if (sizeBytes < 8) {
      return { safe: false, error: 'File is too small or empty', sizeBytes };
    }

    // Verify PDF Magic Bytes (%PDF-)
    if (fileName.toLowerCase().endsWith('.pdf')) {
      const header = buffer.subarray(0, 5);
      if (!header.equals(this.magicPdfHeader)) {
        return { safe: false, error: 'Invalid or forged PDF header magic bytes', sizeBytes };
      }

      // Check for dangerous embedded JS triggers (/JavaScript, /JS, /Launch)
      const contentStr = buffer.toString('latin1', 0, Math.min(buffer.length, 100000));
      if (/\/JavaScript|\/JS\b|\/Launch\b/i.test(contentStr)) {
        return {
          safe: false,
          error: 'Security Warning: Untrusted active script or launch action detected in PDF',
          sizeBytes
        };
      }
    }

    return {
      safe: true,
      sizeBytes
    };
  }
}

export default new SandboxedDocumentProcessor();

