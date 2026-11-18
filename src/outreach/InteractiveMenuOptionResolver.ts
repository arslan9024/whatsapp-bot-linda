export function resolveMenuSelection(input: string): number {
  return parseInt(input.trim(), 10) || -1;
}
export default resolveMenuSelection;
