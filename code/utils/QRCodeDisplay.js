import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

/**
 * Display QR code in terminal using multiple rendering methods
 * with fallbacks for Windows terminal compatibility
 * 
 * PRIMARY: qrcode-terminal - Most reliable, designed for terminal rendering
 */
class QRCodeDisplay {
  /**
   * Display QR code using qrcode-terminal - PRIMARY METHOD (BEST FOR ALL TERMINALS)
   * Generates visual QR code optimized for camera scanning
   * @param {string} text - The text to encode in the QR code
   * @param {Object} options - Display options
   */
  static displayTerminal(text, options = {}) {
    try {
      // Clear previous output for clean display
      console.log();
      
      // qrcode-terminal is the best method - optimized for all terminals
      // Uses proper Unicode characters for crisp rendering
      qrcodeTerminal.generate(text, {
        small: true,                     // Compact size - perfect for terminal
        quiet: 1                         // Proper quiet zone for scanning
      });
      
      console.log();
      return true;
    } catch (error) {
      console.error('❌ Terminal QR generation failed:', error.message);
      return false;
    }
  }

  /**
   * Display QR code using ASCII art with block characters (last fallback)
   * @param {string} text - The text to encode in the QR code
   * @param {Object} options - Display options
   */
  static displayASCII(text, options = {}) {
    try {
      // Generate QR code with modules
      const qr = QRCode.create(text, {
        errorCorrectionLevel: 'L'
      });
      
      const bitMatrix = qr.modules;
      const size = bitMatrix.size;
      const data = bitMatrix.data;
      
      console.log();
      
      // Render with block characters for better visibility
      for (let y = 0; y < size; y++) {
        let line = '';
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          // Use █ for dark and space for light
          line += data[idx] ? '██' : '  ';
        }
        console.log(line);
      }
      
      console.log();
      return true;
    } catch (error) {
      console.error('ASCII QR generation failed:', error.message);
      return false;
    }
  }

  /**
   * Display QR code using simple characters (most compatible)
   * @param {string} text - The text to encode in the QR code
   */
  static displaySimpleChars(text) {
    try {
      // Generate QR code with modules
      const qr = QRCode.create(text, {
        errorCorrectionLevel: 'L'
      });
      
      const bitMatrix = qr.modules;
      const size = bitMatrix.size;
      const data = bitMatrix.data;
      
      console.log();
      
      // Render with single-character width for most compact display
      for (let y = 0; y < size; y++) {
        let line = '';
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          // Use # for dark and . for light - single character width
          line += data[idx] ? '#' : '.';
        }
        console.log(line);
      }
      
      console.log();
      return true;
    } catch (error) {
      console.error('Simple char QR generation failed:', error.message);
      return false;
    }
  }

  /**
   * Display ultra-compact QR code using 2x2 character blocks (SMALLEST)
   * Perfect for quick scanning on Windows terminals
   * @param {string} text - The text to encode in the QR code
   */
  static displayCompact(text) {
    try {
      const qr = QRCode.create(text, {
        errorCorrectionLevel: 'L'
      });
      
      const bitMatrix = qr.modules;
      const size = bitMatrix.size;
      const data = bitMatrix.data;
      
      console.log();
      
      // Render with 2x2 scaling for ultra-compact display
      // This reduces visual size while maintaining scannability
      for (let y = 0; y < size; y += 2) {
        let line = '';
        for (let x = 0; x < size; x += 2) {
          const idx = y * size + x;
          // Use block character for better visibility
          line += data[idx] ? '█' : ' ';
        }
        console.log(line);
      }
      
      console.log();
      return true;
    } catch (error) {
      console.error('Compact QR generation failed:', error.message);
      return false;
    }
  }

  /**
   * Smart display - tries optimal methods with intelligent fallbacks
   * 
   * Rendering Priority Chain:
   * 1. qrcode-terminal (PRIMARY) - Most reliable, designed for terminals
   * 2. Compact - Ultra-small, if terminal fails
   * 3. SimpleChars - Fallback with # and .
   * 4. ASCII - Last resort with block characters
   * 
   * @param {string} qrData - The QR code data/text
   * @param {object} options - Display options {method, fallback, masterAccount}
   */
  static async display(qrData, options = {}) {
    const {
      method = 'auto',      // 'auto', 'qrcode-terminal', 'compact', 'ascii', 'simple'
      fallback = true,      // Try fallback methods on failure
      masterAccount = ''
    } = options;

    // Clear and show header
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         🔗 DEVICE LINKING - SCAN QR CODE                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    if (masterAccount) {
      console.log(`📱 Master Device Number: ${masterAccount}\n`);
    }
    
    console.log('⏳ Scanning... Open WhatsApp → Settings → Linked Devices\n');

    let success = false;

    if (method === 'auto') {
      // Try PRIMARY method first: qrcode-terminal (designed for terminals)
      success = this.displayTerminal(qrData);

      // Fallback 1: Try compact if terminal fails
      if (!success && fallback) {
        console.log('\n📊 Using compact rendering...\n');
        success = this.displayCompact(qrData);
      }

      // Fallback 2: Try simple characters if compact fails
      if (!success && fallback) {
        console.log('\n📊 Using simple character rendering...\n');
        success = this.displaySimpleChars(qrData);
      }

      // Fallback 3: Try ASCII as last resort
      if (!success && fallback) {
        console.log('\n📊 Using ASCII rendering...\n');
        success = this.displayASCII(qrData);
      }
    } else if (method === 'qrcode-terminal') {
      success = this.displayTerminal(qrData);
      if (!success && fallback) {
        success = this.displayCompact(qrData);
      }
    } else if (method === 'compact') {
      success = this.displayCompact(qrData);
      if (!success && fallback) {
        success = this.displayTerminal(qrData);
      }
    } else if (method === 'simple') {
      success = this.displaySimpleChars(qrData);
      if (!success && fallback) {
        success = this.displayTerminal(qrData);
      }
    } else if (method === 'ascii') {
      success = this.displayASCII(qrData);
      if (!success && fallback) {
        success = this.displayTerminal(qrData);
      }
    }

    // Show status
    if (success) {
      console.log('\n✅ QR Code Ready - Hold your phone camera close to scan');
      console.log('ℹ️  Keep this window open during device linking...\n');
    } else {
      console.log('\n❌ QR Code generation failed - Manual linking:');
      console.log('   1. Open WhatsApp on your phone');
      console.log('   2. Go to Settings → Linked Devices');
      console.log('   3. Click "Link a device"');
      console.log('   4. Select "Use 6-digit code" for manual pairing\n');
    }

    return success;
  }

  /**
   * Regenerate QR code at intervals (for scanning timeouts)
   * @param {function} getQRData - Function that returns current QR data
   * @param {number} interval - Interval in milliseconds
   * @returns {function} - Function to stop the interval
   */
  static startRegenerateInterval(getQRData, interval = 30000, options = {}) {
    let lastQR = null;

    const intervalId = setInterval(async () => {
      const newQR = getQRData();
      if (newQR && newQR !== lastQR) {
        lastQR = newQR;
        await this.display(newQR, options);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }
}

export default QRCodeDisplay;
