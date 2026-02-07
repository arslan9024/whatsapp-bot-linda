/**
 * Add New Project to MyProjects.js
 * 
 * Usage: node addNewProject.js --name "Akoya-Oxygen-2023-Arslan-Organized" --id "SHEET_ID_HERE"
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function addNewProject() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('\n❌ Missing arguments!\n');
    console.log('Usage:');
    console.log('  node addNewProject.js --id "SHEET_ID" --name "Project Name"\n');
    console.log('Example:');
    console.log('  node addNewProject.js --id "1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz" --name "Akoya-Oxygen-2023-Arslan-Organized"\n');
    process.exit(1);
  }

  let projectId = null;
  let projectName = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' && i + 1 < args.length) {
      projectId = args[i + 1];
      i++;
    } else if (args[i] === '--name' && i + 1 < args.length) {
      projectName = args[i + 1];
      i++;
    }
  }

  if (!projectId || !projectName) {
    console.log('❌ Missing --id or --name argument\n');
    process.exit(1);
  }

  try {
    console.log('\n📝 ADDING NEW PROJECT TO MyProjects.js\n');
    console.log(`Project Name: ${projectName}`);
    console.log(`Sheet ID: ${projectId}\n`);

    const file = path.join(__dirname, 'code/MyProjects/MyProjects.js');
    let content = readFileSync(file, 'utf-8');

    // Find the last project entry
    const lastCommaIndex = content.lastIndexOf('},');
    if (lastCommaIndex === -1) {
      throw new Error('Could not find last project entry in MyProjects.js');
    }

    // Find the next available ProjectID
    const matches = content.match(/ProjectID:\s*(\d+)/g);
    const maxId = Math.max(...matches.map(m => parseInt(m.match(/\d+/)[0])));
    const newId = maxId + 1;

    // Create new entry
    const newEntry = `  { ProjectID: ${newId}, ProjectName: "${projectName}", ProjectSheetID: "${projectId}" },`;

    // Insert before the closing ]
    const closingBracket = content.lastIndexOf('];');
    if (closingBracket === -1) {
      throw new Error('Could not find closing bracket in MyProjects.js');
    }

    const updatedContent = 
      content.slice(0, closingBracket) + 
      '\n' + newEntry + '\n' +
      content.slice(closingBracket);

    // Write back
    writeFileSync(file, updatedContent);

    console.log(`✅ Project added successfully!\n`);
    console.log(`New Entry:`);
    console.log(newEntry);
    console.log(`\n📊 New ProjectID: ${newId}`);
    console.log(`📄 File updated: code/MyProjects/MyProjects.js\n`);

    // Also update MyProjectsWMN if it exists
    const wmnFile = path.join(__dirname, 'code/MyProjects/MyProjectsWMN.js');
    try {
      let wmnContent = readFileSync(wmnFile, 'utf-8');
      const wmnNewEntry = newEntry.replace('MyProjects', '').trim();
      
      const wmnClosingBracket = wmnContent.lastIndexOf('];');
      const wmnUpdatedContent = 
        wmnContent.slice(0, wmnClosingBracket) + 
        '\n' + newEntry + '\n' +
        wmnContent.slice(wmnClosingBracket);

      writeFileSync(wmnFile, wmnUpdatedContent);
      console.log(`📄 Also updated: code/MyProjects/MyProjectsWMN.js\n`);
    } catch (e) {
      console.log(`⚠️  Could not update MyProjectsWMN.js (file not found or error)\n`);
    }

    console.log('✨ Done! Your project is now registered.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message, '\n');
    process.exit(1);
  }
}

addNewProject();
