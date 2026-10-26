
import { convertMsToTime, toMilliseconds } from "../utils/time.js";
import { InputOne as Time} from "../../Inputs/InputOne.js";
import { InputTwo as Samay} from "../../Inputs/InputOne.js";


export const RandomDelay = () => new Promise((resolve, reject) => { 
    const delay = Math.floor((Math.random() * (Time.MinimumTimeGap)) + (Time.MinimumTimeGap));
    let nightDelay;
    const shiftEnd=Time.ShiftEnd, shiftStart=Time.ShiftStart;
    // let morningShiftStart=Time.morningShiftStart, morningShiftEnd=Time.morningShiftEnd;
    shiftStart>Samay.hours ?  nightDelay= (shiftStart-Samay.hours) : nightDelay= (24-(Samay.hours-shiftStart));
    Samay.isNightTime = Samay.hours > shiftEnd || Samay.hours < shiftStart;
     Samay.LunchTime = Samay.hours > Samay.LunchBreakStart || Samay.hours < Samay.LunchBreakEnd;

    if (Samay.isNightTime === true) {
        setTimeout(resolve, toMilliseconds(nightDelay, 1, 1));
        console.log("As it is night time, i will sleep, and tomorrow i will this messages to remaining clients", nightDelay);
    } else if (Samay.LunchTime===true){
        
        setTimeout(resolve, toMilliseconds(nightDelay, 1, 1));
        console.log("As it is night time, i will sleep, and tomorrow i will this messages to remaining clients", nightDelay);
    } else{
    console.log(`"As it is day time, i will send a message to this client in few seconds. The time now is \u001b[31m${new Date().toLocaleTimeString()}\u001b[0m o'clock"`);
    console.log(`There will be still a little delay of \u001b[32m${convertMsToTime(delay/Time.Speed)}\u001b[0m  to keep the Bot Alive and breathing!!!`);
    setTimeout(resolve, delay/Time.Speed);
    }
});
