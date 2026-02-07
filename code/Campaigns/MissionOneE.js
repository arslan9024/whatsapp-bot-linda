import { MakeCampaign } from "./MakeCampaign.js";
import {RandomDelay } from "../Time/RandomDelay.js";

export async function MissionOneE(msg, MyProjects) {
    try {        
        msg.to==="971565268356@c.us" && msg.from.includes("3" && "6") 
        // && !msg.from.includes("4") && !msg.from.includes("8")
        // 8|| msg.to==="971565267359@c.us"|| msg.to==="971589750428@c.us" || msg.to==="971505036476@c.us" 
            // ? console.log("MissionOneE message from", msg.from)
            ? MakeCampaign(msg, MyProjects)

            : console.log(`Project has no result from campaign! ------------${msg.to}`);            
    } catch (error) {
        console.log(error);
    }
}