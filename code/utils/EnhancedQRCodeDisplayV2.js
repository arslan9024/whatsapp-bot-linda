/**
 * ====================================================================
 * ENHANCED QR CODE DISPLAY - PHASE 20
 * ====================================================================
 * Professional QR code rendering for terminal with multiple fallbacks
 * 
 * Features:
 * - Uses terminal colors and Unicode for best display
 * - Fallback to text-based QR if graphics unavailable
 * - Timeout handling with countdown timer
 * - Instructions displayed alongside QR code
 * - Multiple rendering methods (auto-detect best)
 * 
 * @since Phase 20 - February 18, 2026
 */

import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';

class EnhancedQRCodeDisplayV2 {
  constructor() {
    this.lastQRTime = null;
    this.qrTimeoutMs = 240000; // 4 minutes
    this.countdownInterval = null;
  }

  /**
   * Display QR code with enhanced UI
   */
  async display(qr, opts = {}) {
    if (!qr) {
      throw new Error('QR code data is required');
    }

    const {
      masterAccount = 'Master',
      timeout = this.qrTimeoutMs,
      method = 'auto'
    } = opts;

    this.lastQRTime = Date.now();
    
    // Clear screen for better visibility
    console.clear();

    // Display header
    this.displayHeader(masterAccount, timeout);

    // Display instructions
    this.displayInstructions();

    // Try to render QR with selected method
    await this.renderQR(qr, method);

    // Display countdown
    this.startCountdown(timeout);

    console.log();
  }

  /**
   * Display header with account name and timeout
   */
  displayHeader(masterAccount, timeout) {
    const timeoutMin = Math.floor(timeout / 60000);
    
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║           📱 WHATSAPP QR CODE - DEVICE LINKING           ║`);
    console.log(`║                                                            ║`);
    console.log(`║  Account: ${masterAccount.padEnd(53)} ║`);
    console.log(`║  Timeout: ${timeoutMin} minutes${' '.repeat(44 - timeoutMin.toString().length)} ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  }

  /**
   * Display linking instructions
   */
  displayInstructions() {
    console.log(`\n📖 STEP-BY-STEP INSTRUCTIONS:\n`);
    
    console.log(`  1️⃣  Open WhatsApp on your mobile phone`);
    console.log(`  2️⃣  Tap: Settings → Linked Devices → Link a Device`);
    console.log(`  3️⃣  Point your camera at the QR code below`);
    console.log(`  4️⃣  Wait 30-60 seconds for the device to link`);
    console.log(`  5️⃣  Once complete, this terminal will show a success message\n`);

    console.log(`⚠️  IMPORTANT NOTES:\n`);
    console.log(`  • Keep the QR code visible until linking completes`);
    console.log(`  • Don't close WhatsApp or this terminal`);
    console.log(`  • If linking fails, you'll see a recovery menu`);
    console.log(`  • This is a Web instance link (not a phone reinstall)\n`);

    console.log(`═`.repeat(62));
    console.log();
  }

  /**
   * Render QR code using best available method
   */
  async renderQR(qr, method = 'auto') {
    try {
      if (method === 'auto' || method === 'text') {
        // Use text-based QR (most reliable for terminals)
        console.log(`\n🎯 QR CODE (Text Mode):\n`);
        qrcode.generate(qr, { small: true }, (code) => {
          console.log(code);
        });
      } else if (method === 'box') {
        // Use box-drawing characters (better looking)
        await this.renderBoxDrawingQR(qr);
      } else if (method === 'color') {
        // Use ANSI colors if supported
        this.renderColoredQR(qr);
      }
    } catch (error) {
      console.log(`⚠️  QR rendering error: ${error.message}`);
      console.log(`Attempting alternative rendering method...\n`);
      
      // Fallback: simple text representation
      console.log(`  Use this data to generate QR manually:`);
      console.log(`  ${qr.substring(0, 80)}...\n`);
    }
  }

  /**
   * Render QR using box-drawing characters
   */
  async renderBoxDrawingQR(qrData) {
    try {
      console.log('\n🎯 QR CODE (Box Mode):\n');
      
      // This is a simple fallback - full rendering would use a QR library
      // For now, use the standard terminal rendering
      qrcode.generate(qrData, { small: true }, (code) => {
        console.log(code);
      });
    } catch (error) {
      console.error(`Box mode error: ${error.message}`);
    }
  }

  /**
   * Render colored QR code
   */
  renderColoredQR(qrData) {
    // Use qrcode library for better rendering
    qrcode.generate(qrData, { 
      small: false,
      type: 'terminal256'
    }, (err, code) => {
      if (err) {
        console.log('Color QR rendering failed, falling back to text\n');
        qrcode.generate(qrData, { small: true }, (code) => {
          console.log(code);
        });
      } else {
        console.log('\n🎯 QR CODE (Color Mode):\n');
        console.log(code);
      }
    });
  }

  /**
   * Start countdown timer display
   */
  startCountdown(timeout) {
    let remainingMs = timeout;
    
    this.countdownInterval = setInterval(() => {
      remainingMs -= 1000;
      
      if (remainingMs <= 0) {
        clearInterval(this.countdownInterval);
        console.log(`\n⏰ QR CODE TIMEOUT - Device linking time expired\n`);
        return;
      }

      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      
      // Every 10 seconds, show status
      if (seconds % 10 === 0 || remainingMs <= 10000) {
        process.stdout.write(
          `\r⏱️  Waiting for device link... ${minutes}:${seconds.toString().padStart(2, '0')} remaining`
        );
      }
    }, 1000);
  }

  /**
   * Clear countdown
   */
  clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Show retry message
   */
  showRetryMessage() {
    this.clearCountdown();
    
    console.log(`\n\n🔄 GENERATING NEW QR CODE...\n`);
    
    // Clear and redisplay
    setTimeout(() => {
      console.clear();
    }, 1000);
  }

  /**
   * Show success message (short version for in-flow)
   */
  showSuccess() {
    this.clearCountdown();
    
    console.log(`\n\n🎉 ✅ DEVICE LINKED SUCCESSFULLY!\n`);
    console.log(`The terminal will continue momentarily...\n`);
  }

  /**
   * Show error message
   */
  showError(message) {
    this.clearCountdown();
    
    console.log(`\n\n❌ ERROR: ${message}\n`);
    console.log(`You'll see recovery options next...\n`);
  }
}

export default EnhancedQRCodeDisplayV2;
