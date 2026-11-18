export function isValidOggOpus(buf: Buffer): boolean {
  return buf && buf.length > 4;
}
export default isValidOggOpus;
