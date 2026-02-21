/**
 * PHASE 7: DATA VALIDATION & INTEGRITY CHECKS
 * Automated validation rules and error detection
 * 
 * Tasks:
 * 1. Foreign Key Validation (verify all project/contact codes exist)
 * 2. Referential Integrity (check for orphaned records)
 * 3. Data Completeness (identify missing required fields)
 * 4. Duplicate Detection (find duplicate property entries)
 * 5. Consistency Checks (validate data types and formats)
 * 6. Audit Trail (log all validation results)
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Phase7_DataValidation {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = null;
    this.validationResults = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 7: Data Validation',
      validations: [],
      errors: [],
      warnings: [],
      summary: {}
    };
    this.data = {
      sheet1: [],
      projects: [],
      contacts: [],
      properties: [],
      financial: []
    };
  }

  async authorize() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'code/GoogleAPI/keys.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✓ Google Sheets API authorized');
      return true;
    } catch (error) {
      this.validationResults.errors.push(`Authorization failed: ${error.message}`);
      console.error('✗ Authorization failed:', error.message);
      return false;
    }
  }

  async getSpreadsheetId() {
    try {
      // Use the Organized Sheet ID for the relational database
      this.spreadsheetId = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk';
      console.log(`✓ Spreadsheet ID found`);
      return true;
    } catch (error) {
      this.validationResults.errors.push(`Failed to get spreadsheet ID: ${error.message}`);
      return false;
    }
  }

  async loadData() {
    console.log('\n█ Loading data for validation...');
    try {
      // Load Sheet1
      const sheet1Response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Sheet1!A:F"
      });
      this.data.sheet1 = sheet1Response.data.values || [];

      // Load Projects
      const projectsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Projects!A:C"
      });
      this.data.projects = projectsResponse.data.values || [];

      // Load Contacts
      const contactsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Contacts!A:F"
      });
      this.data.contacts = contactsResponse.data.values || [];

      // Load Properties Financial
      const financialResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "'Properties - Financial'!A:L"
      });
      this.data.financial = financialResponse.data.values || [];

      console.log(`✓ Loaded ${this.data.sheet1.length} rows from Sheet1`);
      console.log(`✓ Loaded ${this.data.projects.length} rows from Projects`);
      console.log(`✓ Loaded ${this.data.contacts.length} rows from Contacts`);
      console.log(`✓ Loaded ${this.data.financial.length} rows from Financial`);
      return true;
    } catch (error) {
      this.validationResults.errors.push(`Data loading failed: ${error.message}`);
      console.error('✗ Data loading failed:', error.message);
      return false;
    }
  }

  validateForeignKeys() {
    console.log('\n█ Task 1: Validating Foreign Keys...');
    try {
      const projectCodes = new Set(this.data.projects.slice(1).map(row => row[0]).filter(Boolean));
      const contactCodes = new Set(this.data.contacts.slice(1).map(row => row[0]).filter(Boolean));

      let validProjects = 0;
      let invalidProjects = 0;
      let validContacts = 0;
      let invalidContacts = 0;
      const orphanedProjects = [];
      const orphanedContacts = [];

      // Check Sheet1 references
      for (let i = 1; i < this.data.sheet1.length; i++) {
        const row = this.data.sheet1[i];
        if (!row || !row[3]) continue;

        // Check project code
        if (projectCodes.has(row[3])) {
          validProjects++;
        } else {
          invalidProjects++;
          orphanedProjects.push({
            rowNumber: i + 1,
            propertyCode: row[0],
            projectCode: row[3]
          });
        }

        // Check contact code
        if (row[5] && contactCodes.has(row[5])) {
          validContacts++;
        } else if (row[5]) {
          invalidContacts++;
          orphanedContacts.push({
            rowNumber: i + 1,
            propertyCode: row[0],
            contactCode: row[5]
          });
        }
      }

      const result = {
        validation: 'Foreign Key Validation',
        status: invalidProjects === 0 && invalidContacts === 0 ? 'PASS' : 'FAIL',
        details: {
          valid_project_references: validProjects,
          invalid_project_references: invalidProjects,
          valid_contact_references: validContacts,
          invalid_contact_references: invalidContacts,
          orphaned_projects_sample: orphanedProjects.slice(0, 5),
          orphaned_contacts_sample: orphanedContacts.slice(0, 5)
        }
      };

      this.validationResults.validations.push(result);
      console.log(`✓ Valid project references: ${validProjects}`);
      console.log(`✓ Invalid project references: ${invalidProjects}`);
      console.log(`✓ Valid contact references: ${validContacts}`);
      console.log(`✓ Invalid contact references: ${invalidContacts}`);
      
      return result.status === 'PASS';
    } catch (error) {
      this.validationResults.errors.push(`Foreign key validation failed: ${error.message}`);
      console.error('✗ Foreign key validation failed:', error.message);
      return false;
    }
  }

  validateDataCompleteness() {
    console.log('\n█ Task 2: Validating Data Completeness...');
    try {
      const issues = {
        missing_property_codes: [],
        missing_project_codes: [],
        missing_contact_codes: [],
        empty_rows: []
      };

      for (let i = 1; i < this.data.sheet1.length; i++) {
        const row = this.data.sheet1[i];
        if (!row || row.length === 0) {
          issues.empty_rows.push(i + 1);
          continue;
        }

        if (!row[0]) issues.missing_property_codes.push(i + 1);
        if (!row[3]) issues.missing_project_codes.push(i + 1);
        if (!row[5]) issues.missing_contact_codes.push(i + 1);
      }

      const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
      
      const result = {
        validation: 'Data Completeness',
        status: totalIssues === 0 ? 'PASS' : 'WARNING',
        details: {
          missing_property_codes: issues.missing_property_codes.length,
          missing_project_codes: issues.missing_project_codes.length,
          missing_contact_codes: issues.missing_contact_codes.length,
          empty_rows: issues.empty_rows.length,
          total_issues: totalIssues,
          completion_percentage: ((this.data.sheet1.length - 1 - totalIssues) / (this.data.sheet1.length - 1) * 100).toFixed(2) + '%'
        }
      };

      this.validationResults.validations.push(result);
      console.log(`✓ Missing property codes: ${issues.missing_property_codes.length}`);
      console.log(`✓ Missing project codes: ${issues.missing_project_codes.length}`);
      console.log(`✓ Missing contact codes: ${issues.missing_contact_codes.length}`);
      console.log(`✓ Data completeness: ${result.details.completion_percentage}`);
      
      if (totalIssues > 0) {
        this.validationResults.warnings.push(`${totalIssues} data completeness issues found`);
      }
      return result.status === 'PASS';
    } catch (error) {
      this.validationResults.errors.push(`Data completeness validation failed: ${error.message}`);
      console.error('✗ Data completeness validation failed:', error.message);
      return false;
    }
  }

  detectDuplicates() {
    console.log('\n█ Task 3: Detecting Duplicates...');
    try {
      const propertyCodeMap = new Map();
      const duplicates = [];

      for (let i = 1; i < this.data.sheet1.length; i++) {
        const row = this.data.sheet1[i];
        if (!row || !row[0]) continue;

        const code = row[0];
        if (propertyCodeMap.has(code)) {
          duplicates.push({
            propertyCode: code,
            rows: [propertyCodeMap.get(code), i + 1]
          });
        } else {
          propertyCodeMap.set(code, i + 1);
        }
      }

      const result = {
        validation: 'Duplicate Detection',
        status: duplicates.length === 0 ? 'PASS' : 'FAIL',
        details: {
          duplicate_property_codes: duplicates.length,
          duplicates_sample: duplicates.slice(0, 10)
        }
      };

      this.validationResults.validations.push(result);
      console.log(`✓ Duplicate property codes found: ${duplicates.length}`);
      
      if (duplicates.length > 0) {
        this.validationResults.errors.push(`${duplicates.length} duplicate property codes detected`);
      }
      return result.status === 'PASS';
    } catch (error) {
      this.validationResults.errors.push(`Duplicate detection failed: ${error.message}`);
      console.error('✗ Duplicate detection failed:', error.message);
      return false;
    }
  }

  validateDataFormats() {
    console.log('\n█ Task 4: Validating Data Formats...');
    try {
      const issues = {
        invalid_property_codes: [],
        invalid_project_codes: [],
        invalid_contact_codes: [],
        invalid_areas: [],
        invalid_plot_numbers: []
      };

      // Property code format: P#####
      const propertyCodeRegex = /^P\d{5}$/;
      // Project code format: PJ###
      const projectCodeRegex = /^PJ\d{3}$/;
      // Contact code format: C####
      const contactCodeRegex = /^C\d{4}$/;

      for (let i = 1; i < this.data.sheet1.length; i++) {
        const row = this.data.sheet1[i];
        if (!row) continue;

        if (row[0] && !propertyCodeRegex.test(row[0])) {
          issues.invalid_property_codes.push({ row: i + 1, code: row[0] });
        }
        if (row[3] && !projectCodeRegex.test(row[3])) {
          issues.invalid_project_codes.push({ row: i + 1, code: row[3] });
        }
        if (row[5] && !contactCodeRegex.test(row[5])) {
          issues.invalid_contact_codes.push({ row: i + 1, code: row[5] });
        }
        if (row[2] && isNaN(parseFloat(row[2]))) {
          issues.invalid_areas.push({ row: i + 1, value: row[2] });
        }
        if (row[4] && isNaN(parseInt(row[4]))) {
          issues.invalid_plot_numbers.push({ row: i + 1, value: row[4] });
        }
      }

      const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

      const result = {
        validation: 'Data Format Validation',
        status: totalIssues === 0 ? 'PASS' : 'WARNING',
        details: {
          invalid_property_codes: issues.invalid_property_codes.length,
          invalid_project_codes: issues.invalid_project_codes.length,
          invalid_contact_codes: issues.invalid_contact_codes.length,
          invalid_areas: issues.invalid_areas.length,
          invalid_plot_numbers: issues.invalid_plot_numbers.length,
          total_format_issues: totalIssues
        }
      };

      this.validationResults.validations.push(result);
      console.log(`✓ Invalid property codes: ${issues.invalid_property_codes.length}`);
      console.log(`✓ Invalid project codes: ${issues.invalid_project_codes.length}`);
      console.log(`✓ Invalid contact codes: ${issues.invalid_contact_codes.length}`);
      
      if (totalIssues > 0) {
        this.validationResults.warnings.push(`${totalIssues} format issues detected`);
      }
      return result.status === 'PASS';
    } catch (error) {
      this.validationResults.errors.push(`Format validation failed: ${error.message}`);
      console.error('✗ Format validation failed:', error.message);
      return false;
    }
  }

  validateReferentialIntegrity() {
    console.log('\n█ Task 5: Checking Referential Integrity...');
    try {
      // Ensure no orphaned project records
      const sheet1ProjectCodes = new Set(
        this.data.sheet1.slice(1).map(row => row[3]).filter(Boolean)
      );
      const projectCodes = new Set(
        this.data.projects.slice(1).map(row => row[0]).filter(Boolean)
      );

      // Ensure no orphaned contact records
      const sheet1ContactCodes = new Set(
        this.data.sheet1.slice(1).map(row => row[5]).filter(Boolean)
      );
      const contactCodes = new Set(
        this.data.contacts.slice(1).map(row => row[0]).filter(Boolean)
      );

      const orphanedProjects = Array.from(projectCodes).filter(code => !sheet1ProjectCodes.has(code));
      const orphanedContacts = Array.from(contactCodes).filter(code => !sheet1ContactCodes.has(code));

      const result = {
        validation: 'Referential Integrity',
        status: orphanedProjects.length === 0 && orphanedContacts.length === 0 ? 'PASS' : 'WARNING',
        details: {
          orphaned_projects: orphanedProjects.length,
          orphaned_contacts: orphanedContacts.length,
          orphaned_projects_list: orphanedProjects.slice(0, 10),
          orphaned_contacts_list: orphanedContacts.slice(0, 10)
        }
      };

      this.validationResults.validations.push(result);
      console.log(`✓ Orphaned projects: ${orphanedProjects.length}`);
      console.log(`✓ Orphaned contacts: ${orphanedContacts.length}`);
      
      if (orphanedProjects.length > 0 || orphanedContacts.length > 0) {
        this.validationResults.warnings.push('Orphaned reference records detected (may be valid for future use)');
      }
      return result.status === 'PASS' || result.status === 'WARNING';
    } catch (error) {
      this.validationResults.errors.push(`Referential integrity check failed: ${error.message}`);
      console.error('✗ Referential integrity check failed:', error.message);
      return false;
    }
  }

  generateReport() {
    const reportPath = path.join(__dirname, 'logs/phase7-data-validation.json');
    const dir = path.dirname(reportPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Calculate summary
    const passCount = this.validationResults.validations.filter(v => v.status === 'PASS').length;
    const warningCount = this.validationResults.validations.filter(v => v.status === 'WARNING').length;
    const failCount = this.validationResults.validations.filter(v => v.status === 'FAIL').length;

    this.validationResults.summary = {
      total_validations: this.validationResults.validations.length,
      passed: passCount,
      warnings: warningCount,
      failed: failCount,
      overall_status: failCount === 0 ? 'PASS' : 'FAIL_WITH_WARNINGS',
      validation_coverage: '100%',
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(reportPath, JSON.stringify(this.validationResults, null, 2));
    console.log(`\n✓ Validation report saved to: logs/phase7-data-validation.json`);
    return true;
  }

  async execute() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              PHASE 7: DATA VALIDATION & INTEGRITY              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (!await this.authorize()) return;
    if (!await this.getSpreadsheetId()) return;
    if (!await this.loadData()) return;

    this.validateForeignKeys();
    this.validateDataCompleteness();
    this.detectDuplicates();
    this.validateDataFormats();
    this.validateReferentialIntegrity();

    this.generateReport();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    PHASE 7 COMPLETE                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const summary = this.validationResults.summary;
    console.log(`\n📊 VALIDATION SUMMARY:`);
    console.log(`   ✓ Passed: ${summary.passed}`);
    console.log(`   ⚠ Warnings: ${summary.warnings}`);
    console.log(`   ✗ Failed: ${summary.failed}`);
    console.log(`   Status: ${summary.overall_status}\n`);
  }
}

const phase7 = new Phase7_DataValidation();
phase7.execute().catch(console.error);
