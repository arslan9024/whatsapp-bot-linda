export function isSafeLength(body: string): boolean {
  return body.length <= 800;
}
export default isSafeLength;
