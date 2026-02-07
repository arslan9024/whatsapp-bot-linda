import {google} from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const keys = JSON.parse(readFileSync('./code/googleSheets/keys.json', 'utf8'));

export const PowerAgent = new google.auth.JWT(
    keys.client_email, 
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets'] 
);
PowerAgent.authorize(function(err, tokens){
// console.log(keys)
    if(err){
        console.log(err);
        return;
    } else{
        console.log("connected")
    }
});

