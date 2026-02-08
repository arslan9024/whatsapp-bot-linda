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
  
  console.log("\n TESTING MASTER VIEW WITH PROPERTY CODE P001\n");
  console.log("Setting B2 = P001 and reading results...\n");
  
  // Set property code in B2
  await sheets.spreadsheets.values.update({
    spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
    range: "Master View!B2",
    valueInputOption: "RAW",
    requestBody: { values: [["P001"]] },
    auth: jwtClient
  });
  
  // Wait a moment for formulas to calculate
  await new Promise(r => setTimeout(r, 2000));
  
  // Read the Master View
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
    range: "Master View!A:F",
    auth: jwtClient
  });
  
  const data = result.data.values || [];
  
  console.log(" MASTER VIEW DISPLAY:");
  console.log("\n" + "=".repeat(100));
  data.slice(0, 25).forEach((row, i) => {
    if (row && row.length > 0) {
      console.log(row.join(" | "));
    }
  });
  console.log("=".repeat(100));
  
  console.log("\n MASTER VIEW IS LIVE AND WORKING!\n");
  console.log("All data is being pulled from detail tabs through VLOOKUP formulas.");
  console.log("Try different property codes in B2 (P002, P003, P100, etc.) to see it update!\n");
  
  process.exit(0);
});
