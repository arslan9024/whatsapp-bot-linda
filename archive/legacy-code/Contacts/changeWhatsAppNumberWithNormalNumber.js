




export async function changeNormalNumberWithWhatsAppNumber(Number) {
    let CorrectNumber;
      Number.includes("@c.us") ? CorrectNumber= Number : CorrectNumber `${Number}@c.us`;
 return CorrectNumber;
}

export async function changeWhatsAppNumberWithNormalNumber(Number) {
    let NewNumber;
    try {
        NewNumber =  Number.slice(0, Number.length - 5);
    } catch (error) {
        console.log(error);
    }
        console.log("The Number after Replacement", NewNumber);
    return NewNumber;
}