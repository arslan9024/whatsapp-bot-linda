// ui/pages/api/socket.js
/**
 * UI Socket.IO Bridge
 * Single responsibility: Initialize Socket.IO instance on HTTP server and stream metrics/logs to UI.
 */
import { Server as ServerIO } from "socket.io";
import services from "../../../src/core/ServiceRegistry.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new ServerIO(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: { origin: "*" },
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      // Send welcome handshake
      socket.emit("log", `[${new Date().toLocaleTimeString()}] UI Client connected to Linda Real-Time Hub`);

      // Periodic metrics push (every 5 seconds)
      const interval = setInterval(() => {
        const mem = process.memoryUsage();
        socket.emit("metrics", {
          timestamp: new Date().toISOString(),
          uptime: `${Math.floor(process.uptime())}s`,
          activeSessions: services.has("sessionManager") ? 1 : 0,
          rateLimit: "Optimal (0/min queued)",
          memory: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        });
      }, 5000);

      socket.on("disconnect", () => {
        clearInterval(interval);
      });
    });
  }

  res.end();
}
