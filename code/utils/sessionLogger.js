/**
 * sessionLogger.js
 * Logs session events for debugging and monitoring session restoration
 */

import fs from "fs";
import path from "path";

/**
 * Log session event to session history file
 */
export const logSessionEvent = (number, eventType, eventData = {}) => {
  const sessionPath = path.join(process.cwd(), "sessions", `session-${number}`);
  const logFile = path.join(sessionPath, "session-history.json");

  try {
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const event = {
      timestamp,
      eventType,
      ...eventData,
    };

    let history = [];
    
    if (fs.existsSync(logFile)) {
      try {
        const fileContent = fs.readFileSync(logFile, "utf8");
        history = JSON.parse(fileContent);
      } catch (error) {
        console.warn("⚠️  Could not parse session history, starting fresh");
        history = [];
      }
    }

    history.push(event);

    // Keep only last 100 events to avoid file bloat
    if (history.length > 100) {
      history = history.slice(-100);
    }

    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error("❌ Error logging session event:", error.message);
  }
};

/**
 * Get session history
 */
export const getSessionHistory = (number) => {
  const sessionPath = path.join(process.cwd(), "sessions", `session-${number}`);
  const logFile = path.join(sessionPath, "session-history.json");

  try {
    if (fs.existsSync(logFile)) {
      return JSON.parse(fs.readFileSync(logFile, "utf8"));
    }
  } catch (error) {
    console.error("❌ Error reading session history:", error.message);
  }

  return [];
};

/**
 * Get session statistics
 */
export const getSessionStats = (number) => {
  const history = getSessionHistory(number);

  if (!history || history.length === 0) {
    return null;
  }

  const stats = {
    totalEvents: history.length,
    firstEvent: history[0]?.timestamp,
    lastEvent: history[history.length - 1]?.timestamp,
    restoreCount: history.filter(e => e.eventType === "restore_complete").length,
    failureCount: history.filter(e => e.eventType.includes("failed")).length,
    eventTypes: {},
  };

  // Count event types
  history.forEach(event => {
    stats.eventTypes[event.eventType] = (stats.eventTypes[event.eventType] || 0) + 1;
  });

  return stats;
};

/**
 * Clear session history
 */
export const clearSessionHistory = (number) => {
  const sessionPath = path.join(process.cwd(), "sessions", `session-${number}`);
  const logFile = path.join(sessionPath, "session-history.json");

  try {
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
      console.log(`✅ Session history cleared for ${number}`);
    }
  } catch (error) {
    console.error("❌ Error clearing session history:", error.message);
  }
};

/**
 * Display session history
 */
export const displaySessionHistory = (number, limit = 20) => {
  const history = getSessionHistory(number);

  if (!history || history.length === 0) {
    console.log("📋 No session history found\n");
    return;
  }

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          📋 SESSION HISTORY                              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const recentEvents = history.slice(-limit);

  recentEvents.forEach((event, index) => {
    const num = history.length - limit + index + 1;
    const time = new Date(event.timestamp).toLocaleString();
    
    // Color code event types
    let prefix = "📌";
    if (event.eventType.includes("authenticated")) prefix = "✅";
    if (event.eventType.includes("failed")) prefix = "❌";
    if (event.eventType.includes("restore")) prefix = "🔄";
    if (event.eventType.includes("disconnect")) prefix = "⚠️";

    console.log(`${prefix} ${num}. [${time}] ${event.eventType}`);
    
    if (Object.keys(event).length > 2) {
      // Show additional event data
      Object.entries(event).forEach(([key, value]) => {
        if (key !== "timestamp" && key !== "eventType") {
          console.log(`   └─ ${key}: ${JSON.stringify(value)}`);
        }
      });
    }
  });

  console.log("\n");
};

/**
 * Get last event of specific type
 */
export const getLastEventOfType = (number, eventType) => {
  const history = getSessionHistory(number);

  if (!history) return null;

  return history.reverse().find(event => event.eventType === eventType);
};

/**
 * Check if device was recently reactivated
 */
export const wasRecentlyReactivated = (number, withinSeconds = 300) => {
  const lastRestore = getLastEventOfType(number, "restore_complete");

  if (!lastRestore) return false;

  const secondsSinceRestore = (Date.now() - new Date(lastRestore.timestamp).getTime()) / 1000;
  return secondsSinceRestore <= withinSeconds;
};

export default {
  logSessionEvent,
  getSessionHistory,
  getSessionStats,
  clearSessionHistory,
  displaySessionHistory,
  getLastEventOfType,
  wasRecentlyReactivated,
};
