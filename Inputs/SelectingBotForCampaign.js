import {
  Lion0,
  // Lion1,
  // Lion2,
  // Lion3,
  // Lion4,
  // Lion5,
  // Lion6,
  // Lion7,
  // Lion8,
  // Lion9

} from "../index.js";

export async function SelectingBotForCampaign(Iteration) {
  let RegisteredAgentWAClient;
  try {
    console.log("---------- -------finding client bot.....................***************************", Iteration);
    switch (Iteration) {
      case 0:RegisteredAgentWAClient = Lion0;break;
      // case 1:RegisteredAgentWAClient = Lion1;break;
      // case 2:RegisteredAgentWAClient = Lion2;break;
      // case 3:RegisteredAgentWAClient = Lion3;break;
      // case 4:RegisteredAgentWAClient = Lion4;break;
      // case 5:RegisteredAgentWAClient = Lion5;break;
      // case 6:RegisteredAgentWAClient = Lion6;break;
      // case 7:RegisteredAgentWAClient = Lion7;break;
      // case 8:RegisteredAgentWAClient = Lion8;break;
      // case 9:RegisteredAgentWAClient = Lion9;break;

      default:
        RegisteredAgentWAClient = Lion3;
    }
  } catch (error) {
    console.log(error);
  }
  return RegisteredAgentWAClient;

}
