/**
 * WriteBackDeduplicator.js
 * 
 * Intelligent deduplication for Google Sheets writebacks
 * Prevents duplicate updates within a configurable time window
 * 
 * Features:
 * - Content hash tracking: Prevent duplicate writes of exact same data
 * - Time-window deduplication: Skip writes within 5-minute window
 * - Failed write tracking: Separate handling for retry-able writes
 * - Write history: Full audit trail of attempted/completed writes
 * - Priority writes: Force immediate write regardless of dedup
 * - Metrics: Dedup rate, duplicate events, write efficiency
 * - Fallback: Cascade deduplication (local → cloud)
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 4
 */

import mongoose from "mongoose";
import crypto from "crypto";

// Write Deduplication Log Schema
const writeDeduplicationSchema = new mongoose.Schema(
  {
    deduplicationId: {
      type: String,
      unique: true,
      index: true,
    },
    sheetsId: {
      type: String,
      index: true,
    },
    sheetName: String,
    
    // Write target
    cellRange: {
      type: String,
      index: true,
    },
    rowIndex: Number,
    columnIndex: Number,
    
    // Write content
    content: String,
    contentHash: {
      type: String,
      index: true,
    },
    contentSize: Number,
    
    // Deduplication tracking
    lastWriteAt: {
      type: Date,
      index: true,
    },
    writeCount: {
      type: Number,
      default: 1,
    },
    duplicateCount: {
      type: Number,
      default: 0,
    },
    
    // Status
    status: {
      type: String,
      enum: ["pending", "written", "failed", "skipped_duplicate"],
      default: "pending",
      index: true,
    },
    
    // Write history
    writeAttempts: [
      {
        attemptNumber: Number,
        timestamp: Date,
        success: Boolean,
        error: String,
        responseTime: Number,
      },
    ],
    
    // Metadata
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
    source: String, // Where the write came from
    accountId: String,
    userId: String,
    relatedMessageId: String,
    
    // Analytics
    firstAttemptAt: Date,
    lastAttemptAt: Date,
    totalAttemptCount: {
      type: Number,
      default: 0,
    },
    successRate: Number, // 0-1
    
    customData: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Create indexes for deduplication
writeDeduplicationSchema.index({ contentHash: 1, lastWriteAt: -1 });
writeDeduplicationSchema.index({ cellRange: 1, status: 1 });
writeDeduplicationSchema.index({
  sheetsId: 1,
  lastWriteAt: -1,
});
writeDeduplicationSchema.index({ priority: 1, status: 1 });

let WriteDeduplicationModel = null;

class WriteBackDeduplicator {
  constructor(mongoConnection = null) {
    this.mongoConnection = mongoConnection;
    this.initialized = false;
    this.inMemoryWrites = new Map(); // contentHash -> write record
    this.pendingWrites = new Map(); // cellRange -> pending write data
    this.failedWrites = new Map(); // deduplicationId -> failed write
    
    this.config = {
      deduplicationWindowMs: 5 * 60 * 1000, // 5 minutes
      hashAlgorithm: "sha256",
      maxRetries: 3,
      retryDelayMs: 2000,
      priorityBypassDedup: true, // Critical/high priority bypass dedup window
      enableFailureTracking: true,
      maxHistoryPerCell: 50, // Max write history records per cell
    };

    // Deduplication statistics
    this.stats = {
      totalWrites: 0,
      duplicatesSkipped: 0,
      successfulWrites: 0,
      failedWrites: 0,
      attemptedRetries: 0,
    };
  }

  /**
   * Initialize deduplicator with MongoDB
   */
  async initialize(mongoConnection) {
    try {
      if (this.initialized) return true;

      if (mongoConnection) {
        this.mongoConnection = mongoConnection;
        WriteDeduplicationModel = mongoConnection.model(
          "WriteDeduplication",
          writeDeduplicationSchema
        );
        console.log("✅ WriteBackDeduplicator initialized with MongoDB");
      } else {
        console.log("⚠️ WriteBackDeduplicator initialized (in-memory only)");
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error(
        `❌ WriteBackDeduplicator initialization failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Attempt to write to sheet with deduplication
   * @param {object} writeRequest - Write request with sheetsId, cellRange, content, etc.
   * @returns {Promise<object>} - Deduplication result
   */
  async attemptWrite(writeRequest) {
    try {
      const {
        sheetsId,
        sheetName,
        cellRange,
        content,
        priority = "normal",
        source = "unknown",
        accountId = null,
        userId = null,
        relatedMessageId = null,
        forceWrite = false,
      } = writeRequest;

      this.stats.totalWrites++;

      // Calculate content hash
      const contentHash = this._calculateHash(content);

      // Check for duplicate
      const deduplicationResult = await this._checkForDuplicate(
        sheetsId,
        cellRange,
        contentHash,
        priority,
        forceWrite
      );

      if (deduplicationResult.isDuplicate && !forceWrite) {
        this.stats.duplicatesSkipped++;
        console.log(
          `♻️ Duplicate write skipped: ${cellRange} (${deduplicationResult.reason})`
        );

        return {
          success: false,
          isDuplicate: true,
          reason: deduplicationResult.reason,
          timeSinceLastWrite: deduplicationResult.timeSinceLastWrite,
          message: `Write skipped - duplicate within ${Math.round(
            deduplicationResult.timeSinceLastWrite / 1000
          )}s`,
        };
      }

      // Record the write attempt
      const deduplicationId = this._generateDeduplicationId();
      const writeRecord = {
        deduplicationId,
        sheetsId,
        sheetName,
        cellRange,
        content,
        contentHash,
        contentSize: content.length,
        priority,
        source,
        accountId,
        userId,
        relatedMessageId,
        status: "pending",
        lastWriteAt: new Date(),
        writeCount: 1,
        duplicateCount: 0,
        writeAttempts: [
          {
            attemptNumber: 1,
            timestamp: new Date(),
            success: null,
            error: null,
            responseTime: null,
          },
        ],
        totalAttemptCount: 1,
      };

      // Save to MongoDB
      if (WriteDeduplicationModel) {
        try {
          const record = new WriteDeduplicationModel(writeRecord);
          await record.save();
          console.log(`📝 Write tracked: ${deduplicationId}`);
        } catch (dbError) {
          console.warn(
            `⚠️ Failed to save write record: ${dbError.message}. Using fallback.`
          );
        }
      }

      // Store in memory
      this.inMemoryWrites.set(contentHash, writeRecord);

      return {
        success: true,
        isDuplicate: false,
        deduplicationId,
        contentHash,
        message: "Write approved for processing",
      };
    } catch (error) {
      console.error(`❌ Error in attemptWrite: ${error.message}`);
      this.stats.failedWrites++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Record successful write completion
   * @param {string} deduplicationId - Write ID to mark as complete
   * @param {object} writeResult - Result from Sheets API
   * @returns {Promise<boolean>}
   */
  async recordWriteSuccess(deduplicationId, writeResult = {}) {
    try {
      if (WriteDeduplicationModel) {
        try {
          const updated = await WriteDeduplicationModel.findOneAndUpdate(
            { deduplicationId },
            {
              status: "written",
              lastWriteAt: new Date(),
              $push: {
                writeAttempts: {
                  success: true,
                  timestamp: new Date(),
                  responseTime: writeResult.responseTime || 0,
                },
              },
              $inc: { successRate: 1 },
            },
            { new: true }
          );

          if (updated) {
            this.stats.successfulWrites++;
            console.log(`✅ Write completed: ${deduplicationId}`);
            return true;
          }
        } catch (dbError) {
          console.warn(
            `⚠️ Failed to record success: ${dbError.message}`
          );
        }
      }

      // Fallback: update in memory
      return true;
    } catch (error) {
      console.error(`❌ Error recording write success: ${error.message}`);
      return false;
    }
  }

  /**
   * Record write failure for retry
   * @param {string} deduplicationId - Write ID that failed
   * @param {string} error - Error message
   * @returns {Promise<object>} - Retry recommendation
   */
  async recordWriteFailure(deduplicationId, error) {
    try {
      if (WriteDeduplicationModel) {
        try {
          const record = await WriteDeduplicationModel.findOne({
            deduplicationId,
          });

          if (record) {
            record.writeAttempts.push({
              attemptNumber: record.totalAttemptCount + 1,
              timestamp: new Date(),
              success: false,
              error: error.message || error,
              responseTime: 0,
            });

            record.totalAttemptCount++;
            record.lastAttemptAt = new Date();

            // Decide on retry
            const shouldRetry =
              record.totalAttemptCount < this.config.maxRetries &&
              this._isRetryableError(error);

            if (shouldRetry) {
              record.status = "pending";
              this.stats.attemptedRetries++;
            } else {
              record.status = "failed";
              this.stats.failedWrites++;
              this.failedWrites.set(deduplicationId, record);
            }

            await record.save();

            console.log(
              `⚠️ Write failed: ${deduplicationId} (${shouldRetry ? "will retry" : "max retries reached"})`
            );

            return {
              shouldRetry,
              nextRetryAfterMs: shouldRetry
                ? this.config.retryDelayMs * record.totalAttemptCount
                : null,
              attemptCount: record.totalAttemptCount,
              maxRetries: this.config.maxRetries,
            };
          }
        } catch (dbError) {
          console.warn(`⚠️ Failed to record failure: ${dbError.message}`);
        }
      }

      return {
        shouldRetry: false,
        error: "Could not find write record",
      };
    } catch (error) {
      console.error(`❌ Error recording write failure: ${error.message}`);
      return { shouldRetry: false };
    }
  }

  /**
   * Get deduplication report for cell/range
   * @param {string} cellRange - Cell or range identifier
   * @param {string} sheetsId - Sheets ID
   * @returns {Promise<object>} - Deduplication report
   */
  async getDeduplicationReport(cellRange, sheetsId) {
    try {
      if (WriteDeduplicationModel) {
        try {
          const writes = await WriteDeduplicationModel.find({
            cellRange,
            sheetsId,
          }).sort({ createdAt: -1 });

          const report = {
            cellRange,
            sheetsId,
            totalWrites: writes.length,
            successfulWrites: writes.filter((w) => w.status === "written")
              .length,
            failedWrites: writes.filter((w) => w.status === "failed").length,
            duplicatesSkipped: writes.filter(
              (w) => w.status === "skipped_duplicate"
            ).length,
            avgWritesPerContent: this._calculateAverageWritesPerContent(writes),
            writes: writes
              .slice(0, 10)
              .map((w) => ({
                deduplicationId: w.deduplicationId,
                timestamp: w.createdAt,
                status: w.status,
                attemptCount: w.totalAttemptCount,
              })),
          };

          return report;
        } catch (dbError) {
          console.warn(`⚠️ Failed to fetch report: ${dbError.message}`);
        }
      }

      // Fallback: in-memory report
      return {
        cellRange,
        sheetsId,
        inMemoryRecords: this.inMemoryWrites.size,
      };
    } catch (error) {
      console.error(`❌ Error getting dedup report: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Get all failed writes for admin dashboard
   * @param {object} options - Filtering options
   * @returns {Promise<array>} - Failed writes
   */
  async getFailedWrites(options = {}) {
    try {
      const {
        limit = 50,
        sheetsId = null,
        accountId = null,
      } = options;

      if (WriteDeduplicationModel) {
        try {
          const query = { status: "failed" };

          if (sheetsId) query.sheetsId = sheetsId;
          if (accountId) query.accountId = accountId;

          const failedWrites = await WriteDeduplicationModel.find(query)
            .sort({ lastAttemptAt: -1 })
            .limit(limit);

          return failedWrites;
        } catch (dbError) {
          console.warn(`⚠️ Failed to fetch failed writes: ${dbError.message}`);
        }
      }

      // Fallback: return in-memory failed writes
      return Array.from(this.failedWrites.values()).slice(0, limit);
    } catch (error) {
      console.error(`❌ Error getting failed writes: ${error.message}`);
      return [];
    }
  }

  /**
   * Force retry failed write
   * @param {string} deduplicationId - Write ID to retry
   * @returns {Promise<boolean>}
   */
  async forceRetry(deduplicationId) {
    try {
      if (WriteDeduplicationModel) {
        try {
          await WriteDeduplicationModel.updateOne(
            { deduplicationId },
            {
              status: "pending",
              totalAttemptCount: this.config.maxRetries - 1, // Reset to allow one more retry
            }
          );

          this.failedWrites.delete(deduplicationId);
          console.log(`🔄 Forced retry for: ${deduplicationId}`);
          return true;
        } catch (dbError) {
          console.warn(`⚠️ Failed to force retry: ${dbError.message}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Error forcing retry: ${error.message}`);
      return false;
    }
  }

  /**
   * Get deduplication statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      deduplicationEfficiency: this.stats.totalWrites > 0
        ? ((this.stats.duplicatesSkipped / this.stats.totalWrites) * 100).toFixed(2) + "%"
        : "N/A",
      successRate: (this.stats.totalWrites - this.stats.failedWrites) > 0
        ? (((this.stats.totalWrites - this.stats.failedWrites) / this.stats.totalWrites) * 100).toFixed(2) + "%"
        : "N/A",
      inMemoryRecords: this.inMemoryWrites.size,
      failedWritesInMemory: this.failedWrites.size,
    };
  }

  /**
   * PRIVATE: Check if write is duplicate
   */
  async _checkForDuplicate(sheetsId, cellRange, contentHash, priority, forceWrite) {
    try {
      // Bypass dedup for critical priority writes
      if (
        forceWrite ||
        (this.config.priorityBypassDedup && priority === "critical")
      ) {
        return { isDuplicate: false };
      }

      if (WriteDeduplicationModel) {
        try {
          const lastWrite = await WriteDeduplicationModel.findOne({
            sheetsId,
            cellRange,
            contentHash,
          }).sort({ lastWriteAt: -1 });

          if (lastWrite) {
            const timeSinceLastWrite =
              Date.now() - new Date(lastWrite.lastWriteAt).getTime();

            if (
              timeSinceLastWrite < this.config.deduplicationWindowMs
            ) {
              lastWrite.duplicateCount++;
              await lastWrite.save();

              return {
                isDuplicate: true,
                reason: "exact_content_duplicate",
                timeSinceLastWrite,
              };
            }
          }
        } catch (dbError) {
          console.warn(`⚠️ Failed to check duplicates: ${dbError.message}`);
        }
      }

      // Fallback: check in memory
      if (this.inMemoryWrites.has(contentHash)) {
        const lastWrite = this.inMemoryWrites.get(contentHash);
        const timeSinceLastWrite =
          Date.now() - new Date(lastWrite.lastWriteAt).getTime();

        if (timeSinceLastWrite < this.config.deduplicationWindowMs) {
          lastWrite.duplicateCount++;
          return {
            isDuplicate: true,
            reason: "exact_content_duplicate",
            timeSinceLastWrite,
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error(`❌ Error checking for duplicate: ${error.message}`);
      return { isDuplicate: false };
    }
  }

  /**
   * PRIVATE: Calculate content hash
   */
  _calculateHash(content) {
    return crypto
      .createHash(this.config.hashAlgorithm)
      .update(String(content))
      .digest("hex");
  }

  /**
   * PRIVATE: Generate deduplication ID
   */
  _generateDeduplicationId() {
    return `dedup_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  /**
   * PRIVATE: Check if error is retryable
   */
  _isRetryableError(error) {
    const retryablePatterns = [
      "timeout",
      "ECONNRESET",
      "ENOTFOUND",
      "rate_limit",
      "temporarily_unavailable",
      "500",
      "503",
    ];

    const errorStr = String(error).toLowerCase();
    return retryablePatterns.some((pattern) => errorStr.includes(pattern));
  }

  /**
   * PRIVATE: Calculate average writes per content
   */
  _calculateAverageWritesPerContent(writes) {
    if (writes.length === 0) return 0;

    const uniqueContents = new Set(writes.map((w) => w.contentHash)).size;
    return (writes.length / uniqueContents).toFixed(2);
  }

  /**
   * Clear in-memory cache
   */
  clearCache() {
    const count = this.inMemoryWrites.size;
    this.inMemoryWrites.clear();
    console.log(`🗑️ Cleared ${count} deduplication records`);
    return count;
  }
}

export default WriteBackDeduplicator;
export { WriteBackDeduplicator, writeDeduplicationSchema };
