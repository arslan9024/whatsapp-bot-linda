export function isBackAction(input: string): boolean {
  return input === '0' || input.toLowerCase() === 'back';
}
export default isBackAction;
