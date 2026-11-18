export function appendOfficialDldNotice(body: string, permitNo: string): string {
  return `${body}\n\n[RERA Permit: ${permitNo} • White Caves Real Estate]`;
}
export default appendOfficialDldNotice;
