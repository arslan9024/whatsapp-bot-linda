#!/usr/bin/env node

/**
 * ============================================================================
 * EXAMPLE: HOW TO USE WRITE-BACK & ANALYTICS SERVICES
 * ============================================================================
 * 
 * This script demonstrates:
 * 1. Writing new leads to the organized sheet
 * 2. Generating analytics reports
 * 3. Checking data quality
 * 
 * Usage:
 *   node examples/WriteBackAndAnalytics-Example.js
 * 
 * ============================================================================
 */

import WriteBackService from '../code/Services/WriteBackService.js';
import { AnalyticsService } from '../code/Services/AnalyticsService.js';
import { google } from 'googleapis';
import { getPowerAgent } from '../code/GoogleAPI/main.js';

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   WRITE-BACK & ANALYTICS - INTEGRATION EXAMPLE                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // ====================================================================
    // PART 1: INITIALIZE WRITE-BACK SERVICE
    // ====================================================================
    console.log('\n📝 PART 1: WRITE-BACK SERVICE\n');

    const writeBack = new WriteBackService();
    const initialized = await writeBack.initialize();

    if (!initialized) {
      throw new Error('Failed to initialize WriteBackService');
    }

    // ====================================================================
    // PART 2: APPEND SINGLE LEAD
    // ====================================================================
    console.log('\n📝 PART 2: APPEND SINGLE LEAD\n');

    const newLead = {
      name: 'Ahmed Al-Mansouri',
      phone: '+971501234567',
      email: 'ahmed@example.com',
      whatsapp: '+971501234567',
      location: 'Downtown Dubai',
      property_type: 'Apartment',
      bedrooms: '2',
      budget: '500000',
      source: 'WhatsApp',
      notes: 'Interested in 2BR apartments with gym'
    };

    console.log('Single lead to append:');
    console.log(JSON.stringify(newLead, null, 2));

    const singleResult = await writeBack.appendLead(newLead, {
      source: 'example_script',
      timestamp: new Date().toISOString()
    });

    console.log('\nResult:');
    console.log(JSON.stringify(singleResult, null, 2));

    // ====================================================================
    // PART 3: APPEND BATCH OF LEADS
    // ====================================================================
    console.log('\n\n📝 PART 3: APPEND BATCH OF LEADS\n');

    const batchLeads = [
      {
        name: 'Fatima Al-Shams',
        phone: '+971507654321',
        email: 'fatima@example.com',
        whatsapp: '+971507654321',
        location: 'Marina',
        property_type: 'Villa',
        bedrooms: '4',
        budget: '2000000',
        source: 'WhatsApp'
      },
      {
        name: 'Mohammed Hassan',
        phone: '+971509876543',
        email: 'mohammed@example.com',
        whatsapp: '+971509876543',
        location: 'JBR',
        property_type: 'Apartment',
        bedrooms: '1',
        budget: '250000',
        source: 'WhatsApp'
      },
      {
        name: 'Sara Al-Mazrouei',
        phone: '+971503334444',
        email: 'sara@example.com',
        whatsapp: '+971503334444',
        location: 'Downtown Dubai',
        property_type: 'Studio',
        bedrooms: '0',
        budget: '150000',
        source: 'WhatsApp'
      }
    ];

    console.log(`Appending ${batchLeads.length} leads...`);

    const batchResult = await writeBack.appendBatch(batchLeads, {
      source: 'example_script_batch',
      timestamp: new Date().toISOString()
    });

    console.log('\nBatch Result:');
    console.log(JSON.stringify(batchResult, null, 2));

    // ====================================================================
    // PART 4: INITIALIZE ANALYTICS SERVICE
    // ====================================================================
    console.log('\n\n📊 PART 4: ANALYTICS SERVICE\n');

    const analytics = new AnalyticsService();
    const analyticsInit = await analytics.initialize();

    if (!analyticsInit) {
      throw new Error('Failed to initialize AnalyticsService');
    }

    // ====================================================================
    // PART 5: GENERATE ANALYTICS REPORT
    // ====================================================================
    console.log('\n📊 PART 5: GENERATE ANALYTICS REPORT\n');

    const report = await analytics.generateReport();

    if (!report.error) {
      const textReport = analytics.generateSheetReport(report);
      console.log(textReport);

      // Save report to file
      const fs = await import('fs');
      const reportPath = './analytics-report.txt';
      fs.writeFileSync(reportPath, textReport);
      console.log(`\n✅ Report saved to: ${reportPath}`);
    } else {
      console.log('❌ Error generating report:', report.error);
    }

    // ====================================================================
    // PART 6: GET WRITE-BACK STATS
    // ====================================================================
    console.log('\n\n📈 PART 6: WRITE-BACK STATS\n');

    const stats = writeBack.getStats();
    console.log('Codes assigned in this session:');
    console.log(JSON.stringify(stats, null, 2));

    // ====================================================================
    // SUMMARY
    // ====================================================================
    console.log('\n\n✅ EXAMPLE COMPLETE\n');
    console.log('What was demonstrated:');
    console.log('  1. ✅ Single lead write-back with auto-code assignment');
    console.log('  2. ✅ Batch write-back of multiple leads');
    console.log('  3. ✅ Real-time analytics report generation');
    console.log('  4. ✅ Data quality analysis');
    console.log('  5. ✅ Location distribution analysis');
    console.log('  6. ✅ Contact information completeness check');
    console.log('\nNext steps:');
    console.log('  - Integrate WriteBackService into your bot handlers');
    console.log('  - Schedule AnalyticsService for daily reports');
    console.log('  - Set up notifications based on analytics thresholds');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
