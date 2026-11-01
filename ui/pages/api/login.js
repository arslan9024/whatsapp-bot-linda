// ui/pages/api/login.js
/**
 * UI Authentication API
 * Single responsibility: Authenticate UI users and issue session tokens.
 */
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};
  const expectedPassword = process.env.ADMIN_PASSWORD || process.env.API_ACCESS_TOKEN || "admin123456789012345678901234567890";
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";

  const isUserValid = username && username.trim() === expectedUsername;
  const isPassValid = password && password.length >= 8 && (
    password === expectedPassword ||
    (process.env.API_ACCESS_TOKEN && password === process.env.API_ACCESS_TOKEN)
  );

  if (!isUserValid || !isPassValid) {
    return res.status(401).json({ error: "Invalid username or password credentials" });
  }

  const token = process.env.API_ACCESS_TOKEN || "token_admin_authorized_ui_session_secure";
  return res.status(200).json({
    success: true,
    token,
    role: "admin",
    expiresIn: "24h",
  });
}

