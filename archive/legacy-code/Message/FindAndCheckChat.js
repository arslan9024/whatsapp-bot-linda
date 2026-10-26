import { changeNormalNumberWithWhatsAppNumber } from "../utils/contacts.js";
export async function findAndCheckChat(Number, i, Time, WhatsAppBotClient) {
  let result = false;
  const iteration2 = i % Time.Agents;
  const waNumber = changeNormalNumberWithWhatsAppNumber(Number);

  // console.log("Chat finding with contact's .......................", parseInt(Number))8
  try {
    console.log("Chat finding with contact's .......................", (WhatsAppBotClient.authStrategy.clientId));
    console.log("Chat finding with WA Number contact's .......................", (waNumber));

    result = await WhatsAppBotClient.getChatById(Number);
    return result;

  } catch (error) {
    console.log(error);
  }
}