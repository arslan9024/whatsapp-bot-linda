import { google } from 'googleapis';
import { getPowerAgent, initializeGoogleAuth } from "../GoogleAPI/main.js";
import { Logger } from '../utils/Logger.js';

const log = new Logger('GoogleSheet');

/**
 * Fetch a Google Sheet by Project config.
 * @param {{ ProjectSheetID: string, ProjectName?: string }} Project
 * @returns {Promise<object>} The sheets API response
 * @throws {Error} If auth is unavailable or the API call fails
 */
export async function getGoogleSheet(Project) {
    if (!Project?.ProjectSheetID) {
        throw new Error('getGoogleSheet: Project.ProjectSheetID is required');
    }

    // Initialize Google auth if not already done
    await initializeGoogleAuth();

    // Get the authenticated PowerAgent
    const PowerAgent = await getPowerAgent();

    if (!PowerAgent) {
        throw new Error('getGoogleSheet: Google Sheets not connected — check credentials');
    }

    const gsapi = google.sheets({ version: 'v4', auth: PowerAgent });
    const opt = {
        spreadsheetId: Project.ProjectSheetID,
        range: 'Sheet1'
    };

    try {
        const sheetData = await gsapi.spreadsheets.values.get(opt);
        return sheetData;
    } catch (error) {
        // Throw so the caller knows the fetch failed — returning undefined silently
        // caused downstream callers to crash on .data.values access.
        log.error(`Failed to fetch sheet "${Project.ProjectName || Project.ProjectSheetID}": ${error.message}`);
        throw error;
    }
}
