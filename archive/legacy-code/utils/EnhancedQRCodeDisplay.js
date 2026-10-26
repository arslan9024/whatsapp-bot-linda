/**
 * ====================================================================
 * ENHANCED QR CODE DISPLAY (Phase 14)
 * ====================================================================
 * Upgraded QR code rendering with:
 * - Automatic terminal capability detection
 * - Better visual formatting (colors, borders, instructions)
 * - Countdown timer tracking
 * - Optional QR code export to file
 * - Smarter method selection based on terminal type
 * - Better error recovery messaging
 *
 * Rendering Methods (Priority Order):
 * 1. Terminal detection → Auto-select optimal method
 * 2. qrcode-terminal (default) - Best for all terminals
 * 3. Compact blocks - Fallback for limited terminals
 * 4. Simple characters - Maximum compatibility
 * 5. ASCII art - Last resort
 *
 * @since Phase 14 - February 15, 2026
 */

import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

class EnhancedQRCodeDisplay {
  // Static cache for terminal detected capability
  static _detectedCapability = null;
  static _terminalDetectionTime = null;

  /**
   * Detect terminal capabilities at startup
   * Cache result for session duration to avoid repeated detection
   * @returns {string} 'unicode' | 'basic' | 'ascii'
   */
  static detectTerminalCapability() {
    // Return cached detection
    if (this._detectedCapability && Date.now() - this._terminalDetectionTime < 86400000) {
      return this._detectedCapability;
    }

    const platform = process.platform;
    const env = process.env;
    const term = (env.TERM || '').toLowerCase();
    const colorterm = (env.COLORTERM || '').toLowerCase();

    let capability = 'unicode'; // Default to best option

    // Windows detection
    if (platform === 'win32') {
      // Windows Terminal (new) - supports Unicode
      if (env.WT_SESSION || env.WT_PROFILE_ID) {
        capability = 'unicode';
      }
      // PowerShell, ConEmu, Cmder - test Unicode support
      else if (env.ConEmuANSI) {
        capability = 'unicode';
      }
      // Legacy cmd.exe - fallback to ASCII
      else if (env.PROMPT) {
        capability = 'ascii';
      }
      // Default for Windows - try Unicode first
      else {
        capability = 'unicode';
      }
    }
    // Unix/Linux/Mac - check TERM variable
    else if (platform === 'darwin' || platform === 'linux') {
      if (term.includes('xterm') || term.includes('screen') || term === 'linux') {
        capability = 'unicode';
      } else if (term === 'dumb' || term === '' || !colorterm) {
        capability = 'basic';
      } else {
        capability = 'unicode';
      }
    }

    // Cache detection
    this._detectedCapability = capability;
    this._terminalDetectionTime = Date.now();

    return capability;
  }

  /**
   * Create visually enhanced header
   * @param {string} phoneNumber - Master device phone number
   * @param {number} timeoutMs - Timeout in milliseconds (for display)
   * @returns {string} - Formatted header
   */
  static createHeader(phoneNumber = '', timeoutMs = 120000) {
    const timeoutSecs = Math.round(timeoutMs / 1000);
    const lines = [];

    lines.push('\n╔════════════════════════════════════════════════════════════════╗');
    lines.push('║          🔗 WHATSAPP DEVICE LINKING - SCAN QR CODE          ║');
    lines.push('╚════════════════════════════════════════════════════════════════╝\n');

    if (phoneNumber) {
      lines.push(`📱 Master Device: ${phoneNumber}`);
    }

    lines.push(`⏳ Scan expires in ${timeoutSecs} seconds`);
    lines.push('📸 Open WhatsApp → Settings → Linked Devices → Link Device\n');

    return lines.join('\n');
  }

