// ui/pages/api/sessions.js
/**
 * UI Sessions API
 * Single responsibility: Report active WhatsApp session states and respond to ping requests.
 */

const sessionPings = {};

const DEFAULT_SESSIONS = [
  {
    id: "session_poweragent_primary",
    sessionId: "PowerAgent",
    phone: "+971 50 000 0001",
    status: "ready",
    lastActive: new Date(Date.now() - 60 * 1000).toISOString(),
    account: "PowerAgent",
  },
  {
    id: "session_gorahabot_secondary",
    sessionId: "GorahaBot",
    phone: "+971 52 000 0002",
    status: "connected",
    lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    account: "GorahaBot",
  },
];

export default function handler(req, res) {
  if (req.method === "GET") {
    const sessions = DEFAULT_SESSIONS.map((sess) => ({
      ...sess,
      lastPinged: sessionPings[sess.id] ?? null,
    }));
    return res.status(200).json({ sessions, total: sessions.length });
  }

  if (req.method === "POST") {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Session id required" });
    }

    sessionPings[id] = new Date().toISOString();
    return res.status(200).json({
      success: true,
      sessionId: id,
      pingStatus: "alive",
      timestamp: sessionPings[id],
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
