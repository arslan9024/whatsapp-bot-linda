/**
 * optimizeSheet1WithCodes.js - Optimize Sheet1 with Project & Contact Codes
 */
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_PATH = path.join(__dirname, "./code/GoogleAPI/keys.json");
const SHEET_ID = "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk";

class Sheet1Optimizer {
  constructor(auth) {
    this.auth = auth;
    this.sheets = google.sheets("v4");
    this.projectMap = new Map();
    this.contactMap = new Map();
    this.stats = { total: 0, projectsMatched: 0, contactsMatched: 0 };
  }

  async readRange(range) {
    const result = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
      auth: this.auth
    });
    return result.data.values || [];
  }

  async buildMaps() {
    console.log("\n Building mappings from Projects and Contacts tabs...\n");

    // Build project map
    const projects = await this.readRange("Projects!A:B");
    projects.slice(1).forEach(row => {
      if (row[0] && row[1]) {
        this.projectMap.set(row[1].toLowerCase(), row[0]);
      }
    });
    console.log(`   Loaded ${this.projectMap.size} projects`);

    // Build contact map
    const contacts = await this.readRange("Contacts!A:B");
    contacts.slice(1).forEach(row => {
      if (row[0] && row[1]) {
        this.contactMap.set(row[1].toLowerCase(), row[0]);
      }
    });
    console.log(`   Loaded ${this.contactMap.size} contacts\n`);
  }

  async processSheet1() {
    console.log(" Processing Sheet1...\n");

    const data = await this.readRange("Sheet1!A:J");
    const header = [...data[0].slice(0, 6)];
    header[3] = "Project Code";
    header[5] = "Contact Code";

    const optimized = [header];
    this.stats.total = data.length - 1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const optimizedRow = [row[0] || "", row[1] || "", row[2] || "", "", row[4] || "", ""];

      // Map project code
      const projectName = row[3] ? row[3].toLowerCase() : "";
      if (projectName && this.projectMap.has(projectName)) {
        optimizedRow[3] = this.projectMap.get(projectName);
        this.stats.projectsMatched++;
      } else {
        optimizedRow[3] = row[3];
      }

      // Map contact code
      const contactName = row[5] ? row[5].toLowerCase() : "";
      if (contactName && this.contactMap.has(contactName)) {
        optimizedRow[5] = this.contactMap.get(contactName);
        this.stats.contactsMatched++;
      } else {
        optimizedRow[5] = row[5];
      }

      optimized.push(optimizedRow);

      if ((i + 1) % 1000 === 0) {
        process.stdout.write(`\r  Processing: ${i + 1}/${this.stats.total} rows...`);
      }
    }

    console.log(`\r   Processed ${this.stats.total} rows              \n`);
    return optimized;
  }

  async updateSheet1(optimized) {
    console.log(" Uploading optimized data to Sheet1...\n");

    const sheets = google.sheets("v4");
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, auth: this.auth });
    const sheetId = meta.data.sheets.find(s => s.properties.title === "Sheet1").properties.sheetId;

    // Clear and update
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ deleteRange: { range: { sheetId, startRowIndex: 1 }, shiftDimension: "ROWS" } }]
      },
      auth: this.auth
    });

    for (let i = 0; i < optimized.length; i += 1000) {
      const batch = optimized.slice(i, Math.min(i + 1000, optimized.length));
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Sheet1!A${i === 0 ? 1 : i + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: batch },
        auth: this.auth
      });
      console.log(`   Uploaded batch ${Math.floor(i / 1000) + 1}`);
    }
  }

  async run() {
    console.log("\n" + "=".repeat(80));
    console.log("SHEET1 OPTIMIZATION WITH PROJECT & CONTACT CODES");
    console.log("=".repeat(80));

    await this.buildMaps();
    const optimized = await this.processSheet1();
    await this.updateSheet1(optimized);

    console.log("\n" + "=".repeat(80));
    console.log(" OPTIMIZATION COMPLETE");
    console.log("=".repeat(80) + "\n");

    console.log(" Summary:");
    console.log(`  Total rows: ${this.stats.total}`);
    console.log(`  Projects mapped: ${this.stats.projectsMatched}`);
    console.log(`  Contacts mapped: ${this.stats.contactsMatched}`);
    console.log(`  Memory saved: 40% (10 cols  6 cols)\n`);

    // Save report
    fs.writeFileSync("SHEET1_OPTIMIZATION_REPORT.json", JSON.stringify(this.stats, null, 2));
    console.log(" Report saved to SHEET1_OPTIMIZATION_REPORT.json\n");

    process.exit(0);
  }
}

const keyData = JSON.parse(fs.readFileSync(KEYS_PATH, "utf8"));
const jwtClient = new google.auth.JWT(
  keyData.client_email,
  null,
  keyData.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

jwtClient.authorize((err) => {
  if (err) { console.error(err); process.exit(1); }
  new Sheet1Optimizer(jwtClient).run();
});
