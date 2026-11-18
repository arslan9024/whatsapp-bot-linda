export function sumUnreads(chats: any[]): number {
  return chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
}
export default sumUnreads;
