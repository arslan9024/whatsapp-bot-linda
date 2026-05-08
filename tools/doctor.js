/**
 * ====================================================================
 * DOCTOR — Project reliability audit (npm run doctor)
 * ====================================================================
 * Runs 12 checks and prints a clear pass/fail report.
 * Exit code 0 = all green.  Exit code 1 = one or more failures.
 *
 * Checks:
 *  1.  Core entry points exist (index.js, package.json)
 *  2.  Google key files are valid service-account JSON
 *  3.  accounts.json registry structure is correct
 *  4.  browserCleanup.js does NOT kill node.exe
 *  5.  WhatsAppCommandBridge uses session-aware guard
 *  6.  logs/ directory exists or can be created, and is writable
 *  7.  sessions/ directory check — lists any linked sessions
 *  8.  Memory usage within sane bounds (heap < 500 MB)
 *  9.  package.json contains all critical npm scripts
 * 10.  No dangerous node.exe taskkill patterns in any cleanup file
 * 11.  ServiceRegistry module exports: get, register, getOrThrow, snapshot
 * 12.  Logger module exports: Logger, logger, and all methods present
 *
 * @upgraded May 2026 — from 5 to 12 checks, coloured output, async imports
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── ANSI colours ────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;

// ─── result collector ────────────────────────────────────────────────
const results = [];

function pass(num, label, detail = '') {
  results.push({ ok: true, num, label, detail });
}

function fail(num, label, detail = '') {
  results.push({ ok: false, num, label, detail });
}

function r(filePath) { return path.join(ROOT, filePath); }

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// ─── CHECK 1: Core files ─────────────────────────────────────────────
function checkCoreFiles() {
  const files = ['index.js', 'package.json'];
  const missing = files.filter((f) => !fs.existsSync(r(f)));
  if (missing.length) {
    fail(1, 'Core files exist', `Missing: ${missing.join(', ')}`);
  } else {
    pass(1, 'Core files exist', 'index.js, package.json ✓');
  }
}

// ─── CHECK 2: Google key files ───────────────────────────────────────
function checkGoogleKeys() {
  const keyPaths = [
    'code/GoogleAPI/keys.json',
    // GmailOne keys are OAuth format — validated separately
  ];
  const errors = [];
  let found = 0;

  for (const kp of keyPaths) {
    const full = r(kp);
    if (!fs.existsSync(full)) continue;
    found++;
    const data = readJsonSafe(full);
    if (!data) { errors.push(`${kp}: invalid JSON`); continue; }
    const isServiceAccount = data.type === 'service_account' && data.client_email;
    const isOAuth          = data.web  && data.web.client_id;
    if (!isServiceAccount && !isOAuth) {
      errors.push(`${kp}: not a recognised Google credentials format`);
    }
  }

  if (found === 0) {
    fail(2, 'Google key files', 'No key files found (expected code/GoogleAPI/keys.json)');
  } else if (errors.length) {
    fail(2, 'Google key files', errors.join('; '));
  } else {
    pass(2, 'Google key files', `${found} file(s) validated ✓`);
  }
}

// ─── CHECK 3: accounts.json structure ────────────────────────────────
function checkAccountsJson() {
  const filePath = r('code/GoogleAPI/accounts.json');
  if (!fs.existsSync(filePath)) {
    fail(3, 'accounts.json registry', 'File not found');
    return;
  }
  const data = readJsonSafe(filePath);
  if (!data) { fail(3, 'accounts.json registry', 'Invalid JSON'); return; }

  const hasAccountsKey = data.accounts && typeof data.accounts === 'object';
  if (!hasAccountsKey) {
    fail(3, 'accounts.json registry', 'Missing "accounts" object key');
    return;
  }
  const names = Object.keys(data.accounts);
  if (names.length === 0) {
    fail(3, 'accounts.json registry', '"accounts" is empty');
  } else {
    pass(3, 'accounts.json registry', `${names.length} account(s): ${names.join(', ')}`);
  }
}

// ─── CHECK 4: browserCleanup safe ────────────────────────────────────
function checkBrowserCleanup() {
  const filePath = r('code/utils/browserCleanup.js');
  if (!fs.existsSync(filePath)) {
    fail(4, 'browserCleanup.js safe kill', 'File not found');
    return;
  }
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const dangerous = lines.filter((line) => {
    const l = line.toLowerCase();
    return l.includes('taskkill') && l.includes('node.exe') &&
           !l.trim().startsWith('//') && !l.trim().startsWith('*');
  });

  if (dangerous.length > 0) {
    fail(4, 'browserCleanup.js safe kill', `DANGER: taskkill node.exe found on ${dangerous.length} line(s)!`);
  } else {
    pass(4, 'browserCleanup.js safe kill', 'No node.exe kill found ✓');
  }
}

// ─── CHECK 5: WhatsAppCommandBridge session-aware guard ──────────────
function checkCommandBridgeGuard() {
  const filePath = r('code/WhatsAppBot/WhatsAppCommandBridge.js');
  if (!fs.existsSync(filePath)) {
    fail(5, 'CommandBridge session-aware guard', 'File not found');
    return;
  }
  const src = fs.readFileSync(filePath, 'utf8');
  if (src.includes('hasSessionArtifacts')) {
    pass(5, 'CommandBridge session-aware guard', 'hasSessionArtifacts() guard present ✓');
  } else {
    fail(5, 'CommandBridge session-aware guard', 'Missing hasSessionArtifacts() — recovery spam risk');
  }
}

// ─── CHECK 6: logs/ writable ─────────────────────────────────────────
function checkLogsDir() {
  const logsDir = r('logs');
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const probe = path.join(logsDir, `.doctor-probe-${Date.now()}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    const logFiles = fs.readdirSync(logsDir).filter((f) => f.endsWith('.log'));
    pass(6, 'logs/ dir writable', `${logFiles.length} log file(s) present`);
  } catch (e) {
    fail(6, 'logs/ dir writable', `Write test failed: ${e.message}`);
  }
}

// ─── CHECK 7: sessions/ directory ────────────────────────────────────
function checkSessionsDir() {
  const sessDir = r('sessions');
  if (!fs.existsSync(sessDir)) {
    pass(7, 'sessions/ directory', 'No sessions dir yet (OK for fresh install)');
    return;
  }
  const subs = fs.readdirSync(sessDir).filter((s) =>
    fs.statSync(path.join(sessDir, s)).isDirectory()
  );
  const linked = subs.filter((s) => {
    const sessionFile = path.join(sessDir, s, 'Default', 'Session');
    return fs.existsSync(sessionFile);
  });
  pass(7, 'sessions/ directory',
    `${subs.length} session folder(s), ${linked.length} fully linked: ${linked.join(', ') || '(none)'}`
  );
}

// ─── CHECK 8: Memory bounds ───────────────────────────────────────────
function checkMemory() {
  const mem    = process.memoryUsage();
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB  = Math.round(mem.rss      / 1024 / 1024);
  const limit  = 500;
  if (heapMB > limit) {
    fail(8, 'Memory within bounds', `Heap ${heapMB} MB exceeds ${limit} MB limit`);
  } else {
    pass(8, 'Memory within bounds', `Heap ${heapMB} MB / RSS ${rssMB} MB ✓`);
  }
}

// ─── CHECK 9: Critical npm scripts ───────────────────────────────────
function checkNpmScripts() {
  const pkg = readJsonSafe(r('package.json'));
  if (!pkg) { fail(9, 'npm scripts', 'package.json unreadable'); return; }
  const required = ['dev:24-7', 'doctor'];
  const missing  = required.filter((s) => !pkg.scripts?.[s]);
  if (missing.length) {
    fail(9, 'npm scripts', `Missing scripts: ${missing.join(', ')}`);
  } else {
    pass(9, 'npm scripts', `${required.join(', ')} all present ✓`);
  }
}

// ─── CHECK 10: No node.exe kill anywhere ─────────────────────────────
function checkNoNodeKillAnywhere() {
  const searchDirs = ['code/utils', 'code/WhatsAppBot'];
  const dangerous  = [];

  for (const dir of searchDirs) {
    const full = r(dir);
    if (!fs.existsSync(full)) continue;
    const files = fs.readdirSync(full).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const src   = fs.readFileSync(path.join(full, file), 'utf8');
      const lines = src.split('\n');
      lines.forEach((line, idx) => {
        const l = line.toLowerCase();
        if (l.includes('taskkill') && l.includes('node.exe') &&
            !l.trim().startsWith('//') && !l.trim().startsWith('*')) {
          dangerous.push(`${dir}/${file}:${idx + 1}`);
        }
      });
    }
  }

  if (dangerous.length) {
    fail(10, 'No node.exe kill anywhere', `Found in: ${dangerous.join(', ')}`);
  } else {
    pass(10, 'No node.exe kill anywhere', 'All cleanup files safe ✓');
  }
}

// ─── CHECK 11: ServiceRegistry exports ───────────────────────────────
async function checkServiceRegistry() {
  const filePath = r('code/utils/ServiceRegistry.js');
  if (!fs.existsSync(filePath)) {
    fail(11, 'ServiceRegistry exports', 'File not found');
    return;
  }
  try {
    const mod = await import(pathToFileURL(filePath).href);
    const svc = mod.default;
    const methods = ['get', 'register', 'has', 'getOrThrow', 'snapshot', 'list'];
    const missing = methods.filter((m) => typeof svc[m] !== 'function');
    if (missing.length) {
      fail(11, 'ServiceRegistry exports', `Missing methods: ${missing.join(', ')}`);
    } else {
      pass(11, 'ServiceRegistry exports', `${methods.join(', ')} all present ✓`);
    }
  } catch (e) {
    fail(11, 'ServiceRegistry exports', `Import error: ${e.message}`);
  }
}

// ─── CHECK 12: Logger exports + methods ──────────────────────────────
async function checkLogger() {
  const filePath = r('code/utils/Logger.js');
  if (!fs.existsSync(filePath)) {
    fail(12, 'Logger exports', 'File not found');
    return;
  }
  try {
    const mod = await import(pathToFileURL(filePath).href);
    const { Logger, logger } = mod;

    const classOk     = typeof Logger === 'function';
    const singletonOk = logger && typeof logger.info === 'function';
    const methodsOk   = ['info', 'warn', 'error', 'debug', 'success', 'time', 'child']
      .every((m) => typeof logger[m] === 'function');

    if (!classOk)     { fail(12, 'Logger exports', 'Logger class not exported'); return; }
    if (!singletonOk) { fail(12, 'Logger exports', 'logger singleton not exported or missing .info()'); return; }
    if (!methodsOk)   { fail(12, 'Logger exports', 'logger missing methods (time / child / success)'); return; }

    pass(12, 'Logger exports', 'Logger class + logger singleton with all methods ✓');
  } catch (e) {
    fail(12, 'Logger exports', `Import error: ${e.message}`);
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(BOLD(CYAN('╔══════════════════════════════════════════════════╗')));
  console.log(BOLD(CYAN('║       WhatsApp Bot Linda — Doctor v2.0           ║')));
  console.log(BOLD(CYAN('╚══════════════════════════════════════════════════╝')));
  console.log('');

  checkCoreFiles();
  checkGoogleKeys();
  checkAccountsJson();
  checkBrowserCleanup();
  checkCommandBridgeGuard();
  checkLogsDir();
  checkSessionsDir();
  checkMemory();
  checkNpmScripts();
  checkNoNodeKillAnywhere();
  await checkServiceRegistry();
  await checkLogger();

  // Report
  console.log('');
  console.log(BOLD('  Results:'));
  console.log('');

  let passed = 0, failed = 0;
  for (const result of results) {
    if (result.ok) {
      passed++;
      console.log(`  ${GREEN('✅')} [${String(result.num).padStart(2, '0')}] ${result.label}`);
      if (result.detail) console.log(`       ${YELLOW(result.detail)}`);
    } else {
      failed++;
      console.log(`  ${RED('❌')} [${String(result.num).padStart(2, '0')}] ${result.label}`);
      if (result.detail) console.log(`       ${RED(result.detail)}`);
    }
  }

  console.log('');
  const summary = `  ─── ${passed + failed} checks: ${GREEN(`${passed} passed`)}  ${failed ? RED(`${failed} failed`) : ''} ───`;
  console.log(BOLD(summary));
  console.log('');

  if (failed === 0) {
    console.log(GREEN(BOLD('  🎉  All checks passed!  Bot is in good shape.')));
  } else {
    console.log(RED(BOLD(`  ⚠️   ${failed} check(s) need attention — see failures above.`)));
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Doctor script crashed:', e.message);
  process.exit(1);
});
