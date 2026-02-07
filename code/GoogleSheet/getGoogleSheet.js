import { google } from 'googleapis';
import { PowerAgent } from "../GoogleAPI/main.js";
export async function getGoogleSheet(Project) {
    let sheetData;
    const gsapi = google.sheets({ version: 'v4', auth: PowerAgent });
    const opt = {
        spreadsheetId: Project.ProjectSheetID,
        range: "Sheet1"
    };
    try {
        sheetData = await gsapi.spreadsheets.values.get(opt);
} catch (error) {
        console.log(error);
    }
    return sheetData;
};