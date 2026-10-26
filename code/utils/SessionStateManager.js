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
import { existsSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SessionStateManager {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.stateFilePath = path.join(__dirname, '../../session-state.json');
    this.state = null;
    this.loadFailed = false;
  }

  /**
   * Load session state from disk
   */
  async loadState() {
    try {
      if (!existsSync(this.stateFilePath)) {
        this.logBot('[SessionState] Creating new session state file', 'debug');
        this.state = this.getDefaultState();
        if (!await this.saveState()) throw new Error('Could not create session metadata file');
        return this.state;
      }

      const data = readFileSync(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          !parsed.accounts || typeof parsed.accounts !== 'object' || Array.isArray(parsed.accounts) ||
          Object.values(parsed.accounts).some(account => !account || typeof account !== 'object' || Array.isArray(account))) {
        throw new Error('Invalid session-state structure');
      }
      this.state = parsed;
      this.loadFailed = false;
      this.logBot(`[SessionState] ✅ Loaded state: ${Object.keys(this.state.accounts || {}).length} devices`, 'success');
      return this.state;
    } catch (error) {
      this.logBot(`[SessionState] Load error: ${error.message}`, 'error');
      this.loadFailed = true;
      throw new Error(`Cannot load session metadata; original file preserved at ${this.stateFilePath}: ${error.message}`, { cause: error });
    }
  }

  /**
   * Save session state to disk
   */
  async saveState() {
    let temporaryPath;
    let descriptor;
    try {
      if (this.loadFailed) throw new Error('Session metadata is unreadable; refusing to overwrite the original file');
      if (!this.state) {
        this.state = this.getDefaultState();
      }

      this.state.timestamp = new Date().toISOString();
      const candidate = `${this.stateFilePath}.${process.pid}.tmp`;
      descriptor = openSync(candidate, 'wx', 0o600);
      temporaryPath = candidate;
      writeFileSync(descriptor, JSON.stringify(this.state, null, 2), 'utf-8');
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporaryPath, this.stateFilePath);
      temporaryPath = undefined;
      this.logBot(`[SessionState] Saved state (${new Date().toLocaleTimeString()})`, 'debug');
      return true;
    } catch (error) {
      this.logBot(`[SessionState] Save error: ${error.message}`, 'error');
      return false;
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      if (temporaryPath && existsSync(temporaryPath)) unlinkSync(temporaryPath);
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
    if (!await this.saveState()) return false;
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

      const previous = this.state.accounts[phoneNumber] || {};
      this.state.accounts[phoneNumber] = {
        ...previous,
        ...metadata,
        displayName: metadata.displayName || previous.displayName || phoneNumber,
        role: metadata.role || previous.role || 'secondary',
        status: metadata.status || previous.status || 'linked',
        linkedAt: metadata.linkedAt || previous.linkedAt ||
          (['linked', 'authenticated'].includes(metadata.status) || metadata.deviceLinked === true
            ? new Date().toISOString() : null),
        ipAddress: metadata.ipAddress || 'unknown',
        browserPid: metadata.browserPid || null,
        sessionUptime: metadata.sessionUptime || 0,
        lastHeartbeat: new Date().toISOString()
      };

      if (!await this.saveState()) return false;
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
