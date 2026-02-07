import { MyProjects } from "../MyProjects/MyProjects.js";
import { FindAndShareOwnerNumberOnAgentRequest } from "../Search/FindAndShareOwnerNumberOnAgentRequest.js";
// import { ReplyTheContacts } from "../Search/ReplyTheContacts.js";
// import { changeNormalNumberWithWhatsAppNumber } from "../Contacts/changeWhatsAppNumberWithNormalNumber.js"
import {
  ClientQuestionsArray,
  ClientAnswersArray,
} from "../Message/questionsInConversation.js";
import { ProjectCampaign } from "../MyProjects/ProjectCampaign.js";
import { findWord } from "../Search/findWord.js";
import { WriteToSheet } from "../GoogleSheet/WriteToSheet.js";
import { MissionOneE } from "../Campaigns/MissionOneE.js";

import { CreatingNewWhatsAppClientLucy } from "./CreatingNewWhatsAppClientLucy.js";
import { SharingMobileNumber } from "../Replies/SharingMobileNumber.js";
export async function MessageAnalyzer(msg) {
  let Lucy;
  try {
    if (msg.type === 'chat') {
      //  MissionOneE(msg, MyProjects);

      if (msg.body === "Kindly share the mobile number of the owner") {
        await FindAndShareOwnerNumberOnAgentRequest(msg);
      } else if (msg.body.includes("House Number/Municipality Number=") && msg.hasQuotedMsg) {
        console.log("Message type is chat includes Municipality");
        await SharingMobileNumber(msg);
      }
      // else if (msg.body.includes("Municipality Number=") && msg.hasQuotedMsg) {
      //   console.log("Message type is chat includes Municipality");
      //   await ReplyTheContacts(msg);
      // }
      else if (ClientQuestionsArray.includes(msg.body)) {
        const index = ClientQuestionsArray.findIndex((x) => x === msg.body);
        // console.log("message has this in body", msg.body)
        // console.log("the question was for this index has this", ClientQuestionsArray[index])
        // console.log("the answers will be this index has this", ClientAnswersArray[index])
        msg.reply(ClientAnswersArray[index]);
      } else if (msg.body === "I want to signup as lucy") {
        console.log("The new object creation.......");
        Lucy = await CreatingNewWhatsAppClientLucy("Lucy");
        WhatsAppClientFunctions(Lucy);
        console.log("the result from new agent", Lucy.info);
      } else if (msg.body === "I want to register as agent") {
        console.log("The new object creation.......");
        // const leila = await CreatingNewWhatsAppClientForAgent(msg.from);
        // await NewWhatsAppClientFunctions(leila);
        // console.log("the result from new agent", leila);
      } else if (msg.body === "Kindly share the secondary mobile number of the owner") {
        console.log("The agent has requested the number of one owner");

      } else if (MyProjects.find((x) => x.ProjectName === msg.body) && msg.body.includes("Mission Speed")) {
        // Time.Speed = findSpeedForMission(msg.body);

      } else if (MyProjects.find((x) => x.ProjectName === msg.body)) {
        const Project = MyProjects.find((x) => x.ProjectName === msg.body);
        const sentence = "How much wood could a wood chip chop";
        const wordToFind = "woo";
        const result1 = findWord(wordToFind, sentence);
        console.log(result1);
        const result = await ProjectCampaign(Project);
        result
          ? console.log(`Project has result this
          successfully contacted is ${result},`)
          : console.log(`Project ${msg.body} has no result from campaign!`);
      } else {
        console.log("The message has requested the number of one owner");

        //  SendSecretMessage(msg);
      }
    } else if (msg.type === 'video'){
      console.log("chat has video");

    } else if(msg.type === 'image'){
    } else if(msg.type === 'ptt'){
    } else if(msg.type === 'e2e_notification'){
    } else if(msg.type === 'document'){
    } else {
      console.log(`Message has other type of ------------------------------------------${msg.type}`);
    }
  } catch (error) {
    console.log(error);
  }
}
