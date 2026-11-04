/**
 * @file HealthcheckPingRouter.js
 * @description Exposes lightweight /health and /ready endpoints for Docker, Kubernetes,
 * and external uptime monitors (UptimeRobot, BetterUptime) without waking Puppeteer.
 * Category: Dev-ops / Tools
 */

export class HealthcheckPingRouter {
  constructor(startTime = Date.now()) {
    this.startTime = startTime;
  }

  /**
   * Generates health status snapshot
   * @param {Object} [state]
   * @param {number} [state.connectedAccounts]
   * @param {boolean} [state.dbConnected]
   * @returns {Object} JSON health payload
   */
  getHealthReport(state = {}) {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const dbOk = state.dbConnected ?? true;

    return {
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: uptimeSec,
      version: '1.0.0',
      checks: {
        database: dbOk ? 'UP' : 'DOWN',
        activeAccounts: state.connectedAccounts ?? 1
      }
    };
  }

  /**
   * Express middleware router handler
   */
  handleRequest(state = {}) {
    return (req, res) => {
      const report = this.getHealthReport(state);
      const code = report.status === 'healthy' ? 200 : 503;
      res.status(code).json(report);
    };
  }
}

export default new HealthcheckPingRouter();

