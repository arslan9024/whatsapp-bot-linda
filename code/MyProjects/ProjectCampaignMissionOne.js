/**
 * CONSOLIDATION (Session 18 - February 7, 2026)
 * Updated to use GoogleServicesConsolidated
 * Previously imported duplicate functions:
 * - getGoogleSheet (was duplicate of getSheet, getSheetWMN)
 * - getNumbersArrayFromRows (was duplicate of getPhoneNumbersArrayFromRows)
 * Removed unused imports: FindPropertiesInGoogleSheet
 */

import { GoogleServicesConsolidated } from "../Integration/Google/GoogleServicesConsolidated.js";
import { FindBastardsInContacts } from "../Contacts/FindBastardsInContacts.js";
import { ShuffleMyArray} from "../utils/arrays.js";

// Initialize Google services once at import time
await GoogleServicesConsolidated.initialize().catch(err => {
  console.warn('⚠️ Google services failed to initialize:', err.message);
});

export async function ProjectCampaignMissionOne(Project) {
    let ArrayNumbers = {},
        Numbers, PropertiesUsedInGoogleSheet;
    try {
        if (Project) {
            const data = await GoogleServicesConsolidated.getSheetValues(Project);
            const ListOfBastardsSheet = await FindBastardsInContacts({ ProjectID: 0, ProjectName: "List-Of-Bastards", ProjectSheetID: "1D7Sspk-FK558EvcTQsIfc5dwccoaggvRtrEPUlswNOU" });
            const ArrayNumbers = await GoogleServicesConsolidated.extractPhoneNumbers(data.values || []);
            const Numbers = [...new Set(ArrayNumbers.CorrectNumbers.concat(ArrayNumbers.updatedUAENumbers)),];
            const FinalNumbersForCampaign = Numbers.filter(function (item) {
                return !ListOfBastardsSheet.includes(item);
            });
            return ShuffleMyArray(FinalNumbersForCampaign);
        }
    } catch (error) {
        console.log(error);

    }
}