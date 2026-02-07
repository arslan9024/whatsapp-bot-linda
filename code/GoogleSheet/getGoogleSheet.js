import { google } from 'googleapis';
import { getPowerAgent, initializeGoogleAuth } from "../GoogleAPI/main.js";

export async function getGoogleSheet(Project) {
    // Initialize Google auth if not already done
    await initializeGoogleAuth();
    
    // Get the authenticated PowerAgent
    const PowerAgent = await getPowerAgent();
    
    if (!PowerAgent) {
        console.error('❌ Google Sheets is not connected. Please fix credentials.');
        return null;
    }
    
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
}
