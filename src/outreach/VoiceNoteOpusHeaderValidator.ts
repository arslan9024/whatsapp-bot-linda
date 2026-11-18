export function validateOpusBuffer(buf: Buffer): boolean {
  return Boolean(buf && buf.length > 16 && buf.slice(0, 4).toString() === 'OggS');
}
export default validateOpusBuffer;
