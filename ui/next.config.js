// ui/next.config.js
const path = require("path");

module.exports = {
  reactStrictMode: true,
  // Run the UI on port 4000 to avoid collision with the Express API on 5000
  // and the bot process on 3000 (if any).
  // Override via: PORT=4000 npm run ui
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000",
    NEXT_PUBLIC_SOCKET_PATH: "/api/socket",
  },
  webpack: (config) => {
    // Allow importing from the sibling src/ directory in API routes
    config.resolve.alias["@src"] = path.resolve(__dirname, "../src");
    return config;
  },
};
