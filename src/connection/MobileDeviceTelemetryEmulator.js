/**
 * MobileDeviceTelemetryEmulator.js
 * 
 * Single responsibility: Emulate dynamic mobile battery, charging, and WiFi network status in WhatsApp payloads.
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class MobileDeviceTelemetryEmulator {
  constructor({ initialBattery = 88 } = {}) {
    this.battery = initialBattery;
    this.isPlugged = false;
  }

  getSimulatedState(now = Date.now()) {
    // Subtle gradual battery decay or charge emulation
    const hour = new Date(now).getHours();
    this.isPlugged = (hour >= 23 || hour <= 6); // Charged overnight

    if (this.isPlugged) {
      this.battery = Math.min(100, this.battery + 2);
    } else {
      this.battery = Math.max(18, this.battery - (Math.random() > 0.7 ? 1 : 0));
    }

    return {
      battery: this.battery,
      plugged: this.isPlugged,
      network: 'WIFI',
      powersave: this.battery <= 20,
      timestamp: now,
    };
  }
}

export default new MobileDeviceTelemetryEmulator();
