/**
 * Analyze Connected Sheets - Shows all projects and their connected Google Sheets
 * Displays detailed information about all connected projects in the terminal
 */

import { MyProjects } from '../../MyProjects/MyProjects.js';
import GoogleCredentialsManager from './GoogleCredentialsManager.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Color mapping for better terminal output
const colors = {
  header: chalk.bgBlue.white.bold,
  success: chalk.green,
  info: chalk.cyan,
  warning: chalk.yellow,
  error: chalk.red,
  projectId: chalk.magenta,
  projectName: chalk.yellow,
  sheetId: chalk.gray,
};

/**
 * Display the header of the analysis
 */
function displayHeader() {
  console.clear();
  console.log('\n');
  console.log(colors.header('═════════════════════════════════════════════════════════════════'));
  console.log(colors.header('           WHATSAPP BOT LINDA - CONNECTED SHEETS ANALYSIS          '));
  console.log(colors.header('═════════════════════════════════════════════════════════════════'));
  console.log('\n');
}

/**
 * Display project statistics
 */
function displayStatistics() {
  const totalProjects = MyProjects.length;
  const projectIds = MyProjects.map(p => p.ProjectID).sort((a, b) => a - b);
  const uniqueSheets = new Set(MyProjects.map(p => p.ProjectSheetID)).size;

  console.log(colors.info('📊 PROJECT STATISTICS'));
  console.log(colors.info('─'.repeat(70)));
  console.log(`   ${colors.success('✓')} Total Projects: ${colors.projectId(totalProjects)}`);
  console.log(`   ${colors.success('✓')} Unique Google Sheets: ${colors.projectId(uniqueSheets)}`);
  console.log(`   ${colors.success('✓')} Project ID Range: ${colors.projectId(projectIds[0])} - ${colors.projectId(projectIds[projectIds.length - 1])}`);
  console.log(`   ${colors.success('✓')} Analysis Date: ${new Date().toLocaleString()}\n`);
}

/**
 * Display all connected sheets in table format
 */
function displayConnectedSheets() {
  console.log(colors.info('📋 CONNECTED PROJECTS & SHEETS'));
  console.log(colors.info('─'.repeat(70)));

  // Create table header
  const headers = ['ID', 'Project Name', 'Google Sheet ID (Truncated)'];
  const colWidths = [5, 25, 35];

  // Print header
  console.log(
    colors.warning(
      `${headers[0].padEnd(colWidths[0])} | ${headers[1].padEnd(colWidths[1])} | ${headers[2].padEnd(colWidths[2])}`
    )
  );
  console.log(colors.warning('─'.repeat(70)));

  // Print each project
  MyProjects.forEach((project, index) => {
    const idStr = String(project.ProjectID).padEnd(colWidths[0]);
    const nameStr = project.ProjectName.substring(0, colWidths[1] - 1).padEnd(colWidths[1]);
    const sheetIdTrunc = `${project.ProjectSheetID.substring(0, 20)}...`;
    const sheetStr = sheetIdTrunc.padEnd(colWidths[2]);

    // Alternate colors for better readability
    const rowColor = index % 2 === 0 ? chalk.white : chalk.gray;
    console.log(
      rowColor(`${colors.projectId(idStr)} | ${colors.projectName(nameStr)} | ${colors.sheetId(sheetStr)}`)
    );
  });

  console.log(colors.info('─'.repeat(70)) + '\n');
}

/**
 * Display detailed project information
 */
function displayDetailed() {
  console.log(colors.info('📦 DETAILED PROJECT INFORMATION'));
  console.log(colors.info('─'.repeat(70)));

  MyProjects.forEach((project) => {
    console.log(`${colors.projectId(`[Project #${project.ProjectID}]`)} ${colors.projectName(project.ProjectName)}`);
    console.log(`  Sheet ID: ${colors.sheetId(project.ProjectSheetID)}`);
    console.log(`  Full URL: ${colors.sheetId(`https://docs.google.com/spreadsheets/d/${project.ProjectSheetID}`)}`);
    console.log('');
  });
}

/**
 * Check Google API credentials using the credentials manager
 */
function checkGoogleCredentials() {
  console.log(colors.info('🔐 GOOGLE API CREDENTIALS CHECK'));
  console.log(colors.info('─'.repeat(70)));

  try {
    GoogleCredentialsManager.loadCredentials();
    GoogleCredentialsManager.validate();

    const creds = GoogleCredentialsManager.getCredentials();
    const path = GoogleCredentialsManager.getCredentialsPath();

    console.log(colors.success('✓ Google API credentials configured'));
    console.log(`  ${colors.info('→')} Location: ${path}`);
    console.log(`  ${colors.info('→')} Project ID: ${creds.project_id}`);
    console.log(`  ${colors.info('→')} Email: ${creds.client_email}`);
    console.log(`  ${colors.info('→')} Key Type: ${creds.type}`);
    console.log(`  ${colors.success('✓')} All validations passed`);
  } catch (error) {
    console.log(colors.error('✗ Credentials configuration failed'));
    console.log(`  ${colors.warning('⚠')} ${error.message}`);
    console.log(`  ${colors.info('→')} Primary: code/Integration/Google/keys.json`);
    console.log(`  ${colors.info('→')} Fallback: code/GoogleAPI/keys.json`);
  }
  console.log('');
}

/**
 * Display usage instructions
 */
function displayUsageInstructions() {
  console.log(colors.info('📖 USAGE INSTRUCTIONS'));
  console.log(colors.info('─'.repeat(70)));
  console.log(
    `${colors.success('1.')} To access any project sheet, use the Sheet ID in Google Sheets API calls`
  );
  console.log(`${colors.success('2.')} Format: ${colors.sheetId('https://docs.google.com/spreadsheets/d/{SHEET_ID}')}`);
  console.log(`${colors.success('3.')} Use SheetsService.getValues() to read data from any sheet`);
  console.log(
    `${colors.success('4.')} Use DataProcessingService to process and validate phone numbers`
  );
  console.log('');
}

/**
 * Display footer and summary
 */
function displayFooter() {
  console.log(colors.info('═'.repeat(70)));
  console.log(colors.success('✓ Analysis Complete!'));
  console.log(colors.info('═'.repeat(70)) + '\n');
}

/**
 * Main function - Execute analysis
 */
async function analyzeConnectedSheets() {
  try {
    displayHeader();
    displayStatistics();
    displayConnectedSheets();
    checkGoogleCredentials();
    displayUsageInstructions();
    displayFooter();

    console.log(`${colors.info('💡 Tip:')} Run this script anytime to see all connected sheets and verify connectivity.\n`);
  } catch (error) {
    console.error(colors.error('✗ Error analyzing sheets:'), error.message);
  }
}

// Run the analysis
analyzeConnectedSheets();
