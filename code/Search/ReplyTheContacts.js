// Lion0 is available as global.Lion0 after bot initialization
/**
 * CONSOLIDATION (Session 18 - February 7, 2026)
 * Updated to use GoogleServicesConsolidated
 * Previously imported: getSheetWMN (was duplicate of getSheet, getGoogleSheet)
 */

import { MyProjectsWMN } from "../MyProjects/MyProjectsWMN.js";
import { GoogleServicesConsolidated } from "../Integration/Google/GoogleServicesConsolidated.js";
import { CorrectifyOneNumer } from "../utils/contacts.js";

// Initialize Google services once at import time
await GoogleServicesConsolidated.initialize().catch(err => {
  console.warn('⚠️ Google services failed to initialize:', err.message);
});

export async function ReplyTheContacts(msg, Time) {
    let SendReport;
  // console.log("in campaign of the project", msg.from);
  // console.log("in campaign of the project", msg.to);
  // console.log("in campaign of the project", msg.body);
//   console.log("in campaign of the project", msg.recvFresh);
//   console.log("in campaign of the project", msg.isNewMsg);
//   console.log("in campaign of the project", msg.ack);
  console.log("in msg.id.id", msg.id.id);
  const MunicipalityNumber = await msg.body.replace(/\D/g, '/');
        console.log("Message type is chat includes Municipality", MunicipalityNumber);

try {

       const Project =  MyProjectsWMN[1];
        console.log("Message type is chat includes Municipality", Project);

        const data = await GoogleServicesConsolidated.getSheetData(Project);


    //   let Project =  msg.body.includes(x.ProjectName);

    //   const data = await GoogleServicesConsolidated.getSheetData(Project);
      console.log("Project sheet has Length", data.data.values);
      const result= data.data.values.filter(x=>x.includes(MunicipalityNumber));

      console.log("Project sheet has SendReport", result);
      const ReplyToAgent= result[0];
  console.log("in ReplyToAgent", ReplyToAgent);

      const rr= await CorrectifyOneNumer(ReplyToAgent[7]).toString();

      rr !="" ? 
         SendReport = await Lion0.sendMessage(msg.from, rr) 
         :
         SendReport = await Lion0.sendMessage(msg.from, "There was no Muncipiality Number") ;
      

  console.log("in campaign of the project", SendReport);
  
  await Lion0.sendMessage(msg.to, `+${rr}`); 
} catch (error) {
    console.log(error);
}
}