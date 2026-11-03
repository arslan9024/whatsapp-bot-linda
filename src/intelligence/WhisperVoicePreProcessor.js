/**
 * WhisperVoicePreProcessor.js
 * 
 * Single responsibility: Validate, sanitize, and convert WhatsApp OGG/Opus voice notes for Whisper transcription.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class WhisperVoicePreProcessor {
  constructor({ maxDurationSeconds = 120, maxSizeBytes = 25000000 } = {}) {
    this.maxDurationSeconds = maxDurationSeconds;
    this.maxSizeBytes = maxSizeBytes;
  }

  validateAudio(buffer, mimeType = '') {
    if (!buffer || !(buffer instanceof Buffer)) {
      return { valid: false, reason: 'INVALID_BUFFER' };
    }
    if (buffer.length > this.maxSizeBytes) {
      return { valid: false, reason: 'FILE_TOO_LARGE' };
    }
    const cleanMime = (mimeType || '').toLowerCase();
    const isSupported = cleanMime.includes('audio') || cleanMime.includes('ogg') || cleanMime.includes('opus') || cleanMime.includes('mp4') || cleanMime.includes('m4a');

    if (!isSupported) {
      return { valid: false, reason: 'UNSUPPORTED_MIME' };
    }

    return {
      valid: true,
      bytes: buffer.length,
      mimeType: cleanMime,
      estimatedSeconds: Math.round(buffer.length / 4000), // ~32kbps opus estimate
    };
  }

  formatTranscriptionPayload(fileBuffer, language = 'auto') {
    const val = this.validateAudio(fileBuffer, 'audio/ogg');
    if (!val.valid) throw new Error(`Cannot format payload: ${val.reason}`);

    return {
      file: fileBuffer,
      model: 'whisper-1',
      language: language === 'auto' ? undefined : language,
      temperature: 0.2,
      response_format: 'verbose_json',
    };
  }
}

export default new WhisperVoicePreProcessor();

