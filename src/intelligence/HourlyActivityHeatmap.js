/**
 * @file HourlyActivityHeatmap.js
 * @description Compiles message dispatch and response timestamp telemetry into a 24x7
 * activity matrix powering the Web UI operations heatmap and optimal send window calculations.
 * Category: Intelligence
 */

export class HourlyActivityHeatmap {
  constructor() {
    // 7 days (0=Sun..6=Sat) x 24 hours (0..23)
    this.matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  }

  /**
   * Records an activity timestamp in the matrix
   * @param {Date|string|number} timestamp
   */
  recordEvent(timestamp = new Date()) {
    const d = new Date(timestamp);
    const day = d.getDay();
    const hour = d.getHours();
    this.matrix[day][hour]++;
  }

  /**
   * Ingests a collection of event timestamps
   * @param {Array<string|Date>} timestamps
   */
  ingestEvents(timestamps = []) {
    for (const t of timestamps) {
      this.recordEvent(t);
    }
  }

  /**
   * Identifies the peak activity hour of the week
   * @returns {{ day: number, hour: number, count: number }}
   */
  getPeakActivitySlot() {
    let max = -1;
    let peakDay = 0;
    let peakHour = 0;

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (this.matrix[day][hour] > max) {
          max = this.matrix[day][hour];
          peakDay = day;
          peakHour = hour;
        }
      }
    }

    return { day: peakDay, hour: peakHour, count: Math.max(0, max) };
  }

  /**
   * Returns full 7x24 matrix for UI charting
   * @returns {Array<Array<number>>}
   */
  getHeatmapData() {
    return this.matrix;
  }
}

export default new HourlyActivityHeatmap();

