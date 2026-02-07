#!/usr/bin/env node

/**
 * Quick Report - Connected Sheets Summary (Plain Text)
 * Shows all projects and sheets without formatting for easy parsing
 */

import { MyProjects } from '../../MyProjects/MyProjects.js';

console.log('\n════════════════════════════════════════════════════════════════════');
console.log('                  CONNECTED SHEETS QUICK REPORT');
console.log('════════════════════════════════════════════════════════════════════\n');

// Statistics
console.log('📊 STATISTICS:');
console.log(`   Total Projects: ${MyProjects.length}`);
console.log(`   Date: ${new Date().toLocaleString()}\n`);

// List all projects
console.log('PROJECT LISTING:');
console.log('────────────────────────────────────────────────────────────────────\n');

const padId = (id) => String(id).padEnd(4);
const padName = (name) => name.substring(0, 30).padEnd(32);

MyProjects.forEach((project) => {
  console.log(`${padId(project.ProjectID)} │ ${padName(project.ProjectName)} │ ${project.ProjectSheetID}`);
});

console.log('\n════════════════════════════════════════════════════════════════════');
console.log(`✓ Total ${MyProjects.length} projects listed above`);
console.log('════════════════════════════════════════════════════════════════════\n');

// Export as JSON for programmatic use
const report = {
  timestamp: new Date().toISOString(),
  totalProjects: MyProjects.length,
  projects: MyProjects.map(p => ({
    id: p.ProjectID,
    name: p.ProjectName,
    sheetId: p.ProjectSheetID,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${p.ProjectSheetID}`
  }))
};

console.log('📋 JSON Format Available:');
console.log('   Use: import { MyProjects } from "./code/MyProjects/MyProjects.js"');
console.log('   Then access: MyProjects[index]\n');
