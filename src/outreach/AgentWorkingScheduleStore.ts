export function isAgentShiftActive(hourGST: number): boolean {
  return hourGST >= 9 && hourGST <= 18;
}
export default isAgentShiftActive;
