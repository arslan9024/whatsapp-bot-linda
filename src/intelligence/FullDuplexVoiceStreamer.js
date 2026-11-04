/**
 * @file FullDuplexVoiceStreamer.js
 * @description Manages low-latency (<500ms) full-duplex conversational voice streaming,
 * allowing natural interruptions (barge-in) and continuous bi-directional voice chunks.
 * Category: Intelligence
 */

export class FullDuplexVoiceStreamer {
  constructor(config = {}) {
    this.chunkIntervalMs = config.chunkIntervalMs || 250;
    this.interruptionThresholdDb = config.interruptionThresholdDb || -25;
    this.activeStreams = new Map(); // streamId -> streamSession
  }

  /**
   * Initializes a full-duplex conversational voice session
   * @param {string} sessionId
   * @param {Object} [options]
   * @returns {Object} Stream session descriptor
   */
  openStream(sessionId, options = {}) {
    const session = {
      sessionId,
      isSpeaking: false,
      isListening: true,
      lastBargeInAt: null,
      bufferChunks: [],
      options
    };
    this.activeStreams.set(sessionId, session);
    return session;
  }

  /**
   * Evaluates incoming audio energy to detect client barge-in / interruption
   * @param {string} sessionId
   * @param {number} inputDbLevel
   * @returns {{ interrupted: boolean, reason?: string }}
   */
  processAudioChunk(sessionId, inputDbLevel) {
    const session = this.activeStreams.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.isSpeaking && inputDbLevel > this.interruptionThresholdDb) {
      session.isSpeaking = false;
      session.lastBargeInAt = Date.now();
      return {
        interrupted: true,
        reason: 'User voice activity detected; bot playback aborted'
      };
    }

    return { interrupted: false };
  }

  /**
   * Closes active stream session
   * @param {string} sessionId
   */
  closeStream(sessionId) {
    return this.activeStreams.delete(sessionId);
  }
}

export default new FullDuplexVoiceStreamer();
