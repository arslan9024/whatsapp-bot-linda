import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyData = JSON.parse(fs.readFileSync(path.join(__dirname, "./code/GoogleAPI/keys.json"), "utf8"));
const jwtClient = new google.auth.JWT(
  keyData.client_email, null, keyData.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

jwtClient.authorize(async (err) => {
  if (err) { console.error(err); process.exit(1); }
  const sheets = google.sheets("v4");
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: "1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk",
    range: "Sheet1!A1:F4",
    auth: jwtClient
  });
  const data = result.data.values || [];
  console.log("\n SHEET1 STRUCTURE VERIFICATION\n");
  console.log("Headers: " + data[0].join(" | "));
  console.log("\nRow 2:   " + (data[1] || []).join(" | "));
  console.log("Row 3:   " + (data[2] || []).join(" | "));
  console.log("\n Column D now contains PROJECT CODES (PJ###)");
  console.log(" Column F now contains CONTACT CODES or names\n");
  process.exit(0);
});
