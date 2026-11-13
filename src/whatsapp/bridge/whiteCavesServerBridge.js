/**
 * Linda Relay Bridge
 * 
 * Forwards incoming WhatsApp messages from whatsapp-bot-linda
 * to White-Caves-Server webhook router for AI processing & lead triage.
 */

const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:5001';

export async function forwardMessageToWhiteCavesServer(incomingMessage) {
  try {
    const payload = {
      from: incomingMessage.from || incomingMessage.sender,
      body: incomingMessage.body || incomingMessage.text || '',
      hasMedia: Boolean(incomingMessage.hasMedia),
      mediaType: incomingMessage.type || 'text',
      timestamp: incomingMessage.timestamp || new Date().toISOString(),
      sourceBotId: 'linda-worker-primary'
    };

    const res = await fetch(`${MAIN_SERVER_URL}/api/linda/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Secret': process.env.WHATSAPP_WEBHOOK_SECRET || 'white-caves-dev-webhook-secret'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`[LindaRelay] Server responded with status: ${res.status}`);
      return false;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[LindaRelay] Failed to forward message to White-Caves-Server:', err.message);
    return false;
  }
}
