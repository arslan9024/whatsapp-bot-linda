export async function maybeSendSeen(chat: any, probability = 0.85): Promise<void> {
  if (Math.random() < probability && chat && typeof chat.sendSeen === 'function') {
    try { await chat.sendSeen(); } catch {}
  }
}
export default maybeSendSeen;
