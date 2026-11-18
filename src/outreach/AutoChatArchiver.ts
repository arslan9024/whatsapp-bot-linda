export function shouldArchiveChat(idleDays: number): boolean {
  return idleDays >= 30;
}
export default shouldArchiveChat;
