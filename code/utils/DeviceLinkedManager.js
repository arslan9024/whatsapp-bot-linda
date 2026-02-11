/**
 * DeviceLinkedManager.js
 * 
 * Tracks and manages all WhatsApp devices linked to the bot
 * Maintains device metadata, status, and lifecycle events
 * 
 * Features:
 * - Real-time device tracking for all accounts
 * - Device metadata storage (IP, link time, status, uptime)
 * - Event emission for device state changes
 * - Device count and status reporting
 * - Re-link attempt tracking with backoff
 * 
 * Version: 1.0
 * Status: Production Ready
 * Created: February 11, 2026
 */

import EventEmitter from 'events';

export default class DeviceLinkedManager extends EventEmitter {
  constructor(logFunction) {
    super();
    this.logFunction = logFunction || console.log;
    
    // Map: phoneNumber → device metadata
    this.devices = new Map();
    
    // Track link attempts with exponential backoff
    this.linkAttempts = new Map();
    this.maxLinkAttempts = 5;
    this.baseBackoffMs = 2000; // 2 seconds base backoff
  }

  /**
   * Add a new device to tracking
   * Called when account is configured/identified
   */
  addDevice(phoneNumber, config = {}) {
    if (!phoneNumber) {
      this.logFunction("❌ Cannot add device: Missing phoneNumber", "error");
      return false;
    }

    if (this.devices.has(phoneNumber)) {
      this.logFunction(`⚠️  Device already tracked: ${phoneNumber}`, "warn");
      return false;
    }

    const device = {
      phoneNumber,
      name: config.name || `Device ${phoneNumber.slice(-4)}`,
      role: config.role || "secondary",
      status: "unlinked", // unlinked | linking | linked | error
      linkedAt: null,
      lastHeartbeat: null,
      lastActivity: null,
      linkAttempts: 0,
      maxLinkAttempts: this.maxLinkAttempts,
      ipAddress: null,
      deviceId: `device-${phoneNumber}`,
      lastError: null,
      uptime: 0,
      uptimeStartTime: null,
      heartbeatCount: 0,
      isOnline: false,
      recoveryMode: false,
      authMethod: null, // qr | code | restore
      createdAt: new Date().toISOString(),
    };

    this.devices.set(phoneNumber, device);
    this.logFunction(`✅ Device added to tracker: ${phoneNumber}`, "info");
    
    this.emit('device:added', { phoneNumber, device });
    return true;
  }

  /**
   * Mark device as linked/authenticated
   */
  markDeviceLinked(phoneNumber, linkData = {}) {
    const device = this.devices.get(phoneNumber);
    if (!device) {
      this.logFunction(`⚠️  Device not found: ${phoneNumber}`, "warn");
      return false;
    }

    const now = new Date().toISOString();
    device.status = "linked";
    device.linkedAt = linkData.linkedAt || now;
    device.authMethod = linkData.authMethod || "qr";
    device.ipAddress = linkData.ipAddress || null;
    device.isOnline = true;
    device.uptimeStartTime = Date.now();
    device.lastHeartbeat = now;
    device.lastError = null;
    device.recoveryMode = false;
    
    // Reset link attempts on successful link
    this.linkAttempts.delete(phoneNumber);

    this.logFunction(
      `✅ Device linked: ${phoneNumber} (${device.authMethod})`,
      "success"
    );
    
    this.emit('device:linked', { phoneNumber, device, linkData });
    this.emit('device:status-changed', { phoneNumber, oldStatus: "linking", newStatus: "linked" });
    return true;
  }

  /**
   * Mark device as unlinked/offline
   */
  markDeviceUnlinked(phoneNumber, reason = "disconnected") {
    const device = this.devices.get(phoneNumber);
    if (!device) return false;

    const oldStatus = device.status;
    device.status = "unlinked";
    device.isOnline = false;
    device.lastError = reason;
    device.uptimeStartTime = null;

    this.logFunction(`❌ Device unlinked: ${phoneNumber} (${reason})`, "warn");
    
    this.emit('device:unlinked', { phoneNumber, device, reason });
    this.emit('device:status-changed', { phoneNumber, oldStatus, newStatus: "unlinked" });
    return true;
  }

