# 🔒 Author Requirements & Coding Standards

> **These are strict requirements set by the project author (Arslan Malik).**  
> All developers and AI assistants MUST follow these at all times.  
> They are not suggestions — they are requirements.

---

## 1. Safety — Never Kill Node.js

**REQUIREMENT**: Crash recovery and cleanup scripts may ONLY kill browser processes.

```js
// ✅ CORRECT — kill only Chrome
await execAsync('taskkill /F /IM chrome.exe 2>nul');
await execAsync('taskkill /F /IM chromium.exe 2>nul');

// ❌ WRONG — NEVER do this
await execAsync('taskkill /F /IM node.exe');  // This kills the bot itself!
```

**Why**: The bot process must self-manage restarts via nodemon. Any script that kills `node.exe` would terminate the bot permanently.

**Enforced by**: `tools/doctor.js` — Check #4 and #10 scan all cleanup files and fail if `node.exe` kill is found.

---

## 2. ES Modules Only

**REQUIREMENT**: All files use ES Module syntax.

```js
// ✅ CORRECT
import { foo } from './foo.js';
export function bar() { }
export default myClass;

// ❌ WRONG
const foo = require('./foo');
module.exports = bar;
```

**Why**: `"type": "module"` in `package.json`. Node.js v25 with ES Modules is the project standard.

**Note**: Always include `.js` extension in import paths (required by Node.js ESM).

---

## 3. Logger Over Console

**REQUIREMENT**: Use `logger` from `code/utils/Logger.js` for all production logging.

```js
// ✅ CORRECT
import { logger } from '../utils/Logger.js';
logger.info('Client ready');
logger.warn('Retry attempt', { phone, attempt });
logger.error('Send failed', error);

// ❌ WRONG
console.log('Client ready');
console.error('Send failed', error);
console.warn('Retry attempt');
```

**Exceptions**: `console.log` is acceptable only in:
- Terminal dashboard display files (`TerminalHealthDashboard.js`, `MetricsDashboard.js`)
- CLI tools (`tools/`, `CLI/` directories)
- Test files

**Why**: Raw console bypasses log rotation, level filtering, structured formatting, and file persistence. Logs go to `logs/bot-YYYY-MM-DD.log` and can be inspected after crashes.

---

## 4. ServiceRegistry for Shared State

**REQUIREMENT**: All shared singleton instances use `ServiceRegistry`, not `global.xxx`.

```js
// ✅ CORRECT
import services from '../utils/ServiceRegistry.js';
services.register('connectionManager', new ConnectionManager());
const cm = services.getOrThrow('connectionManager');

// ❌ WRONG
global.connectionManager = new ConnectionManager();
const cm = global.connectionManager;
```

**Why**: `global.xxx` causes hidden coupling, impossible-to-trace bugs, and makes testing hard. ServiceRegistry provides explicit dependency injection with error-on-missing.

---

## 5. Rate Limit All WhatsApp Sends

**REQUIREMENT**: Every outgoing WhatsApp message must go through `RateLimiter`.

```js
// ✅ CORRECT
import { rateLimiter } from '../utils/RateLimiter.js';
await rateLimiter.acquire(phoneNumber);
await client.sendMessage(chatId, message);

// ✅ ALSO CORRECT (wrapper pattern)
await rateLimiter.send(phoneNumber, () => client.sendMessage(chatId, msg));

// ❌ WRONG — sending without rate limiting
await client.sendMessage(chatId, message);
```

**Limits**:
- 1 message/second per contact
- 60 messages/minute globally
- 200 messages/hour globally
- 1.2s minimum gap per contact
- 2s gap for bulk sends

**Why**: WhatsApp bans accounts that send too fast. Rate limiting prevents bans.

---

## 6. Null Safety

**REQUIREMENT**: Phone numbers, client instances, and external data must be null-checked.

```js
// ✅ CORRECT
if (!phone || typeof phone !== 'string') {
  logger.warn('Invalid phone', { phone });
  return;
}
if (!client) {
  logger.warn('Client not initialized');
  fails++;
  continue;
}

// ❌ WRONG
client.sendMessage(phone + '@c.us', msg);  // crashes if phone or client is null
```

**Why**: The bot must degrade gracefully. A single null reference that crashes the process can take down all accounts for all users.

---

## 7. Sessions Are Sacred

**REQUIREMENT**: Never delete or modify `sessions/session-{phone}/` during normal bot operation.

