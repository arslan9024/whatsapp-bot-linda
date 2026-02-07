import { ProjectCampaignMissionOne } from "../MyProjects/ProjectCampaignMissionOne.js";
import { sendBroadToList } from "../Message/sendBroadToList.js";
import { selectRandomItems } from "../utils/arrays.js";
import { InputOne } from "../../Inputs/InputOne.js";
import {RandomDelay } from "../Time/RandomDelay.js";
export async function MakeCampaign(msg, MyProjects) {
    let ProjectCampaignResult=false, 
    FinalNumbersForCampaign;
    const Project = MyProjects.find((x) => x.ProjectName === "Oxygen2023");

    try {

        FinalNumbersForCampaign = await ProjectCampaignMissionOne(Project);
        FinalNumbersForCampaign=await selectRandomItems(FinalNumbersForCampaign, InputOne.NumberOfMobileNumbers);
        FinalNumbersForCampaign =  FinalNumbersForCampaign.filter((number)=> number%2===0);
        ProjectCampaignResult = await sendBroadToList(FinalNumbersForCampaign, Project);
        console.log(ProjectCampaignResult)  ;        
    } catch (error) {
        console.log(error);
    }
}