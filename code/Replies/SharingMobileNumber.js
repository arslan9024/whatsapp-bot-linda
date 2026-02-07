import { getSheetWMN } from "../GoogleSheet/getSheetWMN.js";
import { MyProjectsWMN } from "../MyProjects/MyProjectsWMN.js";
import { CorrectifyOneNumer } from "../utils/contacts.js";

// Lion0 is available as global.Lion0 after bot initialization

export async function SharingMobileNumber(msg) {
    let SendReport;

  console.log("in msg.id.id", msg.id.id);
  const MunicipalityNumber = await (msg.body.split("/",3))[2];
  const HouseNumber = await (msg.body.split("/",3))[1].split("=")[1];

        console.log("House Number is", HouseNumber);
    try {
    console.log("Message type was chat so we are in new function", MunicipalityNumber);
    const Project =  MyProjectsWMN[1];
            console.log("Message type is chat includes Municipality", Project);
             const data = await getSheetWMN(Project);
               console.log("Project sheet has Length", data.data.values);
      const result= data.data.values.filter(x=>x.includes(MunicipalityNumber));

      console.log("Project sheet has SendReport", result);
      const ReplyToAgent= result[0];
//   console.log("in ReplyToAgent", ReplyToAgent);
    //    let rr= await CorrectifyOneNumer(ReplyToAgent[7]).toString();

         const rr= await CorrectifyOneNumer(ReplyToAgent[7]).toString();
  
        rr !="" ? SendReport = await Lion0.sendMessage(msg.from, rr) 
           :SendReport = await Lion0.sendMessage(msg.from, "There was no Muncipiality Number") ;
        
  
    // console.log("in campaign of the project", SendReport);
    
    await Lion0.sendMessage("120363408658209875@g.us", `Cluster=${ReplyToAgent[2]} with ${msg.body}   +${rr}`); 
       return true; 
    } catch (error) {
        console.log(error);
    }
}
