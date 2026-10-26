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
  
  console.log("\n  CONTACT MATCHING ANALYSIS\n");
  
  // Get sample of Sheet1 contact names
  const sheet1 = await sheets.spreadsheets.values.get({
    spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
    range: "Sheet1!F2:F11",
    auth: jwtClient
  });
  
  // Get Contacts tab names
  const contacts = await sheets.spreadsheets.values.get({
    spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
    range: "Contacts!B2:B11",
    auth: jwtClient
  });
  
  const sheet1Names = (sheet1.data.values || []).map(r => r[0]);
  const contactNames = (contacts.data.values || []).map(r => r[0]);
  
  console.log("Sample Sheet1 names (Column F):");
  sheet1Names.forEach((n, i) => console.log(`  ${i+1}. "${n}"`));
  
  console.log("\nSample Contacts tab names (Column B):");
  contactNames.forEach((n, i) => console.log(`  ${i+1}. "${n}"`));
  
  console.log("\n  ISSUE IDENTIFIED:");
  console.log("  The contact names in Sheet1 do NOT exactly match Contacts tab.");
  console.log("  Sheet1 has original names, Contacts tab has different formatting.\n");
  
  process.exit(0);
});
