/**
 * Akoya-Oxygen-2023 Sheet Analysis Script
 * Analyzes the original sheet and displays structure
 * 
 * Usage: node code/Integration/Google/services/analyzeAkoyaSheet.js
 */

import SheetDataAnalyzer from './SheetDataAnalyzer.js';
import { MyProjectsWMN } from '../../../MyProjects/MyProjectsWMN.js';
import { logger } from '../utils/logger.js';

async function analyzeAkoyaOxygenSheet() {
  try {
    console.clear();
    console.log('\n🔍 ANALYZING AKOYA-OXYGEN-2023-ARSLAN-ONLY SHEET\n');
    console.log('Finding sheet ID from projects list...\n');

    // Find the sheet ID
    const project = MyProjectsWMN.find(
      p => p.ProjectName === 'Akoya-Oxygen-2023-Arslan-only'
    );

    if (!project) {
      throw new Error('Sheet "Akoya-Oxygen-2023-Arslan-only" not found in MyProjectsWMN.js');
    }

    console.log(`✅ Found: ${project.ProjectName}`);
    console.log(`📄 Sheet ID: ${project.ProjectSheetID}\n`);

    // Analyze the sheet
    console.log('⏳ Analyzing sheet structure...\n');
    const analysis = await SheetDataAnalyzer.analyzeSheet(project.ProjectSheetID);

    // Display summary
    const summary = SheetDataAnalyzer.getSummary(analysis);
    console.log(summary);

    // Generate recommended schema
    console.log('\n📋 RECOMMENDED ORGANIZED COLUMNS:\n');
    const schema = SheetDataAnalyzer.generateOrganizedSchema(analysis);
    schema.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });

    console.log('\n✅ Analysis complete!\n');
    console.log('📊 Analysis Details Available:');
    console.log('  - analysis.columns: Detailed column info');
    console.log('  - analysis.dataRows: Number of data rows');
    console.log('  - analysis.sampleData: Sample from first/middle/last row\n');

    return {
      project,
      analysis,
      schema,
    };
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify Google credentials are configured');
    console.error('2. Check sheet ID is correct');
    console.error('3. Ensure sheet is accessible\n');
    process.exit(1);
  }
}

// Run analysis
const result = await analyzeAkoyaOxygenSheet();

// Export for use in other scripts
export default result;
