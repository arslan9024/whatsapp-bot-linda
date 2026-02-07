import { Lion, 
} from "../../index.js";

// const  = pack;
export async function SelectingBotForCampaign(Iteration) {
  let RegisteredAgentWAClient;

  console.log("This is the iteration in the campaign", Iteration);

  try {
    console.log("The switch is finding client bot.");
    switch (Iteration) {
      case 0:
        RegisteredAgentWAClient =  Lion;
        break;
      case 1:
        // RegisteredAgentWAClient = Lion2;
        break;
      // case 2:
      //   RegisteredAgentWAClient =Goraha;
      //   break;
      // case 3:
      //   RegisteredAgentWAClient = Umair2;
      //   break;

      // case 4:
      //   RegisteredAgentWAClient = Kalba;
      //   break;
      // case 5:
      //   RegisteredAgentWAClient = Nawal;
      //   break;
      // case 6:
      //   RegisteredAgentWAClient = Nounou;
      //   break;
      // case 7:
      //   RegisteredAgentWAClient = Nana;
      //   break;
      // case 8:
      //   RegisteredAgentWAClient = QMQ;
      //   break;
      // case 9:
      //   RegisteredAgentWAClient = Samy;
      //   break;

      default:
        RegisteredAgentWAClient = Lion;
    }
    return RegisteredAgentWAClient;
  } catch (error) {
    console.log(error);
  }
}
