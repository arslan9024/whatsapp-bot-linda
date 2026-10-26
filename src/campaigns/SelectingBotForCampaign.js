// Lion0 client is available as global.Lion0 after bot initialization
// This function selects the appropriate WhatsApp client based on iteration number

export async function SelectingBotForCampaign(Iteration) {
  let RegisteredAgentWAClient;

  console.log("This is the iteration in the campaign", Iteration);

  try {
    console.log("The switch is finding client bot.");
    switch (Iteration) {
      case 0:
        RegisteredAgentWAClient = global.Lion0;
        break;
      case 1:
        // RegisteredAgentWAClient = global.Lion1;
        break;
      // case 2:
      //   RegisteredAgentWAClient = global.Lion2;
      //   break;
      // case 3:
      //   RegisteredAgentWAClient = global.Lion3;
      //   break;

      // case 4:
      //   RegisteredAgentWAClient = global.Lion4;
      //   break;
      // case 5:
      //   RegisteredAgentWAClient = global.Lion5;
      //   break;
      // case 6:
      //   RegisteredAgentWAClient = global.Lion6;
      //   break;
      // case 7:
      //   RegisteredAgentWAClient = global.Lion7;
      //   break;
      // case 8:
      //   RegisteredAgentWAClient = global.Lion8;
      //   break;
      // case 9:
      //   RegisteredAgentWAClient = global.Lion9;
      //   break;

      default:
        RegisteredAgentWAClient = global.Lion0;
    }
    return RegisteredAgentWAClient;
  } catch (error) {
    console.log(error);
  }
}
