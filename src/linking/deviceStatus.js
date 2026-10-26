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
      console.log("╔════════════════════════════════════════════════════════════╗");
      console.log("║      ✅ DEVICE LINKED & ACTIVE - READY TO USE              ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      console.log(`✓ Device Status: LINKED & ACTIVE`);
      console.log(`✓ Linked At: ${new Date(status.linkedAt).toLocaleString()}`);
      console.log(`✓ Last Connected: ${new Date(status.lastConnected).toLocaleString()}`);
      console.log(`✓ Auth Method: ${status.authMethod === 'code' ? '6-Digit Code' : 'QR Code'}\n`);
      console.log(`🤖 Bot Instance: Lion0`);
      console.log(`📱 Ready for messages & commands\n`);
    } else if (status.deviceLinked && !status.isActive) {
      console.log("╔════════════════════════════════════════════════════════════╗");
      console.log("║  ⚠️  DEVICE LINKED BUT INACTIVE - RECONNECTING...         ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      console.log(`⚠️  Device Status: LINKED BUT INACTIVE`);
      console.log(`✓ Linked At: ${new Date(status.linkedAt).toLocaleString()}`);
      console.log(`ℹ️  Session exists but needs re-authentication\n`);
      console.log(`🔄 Action: Please scan QR or enter 6-digit code again\n`);
    } else {
      console.log("╔════════════════════════════════════════════════════════════╗");
      console.log("║      ❌ DEVICE NOT LINKED - AUTHENTICATION NEEDED         ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      console.log(`❌ Device Status: NOT LINKED`);
      console.log(`ℹ️  Please authenticate with QR code or 6-digit code\n`);
      console.log(`📱 Choose authentication method to link device\n`);
    }
  } else {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║      ❌ DEVICE NOT LINKED - AUTHENTICATION NEEDED         ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    console.log(`❌ Device Status: NOT LINKED`);
    console.log(`ℹ️  Please authenticate with QR code or 6-digit code\n`);
    console.log(`📱 Choose authentication method to link device\n`);
  }
};

export const displayAuthenticationSuccess = (number, authMethod) => {
  console.clear();
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      ✅ DEVICE LINKED SUCCESSFULLY!                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`📱 Master Account: ${number}\n`);
  console.log(`✅ Device Linked: YES`);
  console.log(`✅ Status: ACTIVE & READY`);
  console.log(`✅ Auth Method: ${authMethod === "code" ? "6-Digit Code" : "QR Code"}`);
  console.log(`✅ Session: Saved & Persistent\n`);
  
  console.log(`🤖 Bot Instance Assigned: Lion0`);
  console.log(`📍 Variable: global.Lion0 = ${number}\n`);
  
  console.log(`⚡ Features Ready:`);
  console.log(`   ✓ Message listening`);
  console.log(`   ✓ Command processing`);
  console.log(`   ✓ Campaign sending`);
  console.log(`   ✓ Contact management\n`);
  
  console.log("⏳ Bot initializing... Please wait.\n");
};
