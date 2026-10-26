/**
 * Browser Cleanup Utility
 * Handles browser lock issues and ensures clean shutdown
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Kill any running browser/node processes
 */
export async function killBrowserProcesses() {
  try {
    console.log('🧹 Killing browser processes...');
    
    if (process.platform === 'win32') {
      // Windows — kill only Chrome/Chromium, NOT node.exe (that would kill the bot itself)
      await execAsync('taskkill /F /IM chrome.exe 2>nul', { windowsHide: true }).catch(() => {});
      await execAsync('taskkill /F /IM chromium.exe 2>nul', { windowsHide: true }).catch(() => {});
    } else {
      // Linux/Mac — kill only Chrome/Chromium, NOT node
      await execAsync('pkill -9 chrome').catch(() => {});
      await execAsync('pkill -9 chromium').catch(() => {});
    }
    
    console.log('✅ Browser processes killed');
  } catch (error) {
    console.warn('⚠️  Could not kill all browser processes:', error.message);
  }
}

/**
 * Clean up session directories and browser cache
 */
export async function cleanupSessions() {
  try {
    console.log('🧹 Cleaning up sessions...');
    
    const sessionsDir = path.join(process.cwd(), 'sessions');
    if (fs.existsSync(sessionsDir)) {
      fs.rmSync(sessionsDir, { recursive: true, force: true });
      console.log('✅ Sessions directory cleaned');
    }
  } catch (error) {
    console.warn('⚠️  Could not clean sessions:', error.message);
  }
}

/**
 * Clean up browser cache and locks
 */
export async function cleanupBrowserCache() {
  try {
    console.log('🧹 Cleaning browser cache...');
    
    const appDataPath = process.env.APPDATA || process.env.HOME;
    if (!appDataPath) return;

    const chromiumPath = path.join(appDataPath, 'chromium');
    if (fs.existsSync(chromiumPath)) {
      fs.rmSync(chromiumPath, { recursive: true, force: true });
      console.log('✅ Browser cache cleaned');
    }
  } catch (error) {
    console.warn('⚠️  Could not clean browser cache:', error.message);
  }
}

/**
 * Full cleanup - sessions, browser, and processes
 */
export async function fullCleanup() {
  console.log('\n🔄 performing full cleanup...');
  await killBrowserProcesses();
  await sleep(1000);
  await cleanupSessions();
  await cleanupBrowserCache();
  console.log('✅ Full cleanup complete\n');
}

/**
 * Graceful shutdown handler
 */
export function setupShutdownHandlers(client) {
  const shutdown = async (signal) => {
    console.log(`\n⏹️  ${signal} received, shutting down gracefully...`);
    
    try {
      if (client) {
        await client.destroy();
        console.log('✅ WhatsApp client destroyed');
      }
    } catch (error) {
      console.error('Error destroying client:', error.message);
    }
    
    process.exit(0);
  };

  // Handle termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('\n❌ Uncaught Exception:', error);
    await fullCleanup();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
    await fullCleanup();
    process.exit(1);
  });
}

export default {
  sleep,
  killBrowserProcesses,
  cleanupSessions,
  cleanupBrowserCache,
  fullCleanup,
  setupShutdownHandlers
};
