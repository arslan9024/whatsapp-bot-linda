// ui/pages/api/runScript.js
/**
 * UI Script Runner API
 * Single responsibility: Execute whitelisted maintenance scripts safely via child_process.
 * Complies with Production Law #1: NEVER kill node.exe.
 */
import { spawn } from "node:child_process";

const ALLOWED_SCRIPTS = {
  doctor: ["tools/doctor.js"],
  status: ["tools/showStatus.js"],
  "backup-verify": ["tools/verifyMongoBackup.js"],
  "reap-zombies": ["src/connection/ZombieBrowserReaper.js"],
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { script } = req.body || {};
  if (!script || !ALLOWED_SCRIPTS[script]) {
    return res.status(400).json({ error: "Invalid or unauthorized script key" });
  }

  const scriptArgs = ALLOWED_SCRIPTS[script];
  const rootDir = process.cwd();

  const child = spawn(process.execPath, scriptArgs, {
    cwd: rootDir,
    env: process.env,
    shell: false,
  });

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    errorOutput += chunk.toString();
  });

  child.on("close", (code) => {
    if (code === 0) {
      return res.status(200).json({
        success: true,
        script,
        message: output.slice(-500) || "Executed successfully",
      });
    }

    return res.status(500).json({
      success: false,
      script,
      error: errorOutput.slice(-500) || `Process exited with code ${code}`,
    });
  });
}

