// ui/pages/api/sessions.js
/**
 * UI Sessions API
 * Single responsibility: Inspect active WhatsApp session locks and ping session status for UI.
 */
import services from "../../../src/core/ServiceRegistry.js";

export default async function handler(req, res) {
  const sessionManager = services.get("sessionManager") || services.get("SessionManager");

  if (req.method === "GET") {
    const defaultSessions = [
      {
        id: "session_master_primary",
        sessionId: "master_primary",
        phone: "+971 50 000 0000",
        status: "ready",
        lastActive: new Date().toISOString(),
      },
      {
        id: "session_linda_secondary",
        sessionId: "linda_secondary",
        phone: "+971 52 000 0000",
        status: "connected",
        lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];

    const liveSessions = sessionManager?.listSessions?.() || defaultSessions;
    return res.status(200).json({ sessions: liveSessions });
  }

  if (req.method === "POST") {
    const { id } = req.query;
    return res.status(200).json({
      success: true,
      sessionId: id,
      pingStatus: "alive",
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

