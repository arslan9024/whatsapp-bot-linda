// ui/pages/api/runScript.js
/**
 * UI Script Runner API
 * Single responsibility: Execute whitelisted maintenance scripts safely.
 * - NEVER kills node.exe (Production Law #1)
 * - cwd resolved relative to the repo root, not the ui/ subfolder
 */
import { spawn } from "node:child_process";
import path from "node:path";

// Repo root is one level above ui/
const REPO_ROOT = path.resolve(process.cwd(), "..");

const ALLOWED_SCRIPTS = {
  doctor: "node tools/doctor.js",
  status: "node tools/showStatus.js",
  "list-sessions": "node tools/listSessions.js",
  "backup-verify": "node tools/verifyMongoBackup.js",
  "clean-sessions": "node tools/cleanSessions.js",
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { script } = req.body || {};
  if (!script || !ALLOWED_SCRIPTS[script]) {
    return res.status(400).json({ error: "Invalid or unauthorized script key" });
  }

  const [cmd, ...args] = ALLOWED_SCRIPTS[script].split(" ");

  const child = spawn(cmd, args, {
    cwd: REPO_ROOT,
    env: process.env,
    shell: true,
  });

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { errorOutput += chunk.toString(); });

  child.on("close", (code) => {
    if (code === 0) {
      return res.status(200).json({
        success: true,
        script,
        output: output.slice(-1500) || "Completed successfully.",
      });
    }
    return res.status(500).json({
      success: false,
      script,
      error: errorOutput.slice(-1000) || `Process exited with code ${code}`,
    });
  });
}
