/**
 * @file Aes256FieldEncryptor.js
 * @description Provides AES-256-GCM symmetric field encryption and decryption for
 * sensitive client PII (phone numbers, passport IDs, financial bank data).
 * Category: Core
 */

import crypto from 'node:crypto';

export class Aes256FieldEncryptor {
  constructor(encryptionKeyHex) {
    // 32 bytes (256 bits) key
    const rawKey = encryptionKeyHex || process.env.PII_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    this.key = Buffer.from(rawKey, 'hex');
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypts plaintext string into an IV + AuthTag + Ciphertext hex bundle
   * @param {string} plainText
   * @returns {string} Encrypted bundle in format iv:tag:ciphertext
   */
  encrypt(plainText) {
    if (!plainText) return '';

    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts an encrypted bundle back into plaintext
   * @param {string} encryptedBundle
   * @returns {string} Plaintext
   */
  decrypt(encryptedBundle) {
    if (!encryptedBundle || !encryptedBundle.includes(':')) {
      return '';
    }

    const [ivHex, tagHex, cipherHex] = encryptedBundle.split(':');
    if (!ivHex || !tagHex || !cipherHex) {
      return '';
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export default new Aes256FieldEncryptor();

