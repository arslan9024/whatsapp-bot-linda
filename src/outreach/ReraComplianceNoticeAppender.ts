export function appendReraNotice(body: string, reraPermit: string): string {
  return `${body}\n\n[RERA Permit: ${reraPermit}]`;
}
export default appendReraNotice;
