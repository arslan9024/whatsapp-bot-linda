import { getGoogleSheet } from "../GoogleSheet/getGoogleSheet.js";
import { FindBastardsInContacts } from "../Contacts/FindBastardsInContacts.js";
import { FindPropertiesInGoogleSheet } from "../GoogleSheet/FindPropertiesInGoogleSheet.js";
import { getNumbersArrayFromRows } from "../GoogleSheet/getNumberFromSheet.js";
import { ShuffleMyArray} from "../utils/arrays.js";

export async function ProjectCampaignMissionOne(Project) {
    let ArrayNumbers = {},
        Numbers, PropertiesUsedInGoogleSheet;
    try {
        if (Project) {
            const data = await getGoogleSheet(Project);
            const ListOfBastardsSheet = await FindBastardsInContacts({ ProjectID: 0, ProjectName: "List-Of-Bastards", ProjectSheetID: "1D7Sspk-FK558EvcTQsIfc5dwccoaggvRtrEPUlswNOU" });
            const ArrayNumbers = await getNumbersArrayFromRows(data.data.values);
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