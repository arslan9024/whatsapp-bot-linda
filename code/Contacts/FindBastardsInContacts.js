/**
 * CONSOLIDATION (Session 18 - February 7, 2026)
 * Updated to use GoogleServicesConsolidated
 * Previously imported: getGoogleSheet, getNumbersArrayFromRows (duplicates of getSheet, getSheetWMN)
 */
import { GoogleServicesConsolidated } from "../Integration/Google/GoogleServicesConsolidated.js";

// Initialize Google services once at import time
await GoogleServicesConsolidated.initialize().catch(err => {
  console.warn('⚠️ Google services failed to initialize:', err.message);
});

export async function FindBastardsInContacts(Project) {
    // console.log("Finding the basdtards", Project);
    let ListOfBastards = [];
    try {
        const data = await GoogleServicesConsolidated.getSheetValues(Project);
        const NumbersOfBastards = await GoogleServicesConsolidated.extractPhoneNumbers(data?.values || []);
        // console.log("The code has found bastards working code", NumbersOfBastards)
        ListOfBastards = NumbersOfBastards.CorrectNumbers;
    } catch (error) {
        console.log(error);
    }
    return ListOfBastards;

}