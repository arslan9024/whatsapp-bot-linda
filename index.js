import { WhatsAppClientFunctions } from "./code/WhatsAppBot/WhatsAppClientFunctions.js";
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import {Agents} from "./Inputs/ArslanNumbers.js";
// import {NawalAgents} from "./Inputs/NawalNumbers.js";

// Enable pairing code (6-digit code) instead of QR code
export const Lion0 = await CreatingNewWhatsAppClient(Agents.Agent0.Number);
WhatsAppClientFunctions(Lion0, Agents.Agent0.Number, true);
// export const Lion1 = await CreatingNewWhatsAppClient(Agents.Agent1.Number);
// WhatsAppClientFunctions(Lion1, Agents.Agent1.Number, true);
// export const Lion2 = await CreatingNewWhatsAppClient(Agents.Agent2.Number);
// WhatsAppClientFunctions(Lion2, Agents.Agent2.Number, true);
// export const Lion3 = await CreatingNewWhatsAppClient(Agents.Agent4.Number);
// WhatsAppClientFunctions(Lion3, Agents.Agent4.Number, true);
// export const Lion4 = await CreatingNewWhatsAppClient(Agents.Agent6.Number);
// WhatsAppClientFunctions(Lion4, Agents.Agent6.Number, true);
// export const Lion5 = await CreatingNewWhatsAppClient(Agents.Agent3.Number);
// WhatsAppClientFunctions(Lion5, Agents.Agent3.Number, true);
// export const Lion7 = await CreatingNewWhatsAppClient(NawalAgents.Agent7.Number);
// WhatsAppClientFunctions(Lion7, NawalAgents.Agent7.Number, true);
// export const Lion8 = await CreatingNewWhatsAppClient(NawalAgents.Agent8.Number);
// WhatsAppClientFunctions(Lion8, NawalAgents.Agent8.Number, true);
// export const Lion9 = await CreatingNewWhatsAppClient(NawalAgents.Agent9.Number);
// WhatsAppClientFunctions(Lion9, NawalAgents.Agent9.Number, true);
