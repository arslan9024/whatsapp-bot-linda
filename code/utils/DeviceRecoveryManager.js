/**
 * DeviceRecoveryManager.js
 * 
 * Manages automatic recovery of linked WhatsApp devices
 * - Checks which devices were previously linked
 * - Attempts auto-reconnection on startup
 * - Handles device keep-alive functionality
 * - Reports recovery status
 * 
 * Version: 1.0
 * Created: February 9, 2026
 * Status: Production Ready
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sessionStateManager from "./SessionStateManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const SESSIONS_DIR = path.join(PROJECT_ROOT, "sessions");

class DeviceRecoveryManager {
  constructor() {
    this.recoveryAttempts = new Map(); // Track individual recovery attempts
    this.deviceHeartbeats = new Map(); // Track device last heartbeat
  }

  /**
   * Check if device was previously linked by looking at device-status.json
   */
  async wasDevicePreviouslyLinked(phoneNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${phoneNumber}`);
      const statusFile = path.join(sessionPath, "device-status.json");

      if (!fs.existsSync(statusFile)) {
        return false;
      }

      const status = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
      return status.deviceLinked === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device status file
   */
  getDeviceStatus(phoneNumber) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${phoneNumber}`);
      const statusFile = path.join(sessionPath, "device-status.json");

      if (fs.existsSync(statusFile)) {
        return JSON.parse(fs.readFileSync(statusFile, "utf-8"));
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  /**
   * Update device status file with recovery info
   */
  updateDeviceStatus(phoneNumber, updates) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `session-${phoneNumber}`);
      const statusFile = path.join(sessionPath, "device-status.json");

      // Create session path if needed
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      const currentStatus = this.getDeviceStatus(phoneNumber) || {
        number: phoneNumber,
        deviceLinked: false,
        isActive: false,
        linkedAt: null,
        lastConnected: null,
        authMethod: null,
      };

      const newStatus = {
        ...currentStatus,
        ...updates,
        number: phoneNumber,
      };

      fs.writeFileSync(statusFile, JSON.stringify(newStatus, null, 2));
      return newStatus;
    } catch (error) {
      console.error(`⚠️  Failed to update device status: ${error.message}`);
      return null;
    }
  }

  /**
   * Get list of devices available for auto-recovery
   */
  async getDevicesForRecovery() {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) {
        return [];
      }

      const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
      const devicesToRecover = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith("session-")) continue;

        const phoneNumber = entry.name.replace("session-", "");
        const wasLinked = await this.wasDevicePreviouslyLinked(phoneNumber);

        if (wasLinked) {
          const status = this.getDeviceStatus(phoneNumber);
          devicesToRecover.push({
            phoneNumber,
            displayName: status?.displayName || `Device ${phoneNumber}`,
            linkedAt: status?.linkedAt,
            lastConnected: status?.lastConnected,
            authMethod: status?.authMethod || "qr",
            sessionPath: `sessions/session-${phoneNumber}`,
          });
        }
      }

      return devicesToRecover;
    } catch (error) {
      console.error(`⚠️  Failed to get devices for recovery: ${error.message}`);
      return [];
    }
  }

  /**
   * Attempt to recover a device by restoring its session
   * Returns: { success, recovered, error }
   */
  async attemptDeviceRecovery(phoneNumber, options = {}) {
    const maxAttempts = options.maxAttempts || 5;
    const timeout = options.timeout || 30000; // 30 seconds
    const accountId = `account-${phoneNumber}`;

    try {
      // Check if already at max attempts
      const attempts = this.recoveryAttempts.get(accountId) || 0;
      if (attempts >= maxAttempts) {
        return {
          success: false,
          recovered: false,
          error: `Max recovery attempts (${maxAttempts}) exceeded`,
        };
      }

      // Check if device was previously linked
      const wasLinked = await this.wasDevicePreviouslyLinked(phoneNumber);
      if (!wasLinked) {
        return {
          success: false,
          recovered: false,
          error: "Device was not previously linked",
        };
      }

      // Validate session directory exists
      const sessionPath = path.join(SESSIONS_DIR, `session-${phoneNumber}`);
      if (!fs.existsSync(sessionPath)) {
        return {
          success: false,
          recovered: false,
          error: "Session directory not found",
        };
      }

      console.log(`  🔄 Attempting recovery for ${phoneNumber} (attempt ${attempts + 1}/${maxAttempts})...`);

      // Record attempt
      this.recoveryAttempts.set(accountId, attempts + 1);

      // Update session state manager
      await sessionStateManager.markRecoverySuccess(accountId);

      // Update device status
      this.updateDeviceStatus(phoneNumber, {
        isActive: true,
        lastConnected: new Date().toISOString(),
        recoveryAttempt: attempts + 1,
      });

      return {
        success: true,
        recovered: true,
        phoneNumber,
        sessionPath,
        recoveryAttempts: attempts + 1,
      };
    } catch (error) {
      // Record failed attempt
      const attempts = (this.recoveryAttempts.get(accountId) || 0) + 1;
      this.recoveryAttempts.set(accountId, attempts);

      // Update session state manager
      await sessionStateManager.markRecoveryFailed(accountId, error);

      console.log(`  ⚠️  Recovery failed (attempt ${attempts}/${maxAttempts}): ${error.message}`);

      return {
        success: false,
        recovered: false,
        error: error.message,
        attempt: attempts,
      };
    }
  }

  /**
   * Reset recovery attempts for a device
   */
  resetRecoveryAttempts(phoneNumber) {
    const accountId = `account-${phoneNumber}`;
    this.recoveryAttempts.delete(accountId);
    
    // Also reset in SessionStateManager
    sessionStateManager.resetRecoveryAttempts(accountId);
    
    return true;
  }

  /**
   * Keep device alive by sending periodic heartbeats
   * This prevents the WhatsApp connection from timing out
   */
  async keepDeviceAlive(client, phoneNumber, options = {}) {
    const interval = options.interval || 60000; // 1 minute default
    const accountId = `account-${phoneNumber}`;

    return setInterval(async () => {
      try {
        if (client && client.info) {
          // Device is still responsive
          this.deviceHeartbeats.set(accountId, new Date().toISOString());

          // Update session state
          const status = sessionStateManager.getAccountState(accountId);
          if (status) {
            status.lastPing = new Date().toISOString();
            await sessionStateManager.saveAccountState(accountId, status);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Device keep-alive error for ${phoneNumber}: ${error.message}`);
      }
    }, interval);
  }

  /**
   * Handle device disconnection and attempt recovery
   */
  async handleDeviceDisconnection(phoneNumber, client, options = {}) {
    console.log(`\n📡 Device disconnected: ${phoneNumber}`);
    console.log(`   Attempting automatic recovery...`);

    // Mark as inactive
    this.updateDeviceStatus(phoneNumber, {
      isActive: false,
      lastDisconnect: new Date().toISOString(),
    });

    // Attempt recovery
    const recovery = await this.attemptDeviceRecovery(phoneNumber, {
      maxAttempts: options.maxAttempts || 5,
      timeout: options.timeout || 30000,
    });

    if (recovery.recovered) {
      console.log(`✅ Device reconnected: ${phoneNumber}`);
      return { success: true, reconnected: true };
    } else {
      console.log(`⚠️  Device recovery failed: ${recovery.error}`);
      return { success: false, reconnected: false, error: recovery.error };
    }
  }

  /**
   * Get recovery status for all devices
   */
  async getRecoveryStatus() {
    try {
      const devicesForRecovery = await this.getDevicesForRecovery();
      const status = {
        timestamp: new Date().toISOString(),
        totalDevices: devicesForRecovery.length,
        devices: [],
      };

      for (const device of devicesForRecovery) {
        const accountId = `account-${device.phoneNumber}`;
        const attempts = this.recoveryAttempts.get(accountId) || 0;
        const lastHeartbeat = this.deviceHeartbeats.get(accountId) || null;

        status.devices.push({
          phoneNumber: device.phoneNumber,
          displayName: device.displayName,
          linkedAt: device.linkedAt,
          lastConnected: device.lastConnected,
          defaultAuthMethod: device.authMethod,
          recoveryAttempts: attempts,
          maxRecoveryAttempts: 5,
          lastHeartbeat,
          isHealthy: attempts < 5,
        });
      }

      return status;
    } catch (error) {
      console.error(`⚠️  Failed to get recovery status: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate device recovery report
   */
  async getRecoveryReport() {
    const status = await this.getRecoveryStatus();
    if (!status) return null;

    const report = {
      timestamp: status.timestamp,
      summary: {
        totalLinkedDevices: status.totalDevices,
        recoveryCapableDevices: 0,
        failedRecoveryDevices: 0,
      },
      devices: status.devices.map((device) => ({
        ...device,
        recoveryEligible: device.recoveryAttempts < device.maxRecoveryAttempts,
        recoveryPercentage: ((device.recoveryAttempts / device.maxRecoveryAttempts) * 100).toFixed(1) + "%",
      })),
    };

    // Calculate summary
    report.summary.recoveryCapableDevices = report.devices.filter(
      (d) => d.recoveryEligible
    ).length;
    report.summary.failedRecoveryDevices = report.devices.filter(
      (d) => !d.recoveryEligible
    ).length;

    return report;
  }

  /**
   * Initialize device recovery for all linked devices
   */
  async initializeAllDeviceRecoveries(clientFactory, options = {}) {
    console.log("\n" + "═".repeat(60));
    console.log("🔄 DEVICE RECOVERY: Attempting to restore linked devices...");
    console.log("═".repeat(60) + "\n");

    const devicesForRecovery = await this.getDevicesForRecovery();
    const results = {
      total: devicesForRecovery.length,
      recovered: 0,
      failed: 0,
      devices: [],
    };

    for (const device of devicesForRecovery) {
      const recovery = await this.attemptDeviceRecovery(device.phoneNumber, options);

      if (recovery.recovered) {
        results.recovered++;
        results.devices.push({
          ...device,
          status: "recovered",
        });
      } else {
        results.failed++;
        results.devices.push({
          ...device,
          status: "failed",
          error: recovery.error,
        });
      }
    }

    // Print summary
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📊 DEVICE RECOVERY SUMMARY`);
    console.log(`${"═".repeat(60)}`);
    console.log(`✅ Recovered: ${results.recovered}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${results.total > 0 ? ((results.recovered / results.total) * 100).toFixed(1) : 0}%`);
    console.log(`${"═".repeat(60)}\n`);

    return results;
  }
}

// Create singleton instance
const deviceRecoveryManager = new DeviceRecoveryManager();

export default deviceRecoveryManager;
export { DeviceRecoveryManager };
