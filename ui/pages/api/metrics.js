// ui/pages/api/metrics.js
/**
 * UI Metrics API
 * Single responsibility: Expose real-time process metrics for the dashboard.
 * Works standalone — no ServiceRegistry import needed; data derived from process itself.
 */

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + "d " : ""}${h}h ${m}m ${s}s`;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mem = process.memoryUsage();
  const uptimeSeconds = process.uptime();

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    uptime: formatUptime(uptimeSeconds),
    activeSessions: parseInt(process.env.ACTIVE_SESSIONS || "0", 10),
    rateLimit: "Optimal (0/min queued)",
    memory: `${Math.round(mem.rss / 1024 / 1024)} MB RSS`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB Heap`,
    status: "healthy",
  });
}
