/**
 * ====================================================================
 * SESSION STATE MANAGER - V2
 * ====================================================================
 * Persistent device and session state management
 * 
 * Features:
 * - Load/save device metadata (IP, browser PID, link time, heartbeat)
 * - Master phone number persistence across restarts
 * - Device recovery without re-scanning QR
 * - Session uptime tracking
 * - Automatic state file synchronization
 * 
 * State Schema:
 * {
 *   "timestamp": "ISO8601",
 *   "version": "1.0",
 *   "masterPhoneNumber": "+971505760056",
 *   "lastMasterSelection": "ISO8601",
 *   "accounts": {
 *     "+971505760056": {
 *       "displayName": "Linda Master",
 *       "role": "primary",
 *       "status": "linked",
 *       "linkedAt": "ISO8601",
 *       "ipAddress": "192.168.1.100",
 *       "browserPid": 12345,
 *       "sessionUptime": 3600000,
 *       "lastHeartbeat": "ISO8601"
 *     }
 *   }
 * }
 * 
 * @since Phase 2+ - February 18, 2026
 */

import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SessionStateManager {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.stateFilePath = path.join(__dirname, '../../session-state.json');
    this.state = null;
  }

  /**
   * Load session state from disk
   */
  async loadState() {
    try {
      if (!existsSync(this.stateFilePath)) {
        this.logBot('[SessionState] Creating new session state file', 'debug');
        this.state = this.getDefaultState();
        await this.saveState();
        return this.state;
      }

      const data = readFileSync(this.stateFilePath, 'utf-8');
      this.state = JSON.parse(data);
      this.logBot(`[SessionState] ✅ Loaded state: ${Object.keys(this.state.accounts || {}).length} devices`, 'success');
      return this.state;
    } catch (error) {
      this.logBot(`[SessionState] Load error: ${error.message}`, 'error');
      this.state = this.getDefaultState();
      return this.state;
    }
  }

  /**
   * Save session state to disk
   */
  async saveState() {
    try {
      if (!this.state) {
        this.state = this.getDefaultState();
      }

      this.state.timestamp = new Date().toISOString();
      writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
      this.logBot(`[SessionState] Saved state (${new Date().toLocaleTimeString()})`, 'debug');
      return true;
    } catch (error) {
      this.logBot(`[SessionState] Save error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Get default state structure
   */
  getDefaultState() {
    return {
      timestamp: new Date().toISOString(),
      version: '1.0',
      masterPhoneNumber: null,
      lastMasterSelection: null,
      accounts: {}
    };
  }

  /**
   * Get master phone number from state
   */
  getMasterPhoneNumber() {
    return this.state?.masterPhoneNumber || null;
  }

  /**
   * Set master phone number and save
   */
  async setMasterPhoneNumber(phoneNumber) {
    if (!this.state) {
      await this.loadState();
    }

    this.state.masterPhoneNumber = phoneNumber;
    this.state.lastMasterSelection = new Date().toISOString();
    await this.saveState();
    this.logBot(`[SessionState] Master phone set: ${phoneNumber}`, 'debug');
    return true;
  }

  /**
   * Get device metadata
   */
  getDeviceMetadata(phoneNumber) {
    return this.state?.accounts?.[phoneNumber] || null;
  }

  /**
   * Save device metadata on linking
   */
  async saveDeviceMetadata(phoneNumber, metadata = {}) {
    try {
      if (!this.state) {
        await this.loadState();
      }

      if (!this.state.accounts) {
        this.state.accounts = {};
      }

      this.state.accounts[phoneNumber] = {
        displayName: metadata.displayName || phoneNumber,
        role: metadata.role || 'secondary',
        status: metadata.status || 'linked',
        linkedAt: metadata.linkedAt || new Date().toISOString(),
        ipAddress: metadata.ipAddress || 'unknown',
        browserPid: metadata.browserPid || null,
        sessionUptime: metadata.sessionUptime || 0,
        lastHeartbeat: new Date().toISOString()
      };

      await this.saveState();
      this.logBot(`[SessionState] Device saved: ${phoneNumber}`, 'debug');
      return true;
    } catch (error) {
      this.logBot(`[SessionState] Save device error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Update device heartbeat (called periodically)
   */
  async updateDeviceHeartbeat(phoneNumber) {
    try {
      if (!this.state?.accounts?.[phoneNumber]) {
        return false;
      }

      const device = this.state.accounts[phoneNumber];
      device.lastHeartbeat = new Date().toISOString();
      
      // Calculate session uptime
      if (device.linkedAt) {
        const linkedTime = new Date(device.linkedAt).getTime();
        device.sessionUptime = Date.now() - linkedTime;
      }

      // Save only periodically to avoid excessive I/O
      if (Date.now() % 60000 === 0) {
        await this.saveState();
      }

      return true;
    } catch (error) {
      this.logBot(`[SessionState] Heartbeat update error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Check if device was previously linked (session recovery)
   */
  isDevicePreviouslyLinked(phoneNumber) {
    const device = this.state?.accounts?.[phoneNumber];
    return device && device.status === 'linked';
  }

  /**
   * Get all linked devices
   */
  getLinkedDevices() {
    const devices = this.state?.accounts || {};
    return Object.entries(devices)
      .filter(([_, device]) => device.status === 'linked')
      .map(([phone, device]) => ({
        phoneNumber: phone,
        ...device
      }));
  }

  /**
   * Clear device state (for cleanup/reset)
   */
  async clearDeviceState(phoneNumber) {
    try {
      if (this.state?.accounts?.[phoneNumber]) {
        delete this.state.accounts[phoneNumber];
        await this.saveState();
        this.logBot(`[SessionState] Device cleared: ${phoneNumber}`, 'debug');
        return true;
      }
      return false;
    } catch (error) {
      this.logBot(`[SessionState] Clear device error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Get summary for logging
   */
  getSummary() {
    const accounts = this.state?.accounts || {};
    const linked = Object.values(accounts).filter(a => a.status === 'linked').length;
    return {
      masterPhone: this.state?.masterPhoneNumber || 'not set',
      totalDevices: Object.keys(accounts).length,
      linkedDevices: linked,
      lastUpdate: this.state?.timestamp
    };
  }
}

export { SessionStateManager };
export default SessionStateManager;
