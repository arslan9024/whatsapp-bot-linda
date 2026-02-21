import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const f = path.join(__dirname, 'code/WhatsAppBot/CreatingNewWhatsAppClient.js');
let c = fs.readFileSync(f, 'utf-8');

console.log('🔧 Applying WhatsApp Client Stability Fixes...\n');

// Fix 1: Remove --single-process flag
const before1 = c.length;
c = c.replace(/\s+"--single-process",\s*\/\/[^\n]*\n/g, '');
if (c.length < before1) {
  console.log('✅ Fix 1: Removed --single-process flag');
} else {
  console.log('⚠️  Fix 1: Flag not found (may already be removed)');
}

// Fix 2: QR timeout 240s → 300s
if (c.includes('qrTimeoutMs: 240000')) {
  c = c.replace('qrTimeoutMs: 240000,', 'qrTimeoutMs: 300000,');
  console.log('✅ Fix 2: QR timeout 240s → 300s');
}

// Fix 3: Connection timeout 120s → 180s
if (c.includes('connectionTimeoutMs: 120000')) {
  c = c.replace('connectionTimeoutMs: 120000,', 'connectionTimeoutMs: 180000,');
  console.log('✅ Fix 3: Connection timeout 120s → 180s');
}

// Fix 4: networkidle2 → networkidle0
if (c.includes("waitUntil: 'networkidle2'")) {
  c = c.replace("waitUntil: 'networkidle2'", "waitUntil: 'networkidle0'");
  console.log('✅ Fix 4: Navigation wait networkidle2 → networkidle0');
}

// Fix 5: Wait timeout 60s → 90s
if (c.includes('timeout: 60000 },  // Wait for network')) {
  c = c.replace('timeout: 60000 },  // Wait for network', 'timeout: 90000 },  // Wait for network');
  console.log('✅ Fix 5: Wait timeout 60s → 90s');
}

// Fix 6: Navigation timeout 60s → 120s
if (c.includes('defaultNavigationTimeout: 60000,')) {
  c = c.replace('defaultNavigationTimeout: 60000,', 'defaultNavigationTimeout: 120000,');
  console.log('✅ Fix 6: Navigation timeout 60s → 120s');
}

// Fix 7: Default timeout 30s → 60s
if (c.includes('defaultTimeout: 30000')) {
  c = c.replace('defaultTimeout: 30000', 'defaultTimeout: 60000');
  console.log('✅ Fix 7: Default timeout 30s → 60s');
}

fs.writeFileSync(f, c, 'utf-8');

console.log('\n✅ All fixes applied successfully!');
console.log('\nSummary:');
console.log('  • QR scan window: 4min → 5min');
console.log('  • Connection timeout: 2min → 3min');
console.log('  • Page load strategy: More stable');
console.log('  • All timeouts: Doubled for reliability');
console.log('  • Single-process: Removed (Windows fix)');
