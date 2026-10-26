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
  
  console.log("\n Fixing Contacts Tab with Proper Names\n");
  
  // Read Sheet1 to extract unique contacts with names
  const sheet1 = await sheets.spreadsheets.values.get({
    spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
    range: "Sheet1!A:J",
    auth: jwtClient
  });
  
  const rows = sheet1.data.values || [];
  const contactsMap = new Map();
  
  console.log(`Reading ${rows.length - 1} rows from Sheet1...`);
  
  // Build unique contacts with their actually names
  rows.slice(1).forEach((row, idx) => {
    const name = row[5] ? row[5].trim() : "Unknown";
    const phone = row[6] ? row[6].trim() : "";
    const email = row[7] ? row[7].trim() : "";
    const mobile = row[8] ? row[8].trim() : "";
    
    if (name && name !== "Unknown") {
      const key = name.toLowerCase();
      if (!contactsMap.has(key)) {
        contactsMap.set(key, { name, phone, email, mobile });
      }
    }
  });
  
  console.log(`Found ${contactsMap.size} unique contacts with proper names\n`);
  
  // Create contact records with codes
  const contactRecords = [["Contact Code", "Name", "Phone", "Email", "Mobile", "Secondary Mobile", "Contact Type", "Preferred Method"]];
  const contactCodeMap = new Map();
  
  let idx = 1;
  for (const [key, contact] of contactsMap.entries()) {
    const code = `C${String(idx).padStart(3, "0")}`;
    contactRecords.push([
      code,
      contact.name,
      contact.phone,
      contact.email,
      contact.mobile,
      "",
      "Owner",
      "Phone"
    ]);
    contactCodeMap.set(contact.name.toLowerCase(), code);
    idx++;
  }
  
  console.log(`Uploading ${contactRecords.length - 1} fixed contact records...\n`);
  
  // Clear and update Contacts tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk", auth: jwtClient });
  const contactsSheet = meta.data.sheets.find(s => s.properties.title === "Contacts");
  
  // Delete and clear
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
    requestBody: { requests: [{ deleteRange: { range: { sheetId: contactsSheet.properties.sheetId, startRowIndex: 1 }, shiftDimension: "ROWS" } }] },
    auth: jwtClient
  });
  
  // Upload fixed contacts
  for (let i = 0; i < contactRecords.length; i += 5000) {
    const batch = contactRecords.slice(i, Math.min(i + 5000, contactRecords.length));
    await sheets.spreadsheets.values.update({
      spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
      range: `Contacts!A${i === 0 ? 1 : i + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: batch },
      auth: jwtClient
    });
    console.log(`   Uploaded batch ${Math.floor(i / 5000) + 1}`);
  }
  
  console.log("\n Contacts tab fixed with proper names!\n");
  console.log(`Total unique contacts: ${contactRecords.length - 1}`);
  console.log(`Ready for re-mapping to Sheet1\n`);
  
  process.exit(0);
});
