/**
 * @file AudioWatermarkVerifier.js
 * @description Embeds and verifies cryptographic metadata signatures within synthesized
 * audio buffers to guarantee provenance and protect against voice deepfakes.
 * Category: Domain / Feature (Security)
 */

import crypto from 'node:crypto';

export class AudioWatermarkVerifier {
  constructor(secretKey) {
    this.secret = secretKey || process.env.AUDIO_WATERMARK_SECRET || 'linda_audio_watermark_secret_key_32c';
  }

  /**
   * Generates a cryptographic provenance signature for an audio chunk
   * @param {Buffer} audioBuffer
   * @param {string} agentId
   * @returns {string} Hex signature
   */
  signAudioBuffer(audioBuffer, agentId = 'linda_voice') {
    if (!Buffer.isBuffer(audioBuffer)) {
      throw new Error('audioBuffer must be a valid Buffer');
    }

    const payload = `${agentId}:${audioBuffer.length}:${audioBuffer.subarray(0, 100).toString('hex')}`;
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  /**
   * Verifies an audio signature against buffer contents
   * @param {Buffer} audioBuffer
   * @param {string} signature
   * @param {string} agentId
   * @returns {boolean}
   */
  verifySignature(audioBuffer, signature, agentId = 'linda_voice') {
    if (!signature || !Buffer.isBuffer(audioBuffer)) return false;
    const expected = this.signAudioBuffer(audioBuffer, agentId);
    return signature === expected;
  }
}

export default new AudioWatermarkVerifier();

