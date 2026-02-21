/**
 * ORCHESTRATION SCRIPT
 * 
 * Complete workflow for:
 * 1. Reading original sheet
 * 2. Deduplicating records
 * 3. Assigning codes
 * 4. Creating organized sheet with specialized tabs
 * 5. Loading context into memory for bot access
 * 6. Running analytics
 * 
 * Usage: node organizeAndAnalyzeSheet.js --original-id "SHEET_ID" --new-name "Sheet Name"
 */

import { EnhancedSheetOrganizer } from './code/Services/EnhancedSheetOrganizer.js';
import { DataContextService } from './code/Services/DataContextService.js';
import { AnalyticsService } from './code/Services/AnalyticsService.js';
import { AIContextIntegration } from './code/Services/AIContextIntegration.js';
import { GoogleServicesConsolidated } from './code/Integration/Google/GoogleServicesConsolidated.js';
import { Logger } from './code/Utils/Logger.js';

const logger = new Logger('OrchestrationScript');

class OrchestrationScript {
  constructor() {
    this.organizer = new EnhancedSheetOrganizer();
    this.dataContextService = new DataContextService();
    this.analyticsService = new AnalyticsService();
    this.aiContextIntegration = new AIContextIntegration(
      this.dataContextService
    );
  }

  /**
   * Main orchestration flow
   */
  async execute(config) {
    try {
      const {
        originalSheetId,
        newSheetName = 'Organized-Sheet',
        runAnalytics = true,
        loadContext = true
      } = config;

      logger.info('╔════════════════════════════════════════════╗');
      logger.info('║  SHEET ORGANIZATION & ANALYSIS PIPELINE    ║');
      logger.info('║         Complete Workflow v1.0             ║');
      logger.info('╚════════════════════════════════════════════╝\n');

      // PHASE 1: Organization
      logger.info('═══════════════════════════════════════════');
      logger.info('PHASE 1: SHEET ORGANIZATION');
      logger.info('═══════════════════════════════════════════\n');

      const googleAuth = new GoogleServicesConsolidated();
      const auth = await googleAuth.getAuthClient();

      const organizationResult = await this.organizer.organizeSheet({
        originalSheetId,
        newSheetName,
        auth
      });

      if (!organizationResult.success) {
        throw new Error('Sheet organization failed');
      }

      logger.info(`\n✅ Sheet Organization Complete`);
      logger.info(`   New Sheet ID: ${organizationResult.newSheetId}`);
      logger.info(`   Records: ${organizationResult.original Records} → ${organizationResult.deduplicatedRecords}`);
      logger.info(`   Duplicates Removed: ${organizationResult.duplicatesRemoved}`);

      // PHASE 2: Context Loading (optional)
      if (loadContext) {
        logger.info('\n═══════════════════════════════════════════');
        logger.info('PHASE 2: LOADING DATA CONTEXT');
        logger.info('═══════════════════════════════════════════\n');

        try {
          const contextStats = await this.dataContextService.loadContext(
            organizationResult.newSheetId
          );

          logger.info(`\n✅ Data Context Loaded`);
          logger.info(`   Total Records: ${contextStats.stats.totalRecords}`);
          logger.info(`   Load Time: ${contextStats.stats.loadTime}ms`);
        } catch (error) {
          logger.warn(`⚠️  Context loading failed: ${error.message}`);
          logger.warn('   Continuing without context...');
        }
      }

      // PHASE 3: Analytics (optional)
      if (runAnalytics) {
        logger.info('\n═══════════════════════════════════════════');
        logger.info('PHASE 3: RUNNING ANALYTICS');
        logger.info('═══════════════════════════════════════════\n');

        // These would use data from the organization result
        const analyticsReport = this._generateAnalyticsReport(organizationResult);

        logger.info(`\n📊 Analytics Report Generated`);
        logger.info(JSON.stringify(analyticsReport.summary, null, 2));

        // Export analytics data
        const analyticsData = this.analyticsService.exportAsSheetData();
        logger.info(`\n   Analytics data ready for export (${analyticsData.length} rows)`);
      }

      // PHASE 4: AI Integration setup (optional)
      if (loadContext) {
        logger.info('\n═══════════════════════════════════════════');
        logger.info('PHASE 4: AI CONTEXT INTEGRATION');
        logger.info('═══════════════════════════════════════════\n');

        try {
          await this.aiContextIntegration.initialize(organizationResult.newSheetId);

          logger.info(`\n✅ AI Context Integration Ready`);
          logger.info('   Status: Ready for bot message processing');
          logger.info('   Features available:');
          logger.info('     - Message context enrichment');
          logger.info('     - Code-based record lookup');
          logger.info('     - Fuzzy contact matching');
          logger.info('     - Context-aware response generation');
        } catch (error) {
          logger.warn(`⚠️  AI Context initialization failed: ${error.message}`);
        }
      }

      // FINAL: Summary
      logger.info('\n═══════════════════════════════════════════');
      logger.info('WORKFLOW COMPLETE');
      logger.info('═══════════════════════════════════════════\n');

      return {
        success: true,
        organization: organizationResult,
        dataContextLoaded: this.dataContextService.isLoaded,
        aiIntegrationReady: this.aiContextIntegration.isInitialized,
        nextSteps: [
          `1. Verify new sheet: https://docs.google.com/spreadsheets/d/${organizationResult.newSheetId}`,
          `2. Check Master Data tab for all deduplicated records with codes`,
          `3. Review Code Reference Map tab to understand code assignments`,
          `4. Access Data Viewer tab for interactive searching`,
          `5. Use Data Context Service in your bot code for context-aware responses`,
          `6. Load DataContextService in bot startup to enable AI features`
        ]
      };
    } catch (error) {
      logger.error(`\n❌ Orchestration failed: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Generate analytics report
   */
  _generateAnalyticsReport(organizationResult) {
    return {
      summary: {
        timestamp: new Date().toISOString(),
        originalRecords: organizationResult.originalRecords,
        deduplicatedRecords: organizationResult.deduplicatedRecords,
        duplicatesRemoved: organizationResult.duplicatesRemoved,
        reductionPercentage: Math.round(
          (organizationResult.duplicatesRemoved / organizationResult.originalRecords) * 100
        ),
        codeStatistics: organizationResult.codeStats,
        tabs: organizationResult.tabs
      },
      recommendations: [
        organizationResult.duplicatesRemoved > 0 
          ? `✅ ${organizationResult.duplicatesRemoved} duplicate records removed`
          : '✅ No duplicates found',
        
        organizationResult.deduplicatedRecords > 1000
          ? `⚠️  Large dataset (${organizationResult.deduplicatedRecords} records). Consider pagination in Data Viewer.`
          : '✅ Dataset size is manageable',

        organizationResult.codeStats.byType.contacts > 0
          ? `📞 ${organizationResult.codeStats.byType.contacts} contact codes assigned (C prefix)`
          : '',

        organizationResult.codeStats.byType.properties > 0
          ? `🏢 ${organizationResult.codeStats.byType.properties} property codes assigned (P prefix)`
          : '',

        organizationResult.codeStats.byType.financials > 0
          ? `💰 ${organizationResult.codeStats.byType.financials} financial codes assigned (F prefix)`
          : '',

        '✨ Ready for bot integration with context-aware responses'
      ].filter(r => r)
    };
  }

  /**
   * Test message enrichment
   */
  testMessageEnrichment(messageText) {
    if (!this.aiContextIntegration.isInitialized) {
      logger.warn('AI Integration not initialized. Call initialize() first.');
      return;
    }

    logger.info(`\n🧪 Testing Message Enrichment`);
    logger.info(`   Message: "${messageText}"\n`);

    const context = this.dataContextService.buildMessageContext(messageText);

    logger.info(`✅ Extracted Context:`);
    logger.info(`   Codes found: ${context.extracted.codes.length}`);
    logger.info(`   Contacts found: ${context.extracted.contacts.length}`);
    logger.info(`   Properties found: ${context.extracted.properties.length}`);
    logger.info(`   Total records: ${context.extracted.allMatches.length}\n`);

    if (context.extracted.allMatches.length > 0) {
      logger.info('📋 Match Details:');
      context.extracted.allMatches.forEach((match, idx) => {
        logger.info(`   ${idx + 1}. Type: ${match.type}, Code: ${match.code || match.value}`);
      });
    }

    return context;
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const config = {
    originalSheetId: null,
    newSheetName: null,
    runAnalytics: true,
    loadContext: true
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--original-id' && i + 1 < args.length) {
      config.originalSheetId = args[i + 1];
      i++;
    } else if (args[i] === '--new-name' && i + 1 < args.length) {
      config.newSheetName = args[i + 1];
      i++;
    } else if (args[i] === '--no-analytics') {
      config.runAnalytics = false;
    } else if (args[i] === '--no-context') {
      config.loadContext = false;
    }
  }

  if (!config.originalSheetId) {
    console.log(`\nUsage: node organizeAndAnalyzeSheet.js \\
      --original-id "SHEET_ID" \\
      --new-name "Sheet Name" \\
      [--no-analytics] \\
      [--no-context]\n`);

    console.log('Example:');
    console.log(`  node organizeAndAnalyzeSheet.js \\
      --original-id "1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04" \\
      --new-name "Akoya-Organized-V2"\n`);

    process.exit(1);
  }

  try {
    const orchestration = new OrchestrationScript();
    const result = await orchestration.execute(config);

    console.log('\n✅ WORKFLOW COMPLETED SUCCESSFULLY\n');
    console.log('📋 Next Steps:');
    result.nextSteps.forEach(step => console.log(`   ${step}`));
    console.log('');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

export { OrchestrationScript };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
