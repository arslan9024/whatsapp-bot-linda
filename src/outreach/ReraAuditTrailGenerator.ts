export function buildAuditEntry(jid: string, action: string) {
  return { jid, action, time: new Date().toISOString() };
}
export default buildAuditEntry;
