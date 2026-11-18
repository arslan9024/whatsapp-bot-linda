export function evaluateTextSpamScore(text: string): number {
  let score = 0;
  if (/100%|guarantee|instant profit/i.test(text)) score += 50;
  return score;
}
export default evaluateTextSpamScore;
