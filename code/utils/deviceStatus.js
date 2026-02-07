import fs from "fs";
import path from "path";

export const createDeviceStatusFile = (number) => {
  const sessionPath = path.join(process.cwd(), "sessions", `session-${number}`);
  const statusFile = path.join(sessionPath, "device-status.json");
  
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  
  const status = {
    number,
    deviceLinked: false,
    isActive: false,
    linkedAt: null,
    lastConnected: null,
    authMethod: null,
  };
  
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  return status;
};

export const getDeviceStatus = (number) => {
  const statusFile = path.join(process.cwd(), "sessions", `session-${number}`, "device-status.json");
  
  try {
    if (fs.existsSync(statusFile)) {
      return JSON.parse(fs.readFileSync(statusFile, "utf8"));
    }
  } catch (error) {
    console.error("Error reading device status:", error.message);
  }
  
  return null;
};

export const updateDeviceStatus = (number, updates) => {
  const statusFile = path.join(process.cwd(), "sessions", `session-${number}`, "device-status.json");
  
  try {
    const currentStatus = getDeviceStatus(number) || createDeviceStatusFile(number);
    const newStatus = {
      ...currentStatus,
      ...updates,
      number,
    };
    
    fs.writeFileSync(statusFile, JSON.stringify(newStatus, null, 2));
    return newStatus;
  } catch (error) {
    console.error("Error updating device status:", error.message);
  }
};

export const displayDeviceStatus = (number) => {
  const status = getDeviceStatus(number);
  
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         📱 Device Linking Status                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`Master Account: ${number}\n`);
  
  if (status) {
    if (status.deviceLinked && status.isActive) {
      console.log("✅ Device Status: LINKED & ACTIVE\n");
      console.log(`✓ Linked At: ${new Date(status.linkedAt).toLocaleString()}`);
      console.log(`✓ Last Connected: ${new Date(status.lastConnected).toLocaleString()}`);
      console.log(`✓ Auth Method: ${status.authMethod || "N/A"}\n`);
    } else if (status.deviceLinked && !status.isActive) {
      console.log("⚠️  Device Status: LINKED BUT INACTIVE\n");
      console.log(`✓ Linked At: ${new Date(status.linkedAt).toLocaleString()}`);
      console.log("ℹ️  Session exists but needs re-authentication\n");
    } else {
      console.log("❌ Device Status: NOT LINKED\n");
      console.log("ℹ️  Please authenticate with QR code or 6-digit code\n");
    }
  } else {
    console.log("❌ Device Status: NOT LINKED\n");
    console.log("ℹ️  Please authenticate with QR code or 6-digit code\n");
  }
};

export const displayAuthenticationSuccess = (number, authMethod) => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        ✅ Device Linked Successfully!                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`📱 Master Account: ${number}\n`);
  console.log(`✅ Device Linked: YES`);
  console.log(`✅ Status: ACTIVE & READY`);
  console.log(`✅ Auth Method: ${authMethod === "code" ? "6-Digit Code" : "QR Code"}`);
  console.log(`✅ Session: Saved & Persistent\n`);
  console.log("⏳ Bot initializing... Please wait.\n");
};
