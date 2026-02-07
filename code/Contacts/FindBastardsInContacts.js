import { getGoogleSheet } from "../GoogleSheet/getGoogleSheet.js";
import { getNumbersArrayFromRows } from '../GoogleSheet/getNumberFromSheet.js';
export async function FindBastardsInContacts(Project) {
    // console.log("Finding the basdtards", Project);
    let ListOfBastards = [];
    try {
        const data = await getGoogleSheet(Project);
        const NumbersOfBastards = await getNumbersArrayFromRows(data.data.values);
        // console.log("The code has found bastards working code", NumbersOfBastards)
        ListOfBastards = NumbersOfBastards.CorrectNumbers;
    } catch (error) {
        console.log(error);
    }
    return ListOfBastards;

}