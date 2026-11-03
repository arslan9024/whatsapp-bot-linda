/**
 * @file PrometheusMetricsExporter.js
 * @description Exposes standard Prometheus text-formatted operational metrics (/metrics)
 * tracking outbound messages, inbound throughput, queue lag, and error rates.
 * Category: Dev-ops / Tools
 */

export class PrometheusMetricsExporter {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.initializeDefaultMetrics();
  }

  initializeDefaultMetrics() {
    this.counters.set('linda_messages_sent_total', 0);
    this.counters.set('linda_messages_received_total', 0);
    this.counters.set('linda_errors_total', 0);
    this.gauges.set('linda_active_sessions_count', 0);
    this.gauges.set('linda_queue_depth', 0);
  }

  incrementCounter(name, delta = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + delta);
  }

  setGauge(name, value) {
    this.gauges.set(name, value);
  }

  /**
   * Generates Prometheus exposition text format
   * @returns {string} Prometheus metric lines
   */
  renderMetrics() {
    const lines = [];

    for (const [key, val] of this.counters.entries()) {
      lines.push(`# TYPE ${key} counter`);
      lines.push(`${key} ${val}`);
    }

    for (const [key, val] of this.gauges.entries()) {
      lines.push(`# TYPE ${key} gauge`);
      lines.push(`${key} ${val}`);
    }

    return lines.join('\n') + '\n';
  }
}

export default new PrometheusMetricsExporter();
