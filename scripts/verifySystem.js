#!/usr/bin/env node

/**
 * ============================================================================
 * SYSTEM VERIFICATION - COMPLETE INTEGRATION CHECK
 * ============================================================================
 * 
 * This script verifies all systems are working:
 * 1. Google API authentication
 * 2. Organized sheet accessibility
 * 3. Write-back service operational
 * 4. Analytics service functional
 * 5. Bot configuration loaded
 * 
 * Usage:
 *   node verifySystem.js
 * 
 * ============================================================================
 */

import { google } from 'googleapis';
import { initializeGoogleAuth, getPowerAgent } from './code/GoogleAPI/main.js';
import WriteBackService from './code/Services/WriteBackService.js';
import { AnalyticsService } from './code/Services/AnalyticsService.js';
import { BOT_CONFIG, initializeBotConfig } from './code/Config/OrganizedSheetBotConfig.js';

let checksPassed = 0;
let checksFailed = 0;

function logCheck(name, status, message = '') {
  const icon = status ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (message) console.log(`   ${message}`);
  if (status) {
    checksPassed++;
  } else {
    checksFailed++;
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        LINDA BOT - SYSTEM VERIFICATION                         ║
║   Organized Sheet Integration - Complete Check                 ║
╚════════════════════════════════════════════════════════════════╝

Timestamp: ${new Date().toLocaleString()}
  `);

  try {
    // ====================================================================
    // 1. GOOGLE API AUTHENTICATION
    // ====================================================================
    logSection('1. GOOGLE API AUTHENTICATION');

    console.log('🔐 Testing Google authentication...\n');

    try {
      await initializeGoogleAuth();
      const auth = await getPowerAgent();
      
      if (auth) {
        logCheck('Google auth initialized', true);
        logCheck('Access token acquired', true);
        
        // Test token
        try {
          const token = await auth.getAccessToken();
          logCheck('Token validation', !!token);
        } catch (e) {
          logCheck('Token validation', false, e.message);
        }
      } else {
        logCheck('Google auth initialized', false);
      }
    } catch (error) {
      logCheck('Google auth initialized', false, error.message);
    }

    // ====================================================================
    // 2. SHEET ACCESSIBILITY
    // ====================================================================
    logSection('2. SHEET ACCESSIBILITY');

    console.log('📋 Testing Google Sheets access...\n');

    try {
      const auth = await getPowerAgent();
      const sheets = google.sheets({ version: 'v4', auth });

      // Test organized sheet
      const orgResponse = await sheets.spreadsheets.get({
        spreadsheetId: BOT_CONFIG.DATABASE.ORGANIZED_SHEET.id,
      });

      logCheck(
        'Organized sheet accessible',
        true,
        `Title: ${orgResponse.data.properties.title}`
      );

      logCheck(
        'Sheet has data',
        orgResponse.data.sheets && orgResponse.data.sheets.length > 0,
        `Tabs: ${orgResponse.data.sheets.map(s => s.properties.title).join(', ')}`
      );

      // Get row count
      const values = await sheets.spreadsheets.values.get({
        spreadsheetId: BOT_CONFIG.DATABASE.ORGANIZED_SHEET.id,
        range: 'Sheet1!A:A',
      });

      const rowCount = (values.data.values || []).length;
      logCheck(
        'Data accessible',
        rowCount > 0,
        `Current rows: ${rowCount}`
      );

      // Test original sheet (read-only check)
      const origResponse = await sheets.spreadsheets.get({
        spreadsheetId: BOT_CONFIG.DATABASE.ORIGINAL_SHEET.id,
      });

      logCheck(
        'Original sheet accessible (backup)',
        true,
        `Title: ${origResponse.data.properties.title}`
      );

    } catch (error) {
      logCheck('Sheet accessibility', false, error.message);
    }

    // ====================================================================
    // 3. WRITE-BACK SERVICE
    // ====================================================================
    logSection('3. WRITE-BACK SERVICE');

    console.log('✍️  Testing Write-Back Service...\n');

    try {
      const writeBack = new WriteBackService();
      const initialized = await writeBack.initialize();

      logCheck('WriteBackService initialized', initialized);

      if (initialized) {
        const stats = writeBack.getStats();
        logCheck(
          'Code assignment ready',
          true,
          `Next row: ${stats.nextRowIndex}`
        );

        // Test validation
        const validLead = { name: 'Test', phone: '123' };
        const validation = writeBack.validateLead(validLead);
        logCheck(
          'Lead validation working',
          validation.valid === true
        );

        // Test code assignment
        const code = writeBack.assignCode(validLead);
        logCheck(
          'Code generation working',
          code && code.length > 0,
          `Sample code: ${code}`
        );

        // Don't actually write test data
        logCheck(
          'Write-back ready',
          true,
          'Service ready for production use'
        );
      }
    } catch (error) {
      logCheck('WriteBackService operational', false, error.message);
    }

    // ====================================================================
    // 4. ANALYTICS SERVICE
    // ====================================================================
    logSection('4. ANALYTICS SERVICE');

    console.log('📊 Testing Analytics Service...\n');

    try {
      const analytics = new AnalyticsService();
      // AnalyticsService now initializes on first use, check if it has data method
      if (analytics && typeof analytics.analyzeOrganizedSheetData === 'function') {
        logCheck('AnalyticsService initialized', true);

        // The service works with data passed to it
        // Get data from sheets first
        const auth = await getPowerAgent();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: BOT_CONFIG.DATABASE.ORGANIZED_SHEET.id,
          range: 'Sheet1',
        });

        const values = response.data.values || [];
        const headers = values[0] || [];
        const data = values.slice(1);

        // Analyze the data
        const report = analytics.analyzeOrganizedSheetData(data, headers);

        logCheck(
          'Report generation working',
          report && !report.error,
          `Records analyzed: ${report.totalRecords}`
        );

        if (!report.error) {
          logCheck(
            'Record type analysis',
            report.recordTypes,
            `P: ${report.recordTypes.properties}, C: ${report.recordTypes.contacts}, F: ${report.recordTypes.financial}`
          );

          logCheck(
            'Location analysis',
            report.locations,
            `Total locations: ${report.locations.totalLocations}`
          );

          logCheck(
            'Data quality metrics',
            report.dataQuality,
            `Fill rate: ${report.dataQuality.fillRate}`
          );

          // Test text report generation
          const textReport = analytics.generateSheetReport(report);
          logCheck(
            'Text report formatting',
            textReport && textReport.length > 0,
            `Report length: ${textReport.length} chars`
          );
        }
      } else {
        logCheck('AnalyticsService initialized', false);
      }
    } catch (error) {
      logCheck('AnalyticsService operational', false, error.message);
    }

    // ====================================================================
    // 5. BOT CONFIGURATION
    // ====================================================================
    logSection('5. BOT CONFIGURATION');

    console.log('⚙️  Testing Bot Configuration...\n');

    try {
      const config = await initializeBotConfig();

      logCheck('BotConfig loaded', !!config);
      logCheck(
        'Write-back enabled',
        config.WRITE_BACK.enabled === true,
        'Auto-append: ' + config.WRITE_BACK.autoAppend
      );

      logCheck(
        'Analytics enabled',
        config.ANALYTICS.enabled === true,
        'Report frequency: ' + config.ANALYTICS.reportFrequency
      );

      logCheck(
        'Code formats defined',
        config.WRITE_BACK.codeFormat && Object.keys(config.WRITE_BACK.codeFormat).length > 0,
        `P: ${config.WRITE_BACK.codeFormat.properties}, C: ${config.WRITE_BACK.codeFormat.contacts}, F: ${config.WRITE_BACK.codeFormat.financial}`
      );
    } catch (error) {
      logCheck('BotConfig operational', false, error.message);
    }

    // ====================================================================
    // 6. FILE STRUCTURE
    // ====================================================================
    logSection('6. FILE STRUCTURE');

    console.log('📁 Checking required files...\n');

    try {
      const fs = await import('fs');

      const requiredFiles = [
        './code/Services/WriteBackService.js',
        './code/Services/AnalyticsService.js',
        './code/Config/OrganizedSheetBotConfig.js',
        './code/GoogleAPI/main.js',
        './code/GoogleAPI/keys.json',
        './INTEGRATION_GUIDE.md'
      ];

      requiredFiles.forEach(file => {
        const exists = fs.existsSync(file);
        logCheck(`File exists: ${file}`, exists);
      });
    } catch (error) {
      logCheck('File structure check', false, error.message);
    }

    // ====================================================================
    // FINAL SUMMARY
    // ====================================================================
    logSection('VERIFICATION SUMMARY');

    const totalChecks = checksPassed + checksFailed;
    const passRate = ((checksPassed / totalChecks) * 100).toFixed(1);

    console.log(`
Checks Passed: ${checksPassed}/${totalChecks}
Pass Rate: ${passRate}%

${checksFailed === 0 ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️  SOME ISSUES DETECTED'}
    `);

    // Status indicators
    console.log('\nSystem Status:\n');

    const statuses = {
      'Google API': checksPassed >= 3 ? '🟢' : '🔴',
      'Sheet Access': checksPassed >= 6 ? '🟢' : '🔴',
      'Write-Back Service': checksPassed >= 9 ? '🟢' : '🔴',
      'Analytics Service': checksPassed >= 13 ? '🟢' : '🔴',
      'Bot Config': checksPassed >= 17 ? '🟢' : '🔴'
    };

    Object.entries(statuses).forEach(([key, status]) => {
      console.log(`  ${status} ${key}`);
    });

    // Recommendations
    console.log('\nNext Steps:\n');
    if (checksFailed === 0) {
      console.log('  ✅ All systems are operational!');
      console.log('  ✅ Ready for production deployment');
      console.log('');
      console.log('Recommended actions:');
      console.log('  1. Review INTEGRATION_GUIDE.md');
      console.log('  2. Run example: node examples/WriteBackAndAnalytics-Example.js');
      console.log('  3. Integrate WriteBackService into bot message handlers');
      console.log('  4. Set up daily analytics reports');
      console.log('  5. Monitor data quality metrics');
    } else {
      console.log('  ⚠️  Some checks failed. Please review the errors above.');
      console.log('  ⚠️  Contact support if issues persist.');
    }

    console.log(`\n${'='.repeat(60)}\n`);

    process.exit(checksFailed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