```js
// ✅ CORRECT — use dedicated tools
// npm run clean-sessions
// npm run fresh-start

// ❌ WRONG — deleting sessions in business logic
fs.rmSync(`sessions/session-${phone}`, { recursive: true });
```

**Why**: Deleting a session mid-operation causes WhatsApp to invalidate the device link. The user must re-scan QR code. This is disruptive in a 24/7 production environment.

---

## 8. Manual Linking by Default

**REQUIREMENT**: WhatsApp accounts must NOT auto-link on bot startup.

```js
// ✅ CORRECT — wait for user command
// User types: link master
// Or sends via WhatsApp: !link-master

// ❌ WRONG — auto-linking without user consent
await createClient(phone);  // immediately starts QR without user requesting it
```

**Why**: In production, the bot may restart multiple times per day (nodemon). Auto-linking would spam the user with QR codes. Manual linking gives control.

---

## 9. Crash Dump Security

**REQUIREMENT**: Crash dump files must be readable only by the file owner.

```js
// ✅ CORRECT
fs.writeFileSync(dumpPath, dumpContent, 'utf8');
try { fs.chmodSync(dumpPath, 0o600); } catch { /* best effort */ }

// ❌ WRONG
fs.writeFileSync(dumpPath, dumpContent);  // default world-readable
```

**Why**: Crash dumps may contain phone numbers, session tokens, API keys, or partial Google credentials from memory. They must never be readable by other system users.

---

## 10. No Secrets in Git

**REQUIREMENT**: Credentials must never be committed to the repository.

```bash
# ✅ CORRECT — secrets in .env (gitignored)
GORAHA_SERVICE_ACCOUNT_BASE64=eyJrZXkiOiAidmFsdWUifQ==

# ❌ WRONG — secrets in code files
const credentials = { "private_key": "-----BEGIN RSA PRIVATE KEY-----..." };

# ❌ WRONG — secrets in committed JSON
# code/GoogleAPI/keys.json (must be in .gitignore)
```

**Protected by `.gitignore`**:
- `sessions/` and `session-*/`
- `logs/` and `*.log`
- `.env`, `.env.*`
- `session-state.json`
- `*.pem`, `*.key`, `*.p12`

---

## 11. Import Path Correctness

**REQUIREMENT**: Use the correct relative path depth for imports.

| File location | Logger import |
|---------------|--------------|
| `code/utils/*.js` | `'./Logger.js'` |
| `code/Services/*.js` | `'../utils/Logger.js'` |
| `code/WhatsAppBot/*.js` | `'../utils/Logger.js'` |
| `code/Database/*.js` | `'../utils/Logger.js'` |
| `code/Routes/*.js` | `'../utils/Logger.js'` |
| `code/WhatsAppBot/Handlers/*.js` | `'../../utils/Logger.js'` |

**Wrong example that caused a crash**:
```js
// code/Services/CommissionService.js
import { logger } from './Logger.js';     // ❌ WRONG — Logger.js is not in Services/
import { logger } from '../utils/Logger.js'; // ✅ CORRECT
```

---

## 12. Error Handling Pattern

**REQUIREMENT**: All async operations must have structured error handling.

```js
// ✅ CORRECT pattern
async function doOperation(phone, data) {
  const log = logger.child({ fn: 'doOperation', phone });
  
  if (!phone) { log.warn('missing phone'); return null; }
  
  try {
    const result = await someAsyncOp(data);
    log.info('operation succeeded');
    return result;
  } catch (err) {
    log.error('operation failed', err);
    // Decide: re-throw (caller handles) or return null (graceful degrade)
    return null;
  }
}

// ❌ WRONG — swallowing errors silently
try {
  await someAsyncOp();
} catch (e) {
  // nothing — bug disappears, symptoms appear elsewhere
}

// ❌ WRONG — crashing on expected failures
await someAsyncOp();  // no try/catch — crashes entire process on network blip
```

---

## Quick Checklist Before Commit

- [ ] `npm run doctor` → 12/12 passing
- [ ] No `global.xxx` added
- [ ] No `console.log/error/warn` in non-dashboard/CLI files
- [ ] All imports use `.js` extension
- [ ] Import paths are correct for file depth
- [ ] Phone number validated before use
- [ ] `rateLimiter.acquire()` called before every `client.sendMessage()`
- [ ] No secrets hardcoded
- [ ] No `node.exe` kill in any cleanup script
- [ ] `npm test` passing
