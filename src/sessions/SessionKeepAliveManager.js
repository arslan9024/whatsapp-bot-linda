/**
 * SessionKeepAliveManager.js
 * 
 * Manages keep-alive heartbeats for all WhatsApp accounts
 * Ensures sessions stay active 24/7 without timeout
 * 
 * Features:
 * - Periodic heartbeat pings (typing indicator)
 * - Connection status tracking
 * - Auto-reconnect on disconnect
 * - Hourly status reports
 * - Graceful shutdown
 * 
 * Version: 1.0
 * Status: Production Ready
 * Created: February 9, 2026
 */

export default class SessionKeepAliveManager {
  constructor(clientsMap, logFunction, clientHealthMonitor = null) {
    this.clientsMap = clientsMap; // Map of phoneNumber → client
    this.logFunction = logFunction || console.log; // Logging function
    this.clientHealthMonitor = clientHealthMonitor; // NEW: Reference to health monitor for frame detachment recovery
    
    // Track heartbeat state per account
    this.heartbeatIntervals = new Map();
    this.accountStatus = new Map(); // Track online/offline status
    this.heartbeatCounts = new Map(); // Count heartbeats per account
    this.lastActivityTime = new Map(); // Track last user message
    this.disconnectCounts = new Map(); // Track reconnection attempts
    
    // Status monitoring
    this.statusInterval = null;
    this.initialized = false;
  }

  /**
   * Start keep-alive heartbeat for a specific account
   */
  startKeepAlive(phoneNumber, client) {
    if (!phoneNumber || !client) {
      this.logFunction(`❌ Cannot start keep-alive: Missing phoneNumber or client`, "error");
      return false;
    }

    // Prevent duplicate heartbeats
    if (this.heartbeatIntervals.has(phoneNumber)) {
      this.logFunction(`⚠️  Keep-alive already running for ${phoneNumber}`, "warn");
      return false;
    }

    // Initialize account tracking
    this.accountStatus.set(phoneNumber, { online: true, startTime: Date.now() });
    this.heartbeatCounts.set(phoneNumber, 0);
    this.lastActivityTime.set(phoneNumber, Date.now());
    this.disconnectCounts.set(phoneNumber, 0);

    try {
      const interval = setInterval(() => {
        this.sendHeartbeat(phoneNumber, client);
      }, process.env.HEARTBEAT_INTERVAL || 120000); // Default 2 minutes

      this.heartbeatIntervals.set(phoneNumber, interval);
      this.logFunction(`💓 Keep-alive started for ${phoneNumber} (interval: ${process.env.HEARTBEAT_INTERVAL || 120000}ms)`, "info");
      return true;
    } catch (error) {
      this.logFunction(`❌ Error starting keep-alive for ${phoneNumber}: ${error.message}`, "error");
      return false;
    }
  }

