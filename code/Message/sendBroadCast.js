import { SleepTimeOfficialHoursWithRandomDelay } from "../Time/SleepTimeOfficialHoursWithRandomDelay.js";
import {CampaignResult} from "../Console/CampaignResult.js";
import { AfternoonMessage } from "./messages.js";
import { findAndCheckChat } from "./FindAndCheckChat.js";
import { validateNumberWithCountryCode } from "../utils/contacts.js";
 import { SelectingBotForCampaign } from "../../Inputs/SelectingBotForCampaign.js";
import { InputOne } from "../../Inputs/InputOne.js";
import { ShuffleMyArray} from "../utils/arrays.js";
export async function sendBroadcast(MNumbers, Project, newChatsOnly = true) {
    console.clear();
    let WhatsAppBotClient, AgentForIteration, message = AfternoonMessage;
    let successes = 0, fails = 0;
    const campaignStartDate = new Date();
    let skipped = 0;
    const numbers = await ShuffleMyArray(MNumbers);
    const diffDays = (campaignStartDate.getDate() - new Date().getDate()) / 3_600_000 + 1;

    for (const [i, num] of numbers.entries()) {
            AgentForIteration=i%InputOne.Agents;
            WhatsAppBotClient = await SelectingBotForCampaign(i%InputOne.Agents);

        const validatedContact = validateNumberWithCountryCode(num);
        try {
            // console.log(`Campaign started on \u001b[42m${campaignStartDate.toLocaleString()}\u001b[0m, And The time now is \u001b[31m${new Date().toLocaleString()}\u001b[0m o'clock`);
            // console.log(`The campaign day is \u001b[32m${diffDays}\u001b[0m`);
            // console.log(`"The iterantion is ", ${i} and the remainder will be${i%InputOne.Agents}`)

            const validatedChatResult = await findAndCheckChat(validatedContact, i, InputOne, WhatsAppBotClient);
            if (newChatsOnly) {
                if (validatedChatResult?.timestamp) {
                    console.log('skipping----------------------------------------', validatedContact);
                    skipped++;
                    continue;
                }
            }
            const SendReport = await WhatsAppBotClient.sendMessage(validatedContact, message);
            successes++;
          CampaignResult(SendReport, Project, successes, skipped, fails, numbers, i);
        } catch (error) {
            console.log(error);
            console.log(num, ' failed');
            fails++;
        }
    }
    console.log(successes, ' succeeded');
    console.log(fails, ' failed');
    await SleepTimeOfficialHoursWithRandomDelay(InputOne);

    return {
        successes,
        fails
    };
}