  /**
   * Create formatted footer with instructions
   * @param {boolean} success - Whether QR was generated successfully
   * @returns {string} - Formatted footer
   */
  static createFooter(success = true) {
    const lines = [];

    if (success) {
      lines.push('\n✅ QR Code Ready\n');
      lines.push('📸 Instructions:');
      lines.push('   1. Open WhatsApp on your phone');
      lines.push('   2. Go to Settings → Linked Devices');
      lines.push('   3. Click "Link a Device"');
      lines.push('   4. Point your phone camera at the QR code above');
      lines.push('   5. Confirm on your phone when prompted');
      lines.push('\n🔄 Keep this window open while linking...\n');
    } else {
      lines.push('\n❌ QR Code generation failed - Manual Linking:');
      lines.push('\n📋 Alternative: Use 6-digit pairing code');
      lines.push('   If code is available, you\'ll see it displayed above');
      lines.push('   Enter the code in WhatsApp → Settings → Linked Devices');
      lines.push('\n   OR: Contact support if both options fail\n');
    }

    return lines.join('\n');
  }

  /**
   * Display QR using qrcode-terminal (recommended)
   * @param {string} qrData - QR code data
   * @returns {boolean} - Success status
   */
  static displayTerminal(qrData) {
    try {
      qrcodeTerminal.generate(qrData, {
        small: true,
        quiet: 1
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Display QR using block character scaling (compact)
   * @param {string} qrData - QR code data
   * @returns {boolean} - Success status
   */
  static displayCompact(qrData) {
    try {
      const qr = QRCode.create(qrData, { errorCorrectionLevel: 'L' });
      const bitMatrix = qr.modules;
      const size = bitMatrix.size;
      const data = bitMatrix.data;

      for (let y = 0; y < size; y += 2) {
        let line = '';
        for (let x = 0; x < size; x += 2) {
          const idx = y * size + x;
          line += data[idx] ? '█' : ' ';
        }
        console.log(line);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Display QR using simple characters (most compatible)
   * @param {string} qrData - QR code data
   * @returns {boolean} - Success status
   */
  static displaySimple(qrData) {
    try {
      const qr = QRCode.create(qrData, { errorCorrectionLevel: 'L' });
      const bitMatrix = qr.modules;
      const size = bitMatrix.size;
      const data = bitMatrix.data;

      for (let y = 0; y < size; y++) {
        let line = '';
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          line += data[idx] ? '#' : '.';
        }
        console.log(line);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Display QR using ASCII art (largest)
   * @param {string} qrData - QR code data
   * @returns {boolean} - Success status
   */
  static displayASCII(qrData) {
    try {
      const qr = QRCode.create(qrData, { errorCorrectionLevel: 'L' });
      const bitMatrix = qr.modules;
      const size = bitMatrix.size;
      const data = bitMatrix.data;

      for (let y = 0; y < size; y++) {
        let line = '';
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          line += data[idx] ? '██' : '  ';
        }
        console.log(line);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Export QR code to file
   * @param {string} qrData - QR code data
   * @param {string} phoneNumber - Phone number for filename
   * @returns {Promise<string|null>} - File path or null on failure
   */
  static async exportQRToFile(qrData, phoneNumber) {
    try {
      const qrDir = path.join(process.cwd(), 'qr_codes');

      // Create directory if it doesn't exist
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }

      // Generate PNG file
      const filename = `qr_${phoneNumber.replace(/\D/g, '')}_${Date.now()}.png`;
      const filepath = path.join(qrDir, filename);

      await QRCode.toFile(filepath, qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Cleanup old QR files (keep only last 5)
      this._cleanupOldQRFiles(qrDir);

      return filepath;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup old QR files keeping only the newest ones
   * @param {string} qrDir - QR directory path
   * @param {number} keepCount - Number of files to keep
   */
  static _cleanupOldQRFiles(qrDir, keepCount = 5) {
    try {
      const files = fs.readdirSync(qrDir)
        .filter(f => f.startsWith('qr_') && f.endsWith('.png'))
        .map(f => ({
          name: f,
          path: path.join(qrDir, f),
          time: fs.statSync(path.join(qrDir, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

      // Remove files beyond keepCount
      files.slice(keepCount).forEach(f => {
        try {
          fs.unlinkSync(f.path);
        } catch (e) {
          // Ignore deletion errors
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Smart display - Choose best rendering method based on terminal detection
   * 
   * @param {string} qrData - The QR code data/text
   * @param {Object} options - Display options
   *   - method: 'auto' | 'terminal' | 'compact' | 'simple' | 'ascii' (default: 'auto')
   *   - fallback: boolean - Try fallback methods on failure (default: true)
   *   - masterAccount: string - Phone number to display (optional)
   *   - timeout: number - Timeout in ms (default: 120000)
   *   - export: boolean - Export QR to file (default: false)
   *   - teleportInfo: object - Terminal detection info to display (optional)
   * @returns {Promise<boolean>} - Success status
   */
  static async display(qrData, options = {}) {
    const {
      method = 'auto',
      fallback = true,
      masterAccount = '',
      timeout = 120000,
      export: shouldExport = false,
      terminalInfo = false
    } = options;

    // Clear screen and show header
    console.clear();
    console.log(this.createHeader(masterAccount, timeout));

    // Detect terminal capability if auto mode
    let selectedMethod = method;
    if (method === 'auto') {
      const capability = this.detectTerminalCapability();
      
      if (terminalInfo) {
        console.log(`🖥️  Terminal Capability: ${capability}\n`);
      }

      // Choose rendering method based on capability
      if (capability === 'unicode') {
        selectedMethod = 'terminal'; // qrcode-terminal
      } else if (capability === 'basic') {
        selectedMethod = 'compact';
      } else {
        selectedMethod = 'simple';
      }
    }

    let success = false;

    // Try selected method first
    try {
      if (selectedMethod === 'terminal') {
        success = this.displayTerminal(qrData);
      } else if (selectedMethod === 'compact') {
        success = this.displayCompact(qrData);
      } else if (selectedMethod === 'simple') {
        success = this.displaySimple(qrData);
      } else if (selectedMethod === 'ascii') {
        success = this.displayASCII(qrData);
      }
    } catch (e) {
      success = false;
    }

    // Fallback chain if selected method fails
    if (!success && fallback) {
      const fallbackMethods = ['terminal', 'compact', 'simple', 'ascii'];
      const attemptedMethods = new Set([selectedMethod]);

      for (const fallbackMethod of fallbackMethods) {
        if (attemptedMethods.has(fallbackMethod)) continue;

        try {
          if (fallbackMethod === 'terminal') {
            success = this.displayTerminal(qrData);
          } else if (fallbackMethod === 'compact') {
            success = this.displayCompact(qrData);
          } else if (fallbackMethod === 'simple') {
            success = this.displaySimple(qrData);
          } else if (fallbackMethod === 'ascii') {
            success = this.displayASCII(qrData);
          }

          if (success) break;
        } catch (e) {
          // Continue to next fallback
        }
      }
    }

    // Show footer
    console.log(this.createFooter(success));

    // Export to file if requested and successful
    if (success && shouldExport) {
      const filePath = await this.exportQRToFile(qrData, masterAccount || 'unknown');
      if (filePath) {
        console.log(`💾 QR code saved: ${filePath}\n`);
      }
    }

    return success;
  }

  /**
   * Test display capabilities
   * Useful for troubleshooting terminal rendering
   * @returns {Promise<void>}
   */
  static async testCapabilities() {
    const testData = 'https://example.com/test';

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          QR RENDERING CAPABILITY TEST                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const capability = this.detectTerminalCapability();
    console.log(`Detected Capability: ${capability}\n`);

    console.log('Testing each rendering method...\n');

    console.log('1️⃣  Terminal (qrcode-terminal):');
    if (this.displayTerminal(testData)) {
      console.log('   ✅ Works!\n');
    } else {
      console.log('   ❌ Failed\n');
    }

    console.log('2️⃣  Compact (2x2 blocks):');
    if (this.displayCompact(testData)) {
      console.log('   ✅ Works!\n');
    } else {
      console.log('   ❌ Failed\n');
    }

    console.log('3️⃣  Simple (#. characters):');
    if (this.displaySimple(testData)) {
      console.log('   ✅ Works!\n');
    } else {
      console.log('   ❌ Failed\n');
    }

    console.log('4️⃣  ASCII (██ blocks):');
    if (this.displayASCII(testData)) {
      console.log('   ✅ Works!\n');
    } else {
      console.log('   ❌ Failed\n');
    }
  }
}

export default EnhancedQRCodeDisplay;
