import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyData = JSON.parse(fs.readFileSync(path.join(__dirname, "./code/GoogleAPI/keys.json"), "utf8"));
const jwtClient = new google.auth.JWT(keyData.client_email, null, keyData.private_key, ["https://www.googleapis.com/auth/spreadsheets"]);

jwtClient.authorize(async (err) => {
  if (err) { console.error(err); process.exit(1); }
  const sheets = google.sheets("v4");
  const SHEET_ID = "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk";

  console.log("\n" + "=".repeat(80));
  console.log("BUILDING INTERACTIVE MASTER VIEW");
  console.log("=".repeat(80) + "\n");

  try {
    // Get Master View sheet
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, auth: jwtClient });
    const masterSheet = meta.data.sheets.find(s => s.properties.title === "Master View");
    if (!masterSheet) throw new Error("Master View sheet not found");
    const sheetId = masterSheet.properties.sheetId;

    const requests = [];
    let row = 0;

    // Title
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: [{
            userEnteredValue: { stringValue: " INTERACTIVE PROPERTY MASTER VIEW" },
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.2, blue: 0.4 },
              textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          }]
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Filter Section Title
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 2 },
        rows: [{
          values: [{
            userEnteredValue: { stringValue: " FILTERS" },
            userEnteredFormat: { textFormat: { bold: true, fontSize: 11 } }
          }]
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Filter: Project Code
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 2 },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: "Project Code:" }, userEnteredFormat: { textFormat: { bold: true } } },
            { userEnteredValue: { stringValue: "" }, userEnteredFormat: { borders: { bottom: { style: "SOLID" } } } }
          ]
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Filter: Property Code
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 2 },
        rows: [{
          values: [
            { userEnteredValue: { stringValue: "Property Code:" }, userEnteredFormat: { textFormat: { bold: true } } },
            { userEnteredValue: { stringValue: "" }, userEnteredFormat: { borders: { bottom: { style: "SOLID" } } } }
          ]
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Blank row
    row++;

    // SECTION 1: Property Information
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: [{
            userEnteredValue: { stringValue: " PROPERTY INFORMATION" },
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 },
              textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          }]
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Property headers
    const propHeaders = ["Property Code", "Project Code", "Plot Number", "Area", "Plot Type", "Bedrooms"];
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: propHeaders.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          }))
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Property data formulas
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: [
            { userEnteredValue: { formulaValue: "=B2" } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Non-Confidential\'!A:B,2,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Non-Confidential\'!A:C,3,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Non-Confidential\'!A:D,4,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Non-Confidential\'!A:E,5,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Non-Confidential\'!A:F,6,0),"")' } }
          ]
        }],
        fields: "userEnteredValue"
      }
    });
    row++;

    // Blank row
    row++;

    // SECTION 2: Owner Contact
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: [{
            userEnteredValue: { stringValue: " OWNER & CONTACT INFORMATION" },
            userEnteredFormat: {
              backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 },
              textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          }]
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Contact headers
    const contactHeaders = ["Contact Code", "Name", "Phone", "Mobile", "Email", "Contact Type"];
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: contactHeaders.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          }))
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Contact data formulas (get from Sheet1 contact code, then lookup in Contacts)
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: [
            { userEnteredValue: { formulaValue: '=IFERROR(INDEX(Sheet1!F:F,MATCH(B2,Sheet1!A:A,0)),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(A' + (row + 1) + ',Contacts!A:B,2,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(A' + (row + 1) + ',Contacts!A:C,3,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(A' + (row + 1) + ',Contacts!A:I,9,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(A' + (row + 1) + ',Contacts!A:D,4,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(A' + (row + 1) + ',Contacts!A:G,7,0),"")' } }
          ]
        }],
        fields: "userEnteredValue"
      }
    });
    row++;

    // Blank row
    row++;

    // SECTION 3: Financial Details
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: [{
            userEnteredValue: { stringValue: " FINANCIAL DETAILS" },
            userEnteredFormat: {
              backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 },
              textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 0, green: 0, blue: 0 } }
            }
          }]
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Financial headers
    const finHeaders = ["Price", "Price per Sq Ft", "Status", "Commission Rate", "Commission Amount", "Date Added"];
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: finHeaders.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: { red: 0.8, green: 0.8, blue: 0.2 },
              textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } }
            }
          }))
        }],
        fields: "userEnteredValue,userEnteredFormat"
      }
    });
    row++;

    // Financial data formulas
    requests.push({
      updateCells: {
        range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 6 },
        rows: [{
          values: [
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Financial\'!A:D,4,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Financial\'!A:E,5,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Financial\'!A:K,11,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Financial\'!A:I,9,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Financial\'!A:J,10,0),"")' } },
            { userEnteredValue: { formulaValue: '=IFERROR(VLOOKUP(B2,\'Properties - Financial\'!A:L,12,0),"")' } }
          ]
        }],
        fields: "userEnteredValue"
      }
    });

    // Execute all formatting requests
    console.log(" Creating Master View structure...\n");
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
      auth: jwtClient
    });

    console.log(" Master View setup complete!\n");
    console.log(" MASTER VIEW FEATURES:\n");
    console.log("   Filter Controls:");
    console.log("    - B1: Project Code selector");
    console.log("    - B2: Property Code input (use this to lookup)\n");
    console.log("   Property Information Section");
    console.log("    - Shows: Code, Project, Plot#, Area, Type, Bedrooms");
    console.log("    - Source: Properties - Non-Confidential tab\n");
    console.log("   Owner Contact Section");
    console.log("    - Shows: Code, Name, Phone, Mobile, Email, Type");
    console.log("    - Source: Contacts tab (linked via property code)\n");
    console.log("   Financial Details Section");
    console.log("    - Shows: Price, Price/SqFt, Status, Commission, Amount, Date");
    console.log("    - Source: Properties - Financial tab\n");
    console.log(" HOW TO USE:\n");
    console.log("  1. Enter a property code like 'P001' in cell B2");
    console.log("  2. ALL data auto-populates from linked tabs");
    console.log("  3. No manual data entry needed!\n");
    console.log("=" + "=".repeat(79));
    console.log(" READY TO USE - TRY IT NOW!\n");

    process.exit(0);

  } catch (error) {
    console.error("\n Error:", error.message);
    process.exit(1);
  }
});