  /**
   * Update device status to "linking" and track attempt
   */
  startLinkingAttempt(phoneNumber) {
    const device = this.devices.get(phoneNumber);
    if (!device) return false;

    const currentAttempts = (this.linkAttempts.get(phoneNumber) || 0) + 1;
    this.linkAttempts.set(phoneNumber, currentAttempts);

    device.status = "linking";
    device.linkAttempts = currentAttempts;
    device.lastActivity = new Date().toISOString();

    this.logFunction(
      `⏳ Starting link attempt ${currentAttempts}/${this.maxLinkAttempts} for ${phoneNumber}`,
      "info"
    );

    this.emit('device:linking-started', { phoneNumber, device, attempt: currentAttempts });
    return true;
  }

  /**
   * Handle failed link attempt, return retry delay
   */
  recordLinkFailure(phoneNumber, error = null) {
    const device = this.devices.get(phoneNumber);
    if (!device) return null;

    const attempts = this.linkAttempts.get(phoneNumber) || 0;
    
    if (attempts >= this.maxLinkAttempts) {
      device.status = "error";
      device.isOnline = false;
      device.lastError = `Max retries (${this.maxLinkAttempts}) exceeded`;
      
      this.logFunction(
        `❌ Max link attempts exceeded for ${phoneNumber}`,
        "error"
      );
      
      this.emit('device:link-failed-max', { phoneNumber, device, attempts });
      return null;
    }

    // Calculate exponential backoff: 2^attempt * 1000ms
    const backoffDelay = Math.pow(2, attempts) * this.baseBackoffMs;
    device.lastError = error?.message || "Link failed";

    this.logFunction(
      `⏳ Link attempt ${attempts}/${this.maxLinkAttempts} failed. Retrying in ${backoffDelay}ms...`,
      "warn"
    );

    this.emit('device:link-failed', { 
      phoneNumber, 
      device, 
      attempts, 
      error,
      nextRetryDelay: backoffDelay 
    });

    return backoffDelay;
  }

  /**
   * Reset device status for re-linking (called by user command)
   */
  resetDeviceStatus(phoneNumber) {
    const device = this.devices.get(phoneNumber);
    if (!device) return false;

    device.status = "unlinked";
    device.linkAttempts = 0;
    device.lastError = null;
    device.isOnline = false;
    device.recoveryMode = false;
    this.linkAttempts.delete(phoneNumber);

    this.logFunction(`🔄 Device reset for re-linking: ${phoneNumber}`, "info");
    
    this.emit('device:reset', { phoneNumber, device });
    return true;
  }

  /**
   * Update device metadata (IP, uptime, heartbeats, etc.)
   */
  updateDeviceMetadata(phoneNumber, metadata) {
    const device = this.devices.get(phoneNumber);
    if (!device) return false;

    Object.assign(device, metadata);
    return true;
  }

  /**
   * Record heartbeat for device
   */
  recordHeartbeat(phoneNumber) {
    const device = this.devices.get(phoneNumber);
    if (!device) return false;

    device.lastHeartbeat = new Date().toISOString();
    device.lastActivity = device.lastHeartbeat;
    device.heartbeatCount++;
    device.isOnline = true;

    return true;
  }

  /**
   * Update device uptime
   */
  updateUptime(phoneNumber) {
    const device = this.devices.get(phoneNumber);
    if (!device || !device.uptimeStartTime) return 0;

    device.uptime = Date.now() - device.uptimeStartTime;
    return device.uptime;
  }

  /**
   * Get specific device metadata
   */
  getDevice(phoneNumber) {
    return this.devices.get(phoneNumber) || null;
  }

