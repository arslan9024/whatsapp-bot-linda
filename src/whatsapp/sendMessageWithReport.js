export async function sendMessageWithReport(validatedContact, WhatsAppBotClient, message) {
let result={}, SendReport;
    console.log(`
    The validated contact for the message is ${parseInt(validatedContact)}.
    // The message is here${message}.
    The sender is down
    `);

    try {
        SendReport = await WhatsAppBotClient.sendMessage(validatedContact, message);

    } catch (error) {
        console.log(error);
    }
    // console.log("The sender is---",WhatsAppBotClient)
    return result={
        from:WhatsAppBotClient.authStrategy.clientId,
        to: validatedContact,
        SendReport
    };
}