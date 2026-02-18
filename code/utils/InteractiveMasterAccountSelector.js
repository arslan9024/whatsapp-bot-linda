/**
 * ====================================================================
 * INTERACTIVE MASTER ACCOUNT SELECTOR
 * ====================================================================
 * Help users select and configure the master WhatsApp account (Lion0)
 * with step-by-step QR code linking and recovery guidance
 * 
 * Features:
 * - Interactive account selection menu
 * - Step-by-step QR code linking with countdown
 * - Error recovery with retry logic
 * - Device status verification
 * - Fallback instructions if QR fails
 * 
 * @since Phase 20 - February 18, 2026
 */

import readline from 'readline';
import chalk from 'chalk';
import { SessionStateManager } from './SessionStateManager.js';

class InteractiveMasterAccountSelector {
  constructor(sessionStateManager = null, logBotFn = null) {
    this.rl = null;
    this.selectedMasterNumber = null;
    this.isSelecting = false;
    this.sessionStateManager = sessionStateManager || new SessionStateManager(logBotFn);
    this.logBot = logBotFn || console.log;
  }

  /**
   * Initialize readline interface for user input
   */
  initializeInput() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }
    return this.rl;
  }

  /**
   * Ask user a yes/no question
   */
  async askYesNo(question) {
    return new Promise((resolve) => {
      this.rl.question(question + ' (y/n): ', (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Ask user for input
   */
  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Display main menu for master account selection
   */
  async displayMainMenu() {
    console.clear();
    
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║     🤖 LINDA BOT - MASTER WHATSAPP ACCOUNT SETUP          ║`);
    console.log(`║                                                            ║`);
    console.log(`║  Welcome! Let's set up your primary WhatsApp account.      ║`);
    console.log(`║  This account will be Linda's main communication channel. ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log(`📋 MENU OPTIONS:`);
    console.log(`  1️⃣  Enter master WhatsApp number (+ format, e.g., +971505760056)`);
    console.log(`  2️⃣  Use default master number`);
    console.log(`  3️⃣  Skip for now (will ask later)`);
    console.log();

    const choice = await this.askQuestion(`Your choice (1-3): `);
    return choice;
  }

  /**
   * Get the master WhatsApp number from user (with session state recovery)
   */
  async getMasterPhoneNumber() {
    // STEP 1: Load session state
    await this.sessionStateManager.loadState();
    
    // STEP 2: Check if master number is already set in session
    const savedMasterNumber = this.sessionStateManager.getMasterPhoneNumber();
    if (savedMasterNumber) {
      console.log(`\n✅ Master account recovered from session: ${savedMasterNumber}`);
      this.selectedMasterNumber = savedMasterNumber;
      return savedMasterNumber;
    }

    // STEP 3: Check environment variable
    const envMasterNumber = process.env.BOT_MASTER_NUMBER;
    if (envMasterNumber) {
      console.log(`\n✅ Using master number from environment: ${envMasterNumber}`);
      this.selectedMasterNumber = envMasterNumber;
      await this.sessionStateManager.setMasterPhoneNumber(envMasterNumber);
      return envMasterNumber;
    }

    // STEP 4: If no saved/env number, prompt user
    this.initializeInput();
    
    const choice = await this.displayMainMenu();

    switch (choice) {
      case '1':
        const number = await this.enterPhoneNumber();
        if (number) {
          await this.sessionStateManager.setMasterPhoneNumber(number);
        }
        return number;
      
      case '2':
        const defaultNumber = '+971505760056';
        console.log(`\n✅ Using default master number: ${defaultNumber}\n`);
        this.selectedMasterNumber = defaultNumber;
        await this.sessionStateManager.setMasterPhoneNumber(defaultNumber);
        return defaultNumber;
      
      case '3':
        console.log(`\n⏭️  Skipping master account setup. You can set it up anytime.\n`);
        return null;
      
      default:
        console.log(`\n❌ Invalid choice. Please select 1, 2, or 3.\n`);
        return await this.getMasterPhoneNumber();
    }
  }

  /**
   * Prompt user to enter phone number with validation
   */
  async enterPhoneNumber() {
    const number = await this.askQuestion(`\nEnter your WhatsApp phone number (e.g., +971505760056): `);
    
    // Basic validation
    if (!this.validatePhoneNumber(number)) {
      console.log(`\n❌ Invalid phone number format. Expected: +[country_code][number]`);
      console.log(`   Example: +971505760056\n`);
      return await this.enterPhoneNumber();
    }

    console.log(`\n✅ Phone number confirmed: ${number}\n`);
    this.selectedMasterNumber = number;
    return number;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(number) {
    // Accept: +[digits] or [digits only]
    const phoneRegex = /^(\+?\d{10,15})$/;
    return phoneRegex.test(number.replace(/\s/g, ''));
  }

  /**
   * Normalize phone number to +[country][number] format
   */
  normalizePhoneNumber(number) {
    let cleaned = number.replace(/[\s\-\(\)]/g, '');
    
    // If already starts with +, return as-is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If it's just digits, assume UAE (+971) if not specified
    if (/^\d+$/.test(cleaned)) {
      if (!cleaned.startsWith('971')) {
        return `+971${cleaned}`;
      }
      return `+${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Guide user through QR code linking process
   */
  async guideQRCodeLinking(phoneNumber, qrCodeFn) {
    this.initializeInput();

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║           📱 WHATSAPP QR CODE LINKING GUIDE              ║`);
    console.log(`║                                                            ║`);
    console.log(`║              Master Account: ${phoneNumber.padEnd(35)} ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log(`📖 FOLLOW THESE STEPS TO LINK YOUR DEVICE:\n`);
    console.log(`  1️⃣  Open WhatsApp on your phone`);
    console.log(`  2️⃣  Go to: Settings → Linked Devices → Link a Device`);
    console.log(`  3️⃣  Point your phone camera at the QR code below`);
    console.log(`  4️⃣  Wait for the device to link (this may take 30-60 seconds)\n`);

    console.log(`⏱️  TIMEOUT: 4 minutes\n`);

    // Display QR code
    if (typeof qrCodeFn === 'function') {
      await qrCodeFn();
    }

    // Wait for user confirmation
    console.log();
    const confirmed = await this.askYesNo('✅ Did you successfully scan the QR code?');

    return confirmed;
  }

  /**
   * Show recovery menu if QR linking failed
   */
  async showRecoveryMenu() {
    this.initializeInput();

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║              ⚠️  TROUBLESHOOTING MENU                     ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log(`❌ Device linking failed. Let's troubleshoot:\n`);

    console.log(`📋 OPTIONS:`);
    console.log(`  1️⃣  Try again with a new QR code`);
    console.log(`  2️⃣  Wait 30 seconds and try again`);
    console.log(`  3️⃣  Manual linking (see instructions below)`);
    console.log(`  4️⃣  Skip master account setup for now`);
    console.log();

    const choice = await this.askQuestion(`Your choice (1-4): `);

    switch (choice) {
      case '1':
        return 'retry';
      case '2':
        console.log(`\n⏳ Waiting 30 seconds...\n`);
        await this.sleep(30000);
        return 'retry';
      case '3':
        this.showManualLinkingInstructions();
        return 'manual';
      case '4':
        return 'skip';
      default:
        console.log(`\n❌ Invalid choice.\n`);
        return await this.showRecoveryMenu();
    }
  }

  /**
   * Show manual linking instructions
   */
  showManualLinkingInstructions() {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║          📖 MANUAL WHATSAPP WEB LINKING GUIDE            ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log(`If QR code scanning doesn't work, try this alternative:\n`);

    console.log(`OPTION A: WhatsApp Web (Browser)`);
    console.log(`  1. Open https://web.whatsapp.com on a desktop browser`);
    console.log(`  2. On your phone, open WhatsApp`);
    console.log(`  3. Go to: Settings → Linked Devices → Link a Device`);
    console.log(`  4. Scan the QR code shown on whatsapp.com\n`);

    console.log(`OPTION B: Pairing Code (Newer WhatsApp Versions)`);
    console.log(`  1. Go to: Settings → Linked Devices → Link a Device`);
    console.log(`  2. Tap "Link with Pairing Code"`);
    console.log(`  3. Copy the 8-digit code`);
    console.log(`  4. When prompted in this bot, paste the pairing code\n`);

    console.log(`OPTION C: Restart the Bot`);
    console.log(`  The bot will generate a fresh QR code on restart.`);
    console.log(`  Sometimes this helps if the QR was corrupted.\n`);

    console.log(`If you continue to experience issues, check that:`);
    console.log(`  ✓ Your WhatsApp account is active (not logged out)`);
    console.log(`  ✓ You're not already linked to another WhatsApp Web device`);
    console.log(`  ✓ Your phone has internet connection`);
    console.log(`  ✓ Chrome/Chromium is installed and updated\n`);
  }

  /**
   * Show success message after linking
   */
  showSuccessMessage(phoneNumber) {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║              ✅ DEVICE LINKED SUCCESSFULLY!              ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log(`🎉 Great! Your WhatsApp account is now linked:\n`);
    console.log(`  Phone Number: ${phoneNumber}`);
    console.log(`  Status: 🟢 CONNECTED`);
    console.log(`  Role: Master Account (Lion0)\n`);

    console.log(`🚀 Linda Bot is now ready to use!\n`);

    console.log(`📝 NEXT STEPS:`);
    console.log(`  1. Send a test message to verify the connection`);
    console.log(`  2. Check the terminal dashboard for real-time status`);
    console.log(`  3. Review logs for any warnings or errors\n`);
  }

  /**
   * Sleep for a given milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

export { InteractiveMasterAccountSelector };
export default InteractiveMasterAccountSelector;
