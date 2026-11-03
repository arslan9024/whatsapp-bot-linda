/**
 * @file ProcessTelemetryAggregator.js
 * @description Aggregates time-series CPU, RSS memory, and message throughput telemetry
 * into a sliding history buffer powering real-time charts in the Next.js operations console.
 * Category: Dev-ops / Tools
 */

export class ProcessTelemetryAggregator {
  constructor(config = {}) {
    this.bufferSize = config.bufferSize || 60; // 60 data points (e.g. 1 hour at 1 min interval)
    this.history = [];
  }

  /**
   * Captures and stores current process metrics
   * @param {Object} [customMetrics]
   * @returns {Object} Appended telemetry point
   */
  captureSnapshot(customMetrics = {}) {
    const mem = process.memoryUsage();
    const point = {
      timestamp: new Date().toISOString(),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      activeQueues: customMetrics.activeQueues || 0,
      messagesPerMinute: customMetrics.messagesPerMinute || 0
    };

    this.history.push(point);
    if (this.history.length > this.bufferSize) {
      this.history.shift();
    }

    return point;
  }

  /**
   * Retrieves full buffered time-series for chart rendering
   * @returns {Array<Object>}
   */
  getTimeSeries() {
    return this.history;
  }
}

export default new ProcessTelemetryAggregator();
