/**
 * Sheet Organization Template Generator (Demo/Template Version)
 * 
 * Generates the complete sheet structure that will be created
 * Can be used to:
 * 1. Preview what the organized sheet will look like
 * 2. Manually create sheets in Google Drive using this template
 * 3. Test the data structure before real API calls
 * 
 * Usage: node generateSheetTemplate.js
 */

import DataViewerTabGenerator from './code/Services/DataViewerTabGenerator.js';
import { writeFileSync, mkdirSync } from 'fs';

function generateCompleteTemplate() {
  console.log('\n🔨 GENERATING SHEET ORGANIZATION TEMPLATE...\n');

  // Sample column headers (will be replaced with actual data from analysis)
  const sampleHeaders = [
    'Contact_Name',
    'Phone_Number',
    'Property_Name',
    'Status',
    'Inquiry_Date',
    'Notes',
    'Email',
    'Amount'
  ];

  const sampleDataRows = 50; // Will be actual row count

  // 1. Generate Data Viewer Tab Structure
  console.log('📋 Tab 1: Data Viewer - Interactive Interface');
  const dataViewerTab = DataViewerTabGenerator.generateDataViewerTab(sampleHeaders);
  console.log(`   Generated ${dataViewerTab.length} rows`);
  console.log(`   Interactive controls for row selection and column filtering\n`);

  // 2. Generate Sample Organized Data Tab
  console.log('📋 Tab 2: Organized Data - Structured Data');
  const organizedDataTab = [
    sampleHeaders,
    ...Array(5).fill(null).map((_, idx) => [
      `Contact ${idx + 1}`,
      `+971501234567`,
      `Property ${idx + 1}`,
      'Active',
      '2026-02-01',
      'Sample note',
      `contact${idx + 1}@example.com`,
      `${(idx + 1) * 50000}`,
    ])
  ];
  console.log(`   Will contain: Headers + ${sampleDataRows} data rows`);
  console.log(`   Sample rows generated for preview\n`);

  // 3. Generate Metadata Tab
  console.log('📋 Tab 3: Metadata - Transformation Information');
  const metadataTab = [
    ['SHEET TRANSFORMATION METADATA'],
    [],
    ['Original Sheet ID', '1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04'],
    ['Organized Date', new Date().toISOString()],
    ['Total Data Rows', sampleDataRows],
    ['Total Columns', sampleHeaders.length],
    [],
    ['COLUMN MAPPING'],
    [],
    ['Original Header', 'Organized Header', 'Column Index'],
    ...sampleHeaders.map((h, idx) => [h, h, idx + 1]),
  ];
  console.log(`   Transformation metadata and column mapping\n`);

  // Create complete template object
  const completeTemplate = {
    name: 'Akoya-Oxygen-2023-Arslan-Organized',
    description: 'Interactive Data Viewer for Akoya-Oxygen-2023 data with organized structure',
    created: new Date().toISOString(),
    tabs: [
      {
        name: 'Data Viewer',
        type: 'interactive',
        rows: dataViewerTab.length,
        description: 'Interactive single-row viewer with column filters',
        data: dataViewerTab,
      },
      {
        name: 'Organized Data',
        type: 'data',
        rows: organizedDataTab.length,
        columns: sampleHeaders.length,
        description: 'Cleaned and normalized data from original sheet',
        headers: sampleHeaders,
        sampleData: organizedDataTab.slice(1, 4),
      },
      {
        name: 'Metadata',
        type: 'metadata',
        rows: metadataTab.length,
        description: 'Transformation metadata and column mapping',
        data: metadataTab,
      },
    ],
    configuration: {
      originalSheetId: '1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04',
      originalSheetName: 'Akoya-Oxygen-2023-Arslan-only',
      newSheetName: 'Akoya-Oxygen-2023-Arslan-Organized',
      locale: 'en_US',
      autoRecalc: 'ON_CHANGE',
    },
    instructions: [
      'TAB 1: Data Viewer',
      '  - Interactive single-row viewer',
      '  - Enter row number in cell B3 to view that row',
      '  - Check/uncheck columns in visibility section to show/hide',
      '  - Filtered columns display below',
      '',
      'TAB 2: Organized Data',
      '  - Contains all data in normalized format',
      '  - Headers are standardized and cleaned',
      '  - Each row has metadata (import date, etc)',
      '',
      'TAB 3: Metadata',
      '  - Shows transformation details',
      '  - Maps original to organized columns',
      '  - Provides audit trail',
    ],
  };

  // Save template
  mkdirSync('./logs/sheet-organization', { recursive: true });
  const templatePath = './logs/sheet-organization/akoya-template.json';
  writeFileSync(templatePath, JSON.stringify(completeTemplate, null, 2));

  console.log('\n✅ TEMPLATE GENERATED SUCCESSFULLY!\n');
  console.log('📄 Files Created:\n');
  console.log(`   ${templatePath}\n`);

  // Create MyProjects entry
  const newProjectEntry = {
    ProjectID: 51,
    ProjectName: 'Akoya-Oxygen-2023-Arslan-Organized',
    ProjectSheetID: '___WILL_BE_PROVIDED_AFTER_SHEET_CREATION___',
  };

  const entriesPath = './logs/sheet-organization/myprojects-entry.js';
  writeFileSync(entriesPath, `// Add this entry to code/MyProjects/MyProjects.js
{ ProjectID: ${newProjectEntry.ProjectID}, ProjectName: "${newProjectEntry.ProjectName}", ProjectSheetID: "${newProjectEntry.ProjectSheetID}" },
`);

  console.log('📋 TEMPLATE STRUCTURE:\n');
  console.log('Sheet Name: Akoya-Oxygen-2023-Arslan-Organized');
  console.log(`Tabs: ${completeTemplate.tabs.length}`);
  completeTemplate.tabs.forEach((tab, idx) => {
    console.log(`  ${idx + 1}. ${tab.name} (${tab.type}) - ${tab.description}`);
  });

  console.log('\n🎯 NEXT STEPS:\n');
  console.log('1️⃣  Create new Google Sheet manually OR provide valid credentials');
  console.log('   Name it: "Akoya-Oxygen-2023-Arslan-Organized"\n');
  console.log('2️⃣  Create 3 tabs with these names:');
  console.log('   • Data Viewer');
  console.log('   • Organized Data');
  console.log('   • Metadata\n');
  console.log('3️⃣  Use the template saved at:');
  console.log(`   ${templatePath}\n`);
  console.log('4️⃣  For automated setup, provide valid Google credentials in:');
  console.log('   ./code/GoogleAPI/keys.json\n');
  console.log('5️⃣  Then run: node organizeAkoyaSheet.js\n');

  console.log('📝 MyProjects.js Entry Template:');
  console.log(`   ${entriesPath}\n`);

  return completeTemplate;
}

// Run generator
const template = generateCompleteTemplate();

export default template;
