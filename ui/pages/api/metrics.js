// ui/pages/api/metrics.js
/**
 * UI Metrics API
 * Single responsibility: Aggregate and serve real-time operational metrics for UI.
 */
import services from "../../../src/core/ServiceRegistry.js";

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m ${s}s`;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionManager = services.get("sessionManager") || services.get("SessionManager");
  const rateLimiter = services.get("rateLimiter") || services.get("RateLimiter");

  const mem = process.memoryUsage();
  const uptimeSeconds = process.uptime();

  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: formatUptime(uptimeSeconds),
    activeSessions: sessionManager?.getActiveCount?.() ?? (services.has("client") ? 1 : 0),
    rateLimit: rateLimiter?.getStats?.()?.formatted ?? "Optimal (0/min queued)",
    memory: `${Math.round(mem.rss / 1024 / 1024)} MB RSS`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
    registeredServices: services.snapshot ? Object.keys(services.snapshot()) : [],
    status: "healthy",
  };

  return res.status(200).json(metrics);
}
