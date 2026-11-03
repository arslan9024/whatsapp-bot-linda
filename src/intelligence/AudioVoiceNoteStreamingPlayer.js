/**
 * @file AudioVoiceNoteStreamingPlayer.js
 * @description Prepares and validates incoming OGG/Opus WhatsApp voice notes for in-browser
 * audio playback streaming in the Web UI conversation history panel.
 * Category: Intelligence
 */

export class AudioVoiceNoteStreamingPlayer {
  constructor(config = {}) {
    this.supportedMimeTypes = ['audio/ogg; codecs=opus', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    this.maxStreamSizeBytes = config.maxStreamSizeBytes || 25 * 1024 * 1024; // 25MB
  }

  /**
   * Prepares audio buffer for streaming response
   * @param {Buffer} audioBuffer
   * @param {string} mimeType
   * @returns {{ canStream: boolean, headers: Object, sizeBytes: number }}
   */
  prepareAudioStream(audioBuffer, mimeType = 'audio/ogg; codecs=opus') {
    if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
      return { canStream: false, headers: {}, sizeBytes: 0 };
    }

    if (audioBuffer.length > this.maxStreamSizeBytes) {
      return { canStream: false, headers: {}, sizeBytes: audioBuffer.length };
    }

    const cleanMime = this.supportedMimeTypes.includes(mimeType) ? mimeType : 'audio/ogg';

    return {
      canStream: true,
      sizeBytes: audioBuffer.length,
      headers: {
        'Content-Type': cleanMime,
        'Content-Length': audioBuffer.length,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400'
      }
    };
  }
}

export default new AudioVoiceNoteStreamingPlayer();
