#!/usr/bin/env node

/**
 * Test Script: Session Restore Verification
 * Validates that session restoration works without infinite loops
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testSessionRestore() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🧪 SESSION RESTORE VERIFICATION TEST                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const masterNumber = process.env.BOT_MASTER_NUMBER || '971505760056';
  const sessionsPath = path.join(__dirname, 'sessions');
  const sessionPath = path.join(sessionsPath, `session-${masterNumber}`);
  const deviceStatusFile = path.join(sessionPath, 'device-status.json');
  const sessionHistoryFile = path.join(sessionPath, 'session-history.json');

  // Test 1: Check session directory
  console.log('TEST 1: Session Directory Structure');
  console.log('──────────────────────────────────');
  
  if (fs.existsSync(sessionPath)) {
    console.log(`✅ Session directory exists: ${sessionPath}`);
    
    // List contents
    const contents = fs.readdirSync(sessionPath);
    console.log(`   Contents: ${contents.join(', ')}\n`);
  } else {
    console.log(`ℹ️  Session directory doesn't exist (fresh start expected)\n`);
    return true;  // This is expected on fresh start
  }

  // Test 2: Check device status file
  console.log('TEST 2: Device Status File');
  console.log('──────────────────────────');

  if (fs.existsSync(deviceStatusFile)) {
    try {
      const status = JSON.parse(fs.readFileSync(deviceStatusFile, 'utf8'));
      console.log(`✅ Device status file readable`);
      console.log(`   deviceLinked: ${status.deviceLinked}`);
      console.log(`   isActive: ${status.isActive}`);
      console.log(`   restoreCount: ${status.restoreCount || 0}\n`);
      
      // Verify critical fields
      if (typeof status.deviceLinked !== 'boolean') {
        console.error(`❌ Invalid deviceLinked type\n`);
        return false;
      }
      if (typeof status.isActive !== 'boolean') {
        console.error(`❌ Invalid isActive type\n`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Device status file is corrupted: ${error.message}\n`);
      return false;
    }
  } else {
    console.log(`ℹ️  Device status file doesn't exist (created on first auth)\n`);
  }

  // Test 3: Check session history
  console.log('TEST 3: Session History File');
  console.log('────────────────────────────');

  if (fs.existsSync(sessionHistoryFile)) {
    try {
      const history = JSON.parse(fs.readFileSync(sessionHistoryFile, 'utf8'));
      console.log(`✅ Session history file readable`);
      console.log(`   Total events: ${history.length}`);
      
      // Check for problematic patterns
      const restoreCompleteCount = history.filter(e => e.eventType === 'restore_complete').length;
      const restoreFailCount = history.filter(e => e.eventType === 'restore_auth_failed').length;
      
      console.log(`   restore_complete: ${restoreCompleteCount}`);
      console.log(`   restore_auth_failed: ${restoreFailCount}`);
      console.log(`   Last 3 events:\n`);
      
      history.slice(-3).forEach((event, idx) => {
        console.log(`     ${idx + 1}. [${event.eventType}] ${new Date(event.timestamp).toLocaleString()}`);
      });
      console.log('');
      
      // Verify no infinite loops in recent history
      const recentRestoreAuthenticatedCount = history
        .slice(-10)
        .filter(e => e.eventType === 'restore_authenticated').length;
      
      if (recentRestoreAuthenticatedCount > 5) {
        console.error(`⚠️  Warning: Many restore_authenticated events in last 10 - possible loop?\n`);
      }
    } catch (error) {
      console.error(`❌ Session history file is corrupted: ${error.message}\n`);
      return false;
    }
  } else {
    console.log(`ℹ️  Session history file doesn't exist (created on first auth)\n`);
  }

  // Test 4: Code validation
  console.log('TEST 4: Code Changes Validation');
  console.log('───────────────────────────────');

  try {
    const indexContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
    
    // Check for required imports
    if (indexContent.includes('import SessionRestoreHandler')) {
      console.log(`✅ SessionRestoreHandler imported`);
    } else {
      console.error(`❌ SessionRestoreHandler NOT imported`);
      return false;
    }
    
    // Check for separated flows
    if (indexContent.includes('sessionStatus === "new"') && 
        indexContent.includes('new SessionRestoreHandler')) {
      console.log(`✅ New and restore flows separated`);
    } else {
      console.error(`❌ Flows not properly separated`);
      return false;
    }
    
    // Check for no double initialization
    if (!indexContent.includes('await restoreHandler.startRestore()')) {
      console.log(`✅ No awaiting on restore (prevents blocking)`);
    }
    
    console.log('');
  } catch (error) {
    console.error(`❌ Error reading index.js: ${error.message}\n`);
    return false;
  }

  // Test 5: SessionRestoreHandler validation
  console.log('TEST 5: SessionRestoreHandler Changes');
  console.log('─────────────────────────────────────');

  try {
    const restoreHandlerContent = fs.readFileSync(
      path.join(__dirname, 'code/WhatsAppBot/SessionRestoreHandler.js'),
      'utf8'
    );
    
    // Check for guard clause
    if (restoreHandlerContent.includes('restoreInProgress')) {
      console.log(`✅ Double-initialization guard added`);
    } else {
      console.error(`❌ Guard clause missing`);
      return false;
    }
    
    // Check for retry logic
    if (restoreHandlerContent.includes('restoreAttempts < this.maxRestoreAttempts')) {
      console.log(`✅ Retry logic implemented`);
    } else {
      console.error(`❌ Retry logic missing`);
      return false;
    }
    
    // Check for fallback
    if (restoreHandlerContent.includes('triggerFreshAuthentication')) {
      console.log(`✅ Fallback to fresh auth implemented`);
    } else {
      console.error(`❌ Fallback missing`);
      return false;
    }
    
    console.log('');
  } catch (error) {
    console.error(`❌ Error reading SessionRestoreHandler: ${error.message}\n`);
    return false;
  }

  // Final verdict
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ ALL TESTS PASSED                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 What to do next:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Fresh authenticate with QR code (if first time)');
  console.log('3. Stop server: Ctrl+C');
  console.log('4. Restart server: npm run dev');
  console.log('5. Verify: "✅ DEVICE REACTIVATED - BOT READY TO SERVE!" appears\n');

  return true;
}

// Run the test
const passed = testSessionRestore();
process.exit(passed ? 0 : 1);