  /**
   * Get all tracked devices
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get all linked devices
   */
  getLinkedDevices() {
    return Array.from(this.devices.values()).filter(d => d.status === "linked");
  }

  /**
   * Get all unlinked devices
   */
  getUnlinkedDevices() {
    return Array.from(this.devices.values()).filter(d => d.status === "unlinked");
  }

  /**
   * Get devices currently linking
   */
  getLinkingDevices() {
    return Array.from(this.devices.values()).filter(d => d.status === "linking");
  }

  /**
   * Get device count summary
   */
  getDeviceCount() {
    const devices = this.getAllDevices();
    return {
      total: devices.length,
      linked: this.getLinkedDevices().length,
      unlinked: this.getUnlinkedDevices().length,
      linking: this.getLinkingDevices().length,
      error: devices.filter(d => d.status === "error").length,
    };
  }

  /**
   * Format device for terminal display
   */
  formatDeviceForDisplay(phoneNumber) {
    const device = this.getDevice(phoneNumber);
    if (!device) return null;

    const statusSymbol = {
      linked: "✅",
      unlinked: "❌",
      linking: "⏳",
      error: "⚠️",
    }[device.status] || "❓";

    const baseDisplay = `${statusSymbol}  ${phoneNumber}  │ ${device.name} [${device.role}]`;

    if (device.status === "linked") {
      const uptimeHours = Math.floor(device.uptime / 3600000);
      const uptimeMinutes = Math.floor((device.uptime % 3600000) / 60000);
      const hoursAgo = device.linkedAt 
        ? Math.floor((Date.now() - new Date(device.linkedAt).getTime()) / 3600000)
        : 0;

      return {
        main: baseDisplay,
        details: [
          `  └─ Status: ONLINE | Uptime: ${uptimeHours}h ${uptimeMinutes}m | Heartbeats: ${device.heartbeatCount}`,
          `  └─ Linked: ${hoursAgo}h ago | LastActive: ${device.lastActivity ? this.getTimeAgo(device.lastActivity) : 'N/A'} | IP: ${device.ipAddress || 'N/A'}`,
        ],
      };
    }

    if (device.status === "linking") {
      const timeAgo = this.getTimeAgo(device.lastActivity);
      return {
        main: baseDisplay,
        details: [
          `  └─ Status: LINKING | Attempt: ${device.linkAttempts}/${device.maxLinkAttempts} | QR Code: ACTIVE`,
          `  └─ Link Started: ${timeAgo} | Device ID: ${device.deviceId}`,
        ],
      };
    }

    if (device.status === "unlinked") {
      return {
        main: baseDisplay,
        details: [
          `  └─ Status: PENDING | Reason: ${device.lastError || 'Never linked'} | Attempts: ${device.linkAttempts}/${device.maxLinkAttempts}`,
          `  └─ Device ID: ${device.deviceId}`,
        ],
      };
    }

    return { main: baseDisplay, details: [] };
  }

  /**
   * Helper: Get time ago string
   */
  getTimeAgo(isoString) {
    if (!isoString) return "N/A";

    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now - then;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  /**
   * Get device statistics summary
   */
  getStatistics() {
    const devices = this.getAllDevices();
    const linked = this.getLinkedDevices();
    
    const totalUptime = linked.reduce((sum, d) => sum + (d.uptime || 0), 0);
    const avgUptime = linked.length > 0 ? totalUptime / linked.length : 0;
    const totalHeartbeats = linked.reduce((sum, d) => sum + (d.heartbeatCount || 0), 0);

    return {
      deviceCount: this.getDeviceCount(),
      totalUptime,
      avgUptime,
      totalHeartbeats,
      avgHeartbeatsPerDevice: linked.length > 0 ? totalHeartbeats / linked.length : 0,
      onlineCount: devices.filter(d => d.isOnline).length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear all device tracking (on shutdown)
   */
  clearAll() {
    this.devices.clear();
    this.linkAttempts.clear();
    this.logFunction("🧹 Device tracking cleared", "info");
  }
}
