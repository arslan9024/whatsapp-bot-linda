/**
 * @file CloudStorageTranscriptArchiver.js
 * @description Cold storage archival manager for chat transcripts and media metadata.
 * Bundles inactive historical sessions into partitioned archive packages for S3/GCS.
 * Category: Integrations
 */

export class CloudStorageTranscriptArchiver {
  constructor(config = {}) {
    this.retentionDays = config.retentionDays || 90;
    this.storageBucket = config.storageBucket || 'bot-linda-cold-transcripts';
    this.provider = config.provider || 'gcs'; // 's3' | 'gcs'
  }

  /**
   * Filters sessions eligible for cold archival based on retention threshold
   * @param {Array<{sessionId: string, lastActiveAt: string|Date, messages: Array}>} sessions
   * @returns {Array<Object>} Eligible sessions
   */
  filterSessionsForArchival(sessions = []) {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);

    return sessions.filter((s) => {
      const lastActive = new Date(s.lastActiveAt);
      return lastActive < cutoffDate;
    });
  }

  /**
   * Bundles a collection of sessions into a cold storage manifest payload
   * @param {Array<Object>} sessions
   * @returns {Object} Archival bundle package
   */
  createArchivalPackage(sessions = []) {
    const batchId = `cold_arc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const partitionKey = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const destinationPath = `archives/${partitionKey}/${batchId}.json.gz`;

    let totalMessages = 0;
    const serializedSessions = sessions.map((s) => {
      const msgCount = (s.messages || []).length;
      totalMessages += msgCount;
      return {
        sessionId: s.sessionId,
        messageCount: msgCount,
        lastActiveAt: s.lastActiveAt,
        data: s.messages || []
      };
    });

    return {
      batchId,
      provider: this.provider,
      bucket: this.storageBucket,
      destinationKey: destinationPath,
      sessionCount: sessions.length,
      totalMessages,
      createdAt: now.toISOString(),
      payloadSizeEstimateBytes: JSON.stringify(serializedSessions).length,
      payload: serializedSessions
    };
  }
}

export default new CloudStorageTranscriptArchiver();

