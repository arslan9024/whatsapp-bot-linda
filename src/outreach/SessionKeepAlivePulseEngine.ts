export function triggerKeepAlivePing(phone: string): { pinged: boolean; time: string } {
  return { pinged: true, time: new Date().toISOString() };
}
export default triggerKeepAlivePing;