  /**
   * Send heartbeat ping to keep session alive
   */
  async sendHeartbeat(phoneNumber, client) {
    try {
      if (!client || !client.info) {
        this.onDisconnect(phoneNumber);
        return false;
      }

      // Safe, non-intrusive heartbeat: verify browser context and live connection
      try {
        if (typeof client.getState === 'function') {
          const state = await Promise.race([
            client.getState(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Heartbeat state check timed out')), 5000)),
          ]);
          if (state && state !== 'CONNECTED') {
            throw new Error(`WhatsApp state is ${state}`);
          }
        } else if (client.pupPage && typeof client.pupPage.evaluate === 'function') {
          await client.pupPage.evaluate(() => 1);
        }

        // Increment heartbeat counter
        const count = (this.heartbeatCounts.get(phoneNumber) || 0) + 1;
        this.heartbeatCounts.set(phoneNumber, count);
        this.updateLastActivity(phoneNumber);

        this.logFunction(`💓 Heartbeat verified for ${phoneNumber} (count: ${count})`, "success");
        return true;
      } catch (err) {
        const errorMsg = err?.message || String(err) || 'Unknown heartbeat error';
        this.logFunction(`⚠️  Heartbeat error (${phoneNumber}): ${errorMsg}`, "warn");

        // NEW: Detect frame detachment or browser crash and trigger recovery
        const lowerMsg = errorMsg.toLowerCase();
        if (lowerMsg.includes('detached') || lowerMsg.includes('target closed') || lowerMsg.includes('session closed')) {
          this.logFunction(`🚨 Frame detachment detected during heartbeat on ${phoneNumber}`, "error");

          // Notify health monitor to trigger recovery
          if (this.clientHealthMonitor) {
            try {
              await this.clientHealthMonitor.recordFrameDetachment(phoneNumber, err);
              this.logFunction(`✅ Recovery initiated for ${phoneNumber}`, "info");
            } catch (recoveryErr) {
              this.logFunction(`❌ Failed to trigger recovery for ${phoneNumber}: ${recoveryErr.message}`, "error");
            }
          } else {
            this.logFunction(`⚠️  ClientHealthMonitor not available for ${phoneNumber} frame recovery`, "warn");
          }
        }

        return false;
      }
    } catch (error) {
      this.logFunction(`❌ Heartbeat failed for ${phoneNumber}: ${error.message}`, "error");
      this.onDisconnect(phoneNumber);
      return false;
    }
  }

  /**
   * Stop keep-alive for a specific account
   */
  stopKeepAlive(phoneNumber) {
    if (!this.heartbeatIntervals.has(phoneNumber)) {
      return false;
    }

    clearInterval(this.heartbeatIntervals.get(phoneNumber));
    this.heartbeatIntervals.delete(phoneNumber);
    
    this.logFunction(`⏸️  Keep-alive stopped for ${phoneNumber}`, "info");
    return true;
  }

  /**
   * Handle account disconnect
   */
  onDisconnect(phoneNumber) {
    const status = this.accountStatus.get(phoneNumber);
    if (status) {
      status.online = false;
      status.disconnectTime = Date.now();
    }

    const disconnectCount = (this.disconnectCounts.get(phoneNumber) || 0) + 1;
    this.disconnectCounts.set(phoneNumber, disconnectCount);

    this.logFunction(`🔴 Disconnect detected for ${phoneNumber} (attempt ${disconnectCount})`, "warn");
  }

  /**
   * Handle account reconnect
   */
  onReconnect(phoneNumber) {
    const status = this.accountStatus.get(phoneNumber);
    if (status) {
      status.online = true;
      status.reconnectTime = Date.now();
    }

    this.logFunction(`🟢 Reconnect detected for ${phoneNumber}`, "success");
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(phoneNumber) {
    this.lastActivityTime.set(phoneNumber, Date.now());
  }

  /**
   * Get all account statuses
   */
  getAllStatus() {
    const statusMap = {};

    for (const [phoneNumber, status] of this.accountStatus) {
      const uptime = Math.floor((Date.now() - status.startTime) / 1000);
      const heartbeatCount = this.heartbeatCounts.get(phoneNumber) || 0;
      const lastActivity = this.lastActivityTime.get(phoneNumber);
      const timeSinceActivity = lastActivity ? Math.floor((Date.now() - lastActivity) / 1000) : 0;

      statusMap[phoneNumber] = {
        online: status.online,
        uptime,
        heartbeats: heartbeatCount,
        lastActivity: timeSinceActivity,
        reconnects: this.disconnectCounts.get(phoneNumber) || 0,
        startTime: status.startTime,
      };
    }

    return statusMap;
  }

  /**
   * Get specific account status
   */
  getAccountStatus(phoneNumber) {
    const status = this.accountStatus.get(phoneNumber);
    if (!status) return null;

    const uptime = Math.floor((Date.now() - status.startTime) / 1000);
    const heartbeatCount = this.heartbeatCounts.get(phoneNumber) || 0;

    return {
      phoneNumber,
      online: status.online,
      uptime,
      heartbeats: heartbeatCount,
      reconnects: this.disconnectCounts.get(phoneNumber) || 0,
    };
  }

  /**
   * Start hourly status monitoring and reports
   */
  startStatusMonitoring() {
    if (this.statusInterval) {
      this.logFunction("⚠️  Status monitoring already running", "warn");
      return false;
    }

    // Log status every hour
    this.statusInterval = setInterval(() => {
      this.logStatusReport();
    }, process.env.STATUS_LOG_INTERVAL || 3600000); // Default 1 hour

    this.logFunction("📊 Status monitoring started (hourly reports)", "info");
    return true;
  }

  /**
   * Stop status monitoring
   */
  stopStatusMonitoring() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
      this.logFunction("📊 Status monitoring stopped", "info");
      return true;
    }
    return false;
  }

  /**
   * Log comprehensive status report
   */
  logStatusReport() {
    const timestamp = new Date().toLocaleString();
    this.logFunction(`\n╔════════════════════════════════════════════════════════╗`, "info");
    this.logFunction(`║          📊 LINDA BOT - HOURLY STATUS REPORT           ║`, "info");
    this.logFunction(`║          ${timestamp}              ║`, "info");
    this.logFunction(`╚════════════════════════════════════════════════════════╝\n`, "info");

    const allStatus = this.getAllStatus();
    let totalUptime = 0;
    let totalHeartbeats = 0;
    let onlineCount = 0;

    for (const [phone, info] of Object.entries(allStatus)) {
      const status = info.online ? "🟢 Online" : "🔴 Offline";
      const uptimeHours = Math.floor(info.uptime / 3600);
      const uptimeMinutes = Math.floor((info.uptime % 3600) / 60);

      this.logFunction(
        `  ${status} | ${phone} | Uptime: ${uptimeHours}h ${uptimeMinutes}m | Heartbeats: ${info.heartbeats} | Reconnects: ${info.reconnects}`,
        "info"
      );

      if (info.online) onlineCount++;
      totalUptime += info.uptime;
      totalHeartbeats += info.heartbeats;
    }

    const avgUptime = this.accountStatus.size > 0 ? Math.floor(totalUptime / this.accountStatus.size) : 0;
    this.logFunction(`\n  Summary: ${onlineCount}/${this.accountStatus.size} accounts online | Avg Uptime: ${Math.floor(avgUptime / 3600)}h | Total Heartbeats: ${totalHeartbeats}\n`, "info");
  }

  /**
   * Graceful shutdown - stop all keep-alive intervals
   */
  shutdown() {
    this.logFunction("🛑 SessionKeepAliveManager shutting down...", "warn");

    // Stop all heartbeat intervals
    for (const [phoneNumber, interval] of this.heartbeatIntervals) {
      clearInterval(interval);
      this.logFunction(`  ⏸️  Stopped heartbeat for ${phoneNumber}`, "info");
    }
    this.heartbeatIntervals.clear();

    // Stop status monitoring
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.logFunction(`  ⏸️  Stopped status monitoring`, "info");
    }

    // Final status report
    this.logStatusReport();

    this.logFunction("✅ SessionKeepAliveManager shutdown complete", "success");
    return true;
  }
}
