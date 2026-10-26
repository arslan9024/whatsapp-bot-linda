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
import { sendBroadcast } from "../Message/sendBroadCast.js";

// Initialize Google services once at import time
await GoogleServicesConsolidated.initialize().catch(err => {
  console.warn('⚠️ Google services failed to initialize:', err.message);
});

export async function ProjectCampaign(Project) {
      console.log("in campaign of the project", Project);
  let ProjectCampaignResult;
    let ArrayNumbers = {},
    Numbers, PropertiesUsedInGoogleSheet;
  try {
    if (Project) {

      const data = await GoogleServicesConsolidated.getSheetValues(Project);
      const ListOfBastardsSheet = await FindBastardsInContacts({ ProjectID: 0, ProjectName: "List-Of-Bastards", ProjectSheetID: "1D7Sspk-FK558EvcTQsIfc5dwccoaggvRtrEPUlswNOU" });
      // we are trying to remove bastards
      console.log("The object has returned the numbers for bastards owners", ListOfBastardsSheet);
   //We try to find the properties used in the Google Sheet
      // PropertiesUsedInGoogleSheet = await FindPropertiesInGoogleSheet(data.values);
      const ArrayNumbers = await GoogleServicesConsolidated.extractPhoneNumbers(data.values || []);

      // console.log("The object has returned the row headings", PropertiesUsedInGoogleSheet)

      // Until here we have all numbers from the sheet.
      // ArrayNumbers = await getNumbersArrayFromRows(data.data.values);
      // We need to find the correct numbers and wrong numbers in this position.

      // console.log("New Numbers", ArrayNumbers);
      // const ArrayNumbers = await getNumbersArrayFromRows(data);

      console.log("The Number of the rows collected", data.length);
      console.log("The Number of the corect Numbers Found", ArrayNumbers.CorrectNumbers.length);
      console.log("The Number of the wrong Numbers Found", ArrayNumbers.WrongNumbers.length);
      console.log("The Number of the Half Correct Found", ArrayNumbers.HalfCorrectNumbers.length);

   console.log("correct Numbers", ArrayNumbers.CorrectNumbers.length);
      console.log(ArrayNumbers.HalfCorrectNumbers.length, "half Numbers", ArrayNumbers.HalfCorrectNumbers);
      console.log("wrong Numbers", ArrayNumbers.WrongNumbers.length);
      console.log("Updated UAE Numbers", ArrayNumbers.updatedUAENumbers.length);

   const Numbers = [
        ...new Set(
          ArrayNumbers.CorrectNumbers.concat(ArrayNumbers.updatedUAENumbers)
        ),
      ];   
      
      
      // let result= {
      //   successes:[1,2,3,4,5,6]
      // }
      const FinalNumbersForCampaign = Numbers.filter(function (item) {
        return !ListOfBastardsSheet.includes(item);
      });
      console.log("The object has returned the numbers with bastards", Numbers.length);
      console.log("The object has returned the numbers without bastards", FinalNumbersForCampaign.length);
      // console.log("The object has returned the numbers without bastards", FinalNumbersForCampaign)


      ProjectCampaignResult = await sendBroadcast(FinalNumbersForCampaign, Project);

console.log(`Project ${Project.ProjectName}, 
    Total Numbers in this project ${data.values?.length || 0},
  Correct Numbers ${ArrayNumbers.CorrectNumbers.length},
  Wrong Numbers ${ArrayNumbers.WrongNumbers.length},
  HalfCorrect Numbers ${ArrayNumbers.HalfCorrectNumbers.length},`);
      console.log(
        `"we have completed the campaign for Sheet data with success of ${ProjectCampaignResult.successes} messages and ${ProjectCampaignResult.fails} failed Messages.`
      );

      return ProjectCampaignResult;

    }
  } catch (error) {
    console.log(error);

  }
}