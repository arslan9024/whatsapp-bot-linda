export async function emulateTyping(client: any, jid: string, durationMs: number): Promise<void> {
  try {
    if (client && typeof client.sendPresenceAvailable === 'function') {
      await client.sendPresenceAvailable();
    }
    await new Promise(r => setTimeout(r, Math.min(durationMs, 5000)));
  } catch {}
}
export default emulateTyping;
