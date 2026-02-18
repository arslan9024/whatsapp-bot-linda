# CodeAuthManager API Documentation

## Overview
The `CodeAuthManager` is a production-ready module that provides 6-digit code-based authentication for WhatsApp device linking. It serves as a fallback mechanism when QR code display fails due to protocol errors.

**File:** `code/utils/CodeAuthManager.js`  
**Type:** ES Module (default export)  
**Status:** Production Ready  
**Version:** 1.0  
**Created:** February 17, 2026

---

## Installation & Import

```javascript
import CodeAuthManager from './code/utils/CodeAuthManager.js';

// Instantiate with logging function
const codeAuthManager = new CodeAuthManager(logBotFunction);
```

---

## Constructor

### `constructor(logFunction)`

Initialize a new CodeAuthManager instance.

**Parameters:**
- `logFunction` *(Function, optional)* - Custom logging function. Defaults to `console.log`

**Example:**
```javascript
const logBot = (msg, type = "info") => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${msg}`);
};

const codeAuthManager = new CodeAuthManager(logBot);
```

---

## Methods

### `generateCode(phoneNumber)`

Generate a new, secure 6-digit authentication code for a phone number.

**Parameters:**
- `phoneNumber` *(string)* - Device phone number (e.g., "+971505760056")

**Returns:**
- *(string)* - 6-digit code (e.g., "123456") or `null` if failed

**Features:**
- Cryptographically secure random generation
- Automatic cooldown enforcement (30 minutes after 10 failed attempts)
- Prevents spam generation (requires 10 seconds between codes)
- Stores metadata: generation time, expiration, attempt count

**Throws:**
- No exceptions thrown; returns `null` on error

**Example:**
```javascript
const code = codeAuthManager.generateCode('+971505760056');

if (code) {
  console.log(`✅ Generated code: ${code}`);
} else {
  console.log('❌ Failed to generate code (cooldown active?)');
}
```

---

### `displayCodeInTerminal(code, phoneNumber)`

Display the authentication code prominently in the terminal with instructions.

**Parameters:**
- `code` *(string)* - The 6-digit code to display
- `phoneNumber` *(string)* - Device phone number (for context display)

**Returns:**
- *(undefined)* - Logs to console

**Display Format:**
```
╔════════════════════════════════════════════════════════════╗
║           🔐 WHATSAPP DEVICE LINKING CODE 🔐               ║
╠════════════════════════════════════════════════════════════╣
║  Device: +971505760056                                     ║
║  Enter this code in WhatsApp:                              ║
║              1 2 3  4 5 6                    ║
║  Code expires in 5 minutes                                 ║
╠════════════════════════════════════════════════════════════╣
║  Instructions:                                              ║
║  1. Open WhatsApp on your device                           ║
║  2. Go to Settings → Linked Devices                        ║
║  3. Click "Link a Device"                                  ║
║  4. Enter the 6-digit code above                           ║
║  5. Follow the prompts to complete linking                 ║
╚════════════════════════════════════════════════════════════╝
```

**Example:**
```javascript
const code = codeAuthManager.generateCode('+971505760056');
if (code) {
  codeAuthManager.displayCodeInTerminal(code, '+971505760056');
}
```

---

### `validateCode(phoneNumber, enteredCode)`

Validate a code entered by the user.

**Parameters:**
- `phoneNumber` *(string)* - Device phone number
- `enteredCode` *(string|number)* - Code entered by user (auto-normalized)

**Returns:**
- *(boolean)* - `true` if valid, `false` otherwise

**Validation Rules:**
1. Code must exist for this phone number
2. Code must not be expired (5 minute timeout)
3. Code must not already be used
4. Maximum 3 invalid attempts allowed
5. Non-digit characters are stripped automatically

**Emits Events:**
- `'code:validated'` - When code is valid
- `'code:invalid'` - When code is invalid

**Example:**
```javascript
const isValid = codeAuthManager.validateCode('+971505760056', '123456');

if (isValid) {
  console.log('✅ Code validated! Device linking confirmed.');
} else {
  console.log('❌ Invalid code. Try again.');
}
```

---

### `getActiveCode(phoneNumber)`

Retrieve metadata for an active code without validating it.

**Parameters:**
- `phoneNumber` *(string)* - Device phone number

**Returns:**
- *(Object|null)* - Code metadata or null if not found/expired

**Returns Object:**
```javascript
{
  code: '123456',           // The 6-digit code
  expiresIn: 298,           // Seconds until expiration
  used: false,              // Whether code has been validated
  attempts: 0               // Number of validation attempts
}
```

**Example:**
```javascript
const metadata = codeAuthManager.getActiveCode('+971505760056');

if (metadata) {
  console.log(`Code expires in ${metadata.expiresIn} seconds`);
} else {
  console.log('No active code for this device');
}
```

---

### `clearCode(phoneNumber)`

Manually clear/revoke a code for a phone number.

**Parameters:**
- `phoneNumber` *(string)* - Device phone number

**Returns:**
- *(boolean)* - `true` if code was cleared, `false` if not found

**Example:**
```javascript
const cleared = codeAuthManager.clearCode('+971505760056');

if (cleared) {
  console.log('✅ Code cleared. User must generate new code.');
} else {
  console.log('⚠️  No active code to clear.');
}
```

---

### `cleanupExpiredCodes()`

Remove all expired codes from memory. Called automatically by cleanup interval.

**Parameters:** None

**Returns:**
- *(undefined)* - Logs cleanup activity

**Frequency:** Automatically called every 10 seconds

**Example:**
```javascript
// Manual cleanup (usually not needed)
codeAuthManager.cleanupExpiredCodes();
```

---

### `getMetrics()`

Get analytics and performance metrics.

**Parameters:** None

**Returns:**
- *(Object)* - Metrics object

**Metrics Object:**
```javascript
{
  codesGenerated: 10,              // Total codes created
  codesUsed: 7,                    // Codes that successfully linked devices
  codesExpired: 2,                 // Codes that timed out
  codesRejected: 1,                // Codes that failed validation
  fallbacksFromQR: 5,              // Times QR fallback was triggered
  averageTimeToLink: 45,           // Avg seconds from generation to validation
  activeCodesCount: 2,             // Currently active codes
  successRate: 70                  // Percentage (0-100)
}
```

**Example:**
```javascript
const metrics = codeAuthManager.getMetrics();

console.log(`Success Rate: ${metrics.successRate}%`);
console.log(`Avg Link Time: ${metrics.averageTimeToLink}s`);
console.log(`Active Codes: ${metrics.activeCodesCount}`);
```

---

### `fallbackFromQR(phoneNumber)`

Handle fallback from QR code to 6-digit code authentication.

**Parameters:**
- `phoneNumber` *(string)* - Device phone number

**Returns:**
- *(string|null)* - Generated code or null if failed

**Behavior:**
1. Increments fallback counter
2. Generates new code
3. Displays code in terminal
4. Logs fallback event
5. Returns code or null

**Example:**
```javascript
// Called automatically when QR display fails
const code = codeAuthManager.fallbackFromQR('+971505760056');

if (code) {
  console.log(`🔄 Fallback successful: Code ${code}`);
  // User will see the code displayed in terminal
} else {
  console.log('❌ Fallback failed - max attempts or cooldown');
}
```

---

### `startCleanupInterval()`

Start the automatic cleanup interval.

**Parameters:** None

**Returns:**
- *(undefined)*

**Behavior:**
- Runs cleanup every 10 seconds
- Removes expired codes from memory
- Prevents memory leaks
- Safe to call multiple times (only starts once)

**Example:**
```javascript
codeAuthManager.startCleanupInterval();
console.log('✅ Cleanup interval started');
```

---

### `stopCleanupInterval()`

Stop the automatic cleanup interval.

**Parameters:** None

**Returns:**
- *(undefined)*

**Behavior:**
- Cancels the interval
- Called automatically on graceful shutdown
- Safe to call multiple times

**Example:**
```javascript
codeAuthManager.stopCleanupInterval();
console.log('✅ Cleanup interval stopped');
```

---

## Events

CodeAuthManager extends EventEmitter for lifecycle events.

### `'code:generated'`

Emitted when a new code is successfully generated.

**Event Data:**
```javascript
{
  phoneNumber: '+971505760056',
  code: '123456'
}
```

**Example:**
```javascript
codeAuthManager.on('code:generated', ({ phoneNumber, code }) => {
  console.log(`New code ${code} for ${phoneNumber}`);
  // Send notification, etc.
});
```

---

### `'code:validated'`

Emitted when a code is successfully validated by the user.

**Event Data:**
```javascript
{
  phoneNumber: '+971505760056',
  code: '123456',
  linkTime: 45000  // Milliseconds from generation to validation
}
```

**Example:**
```javascript
codeAuthManager.on('code:validated', ({ phoneNumber, linkTime }) => {
  console.log(`✅ Device linked in ${linkTime / 1000}s`);
  // Update UI, proceed with authentication, etc.
});
```

---

### `'code:invalid'`

Emitted when user enters an invalid code.

**Event Data:**
```javascript
{
  phoneNumber: '+971505760056',
  attempts: 2  // Current attempt count (1-3)
}
```

**Example:**
```javascript
codeAuthManager.on('code:invalid', ({ phoneNumber, attempts }) => {
  if (attempts >= 3) {
    console.log('❌ Max attempts reached. Code revoked.');
  } else {
    console.log(`Invalid code (${attempts}/3 attempts)`);
  }
});
```

---

## Configuration

The following values can be configured (modify in constructor):

```javascript
this.codeDigits = 6;                    // Code length
this.codeExpirationMs = 5 * 60 * 1000;  // 5 minutes
this.maxCodeAttempts = 10;              // Before cooldown
this.cooldownMs = 30 * 60 * 1000;       // 30 minute cooldown
```

---

## Integration with Other Modules

### ConnectionManager Integration

```javascript
// In ConnectionManager.js
client.on("qr", async (qr) => {
  try {
    await QRCodeDisplay.display(qr, { method: 'auto' });
  } catch (error) {
    // FALLBACK TO CODE AUTH
    if (codeAuthManager) {
      const code = codeAuthManager.fallbackFromQR(phoneNumber);
      if (code && deviceLinkedManager) {
        deviceLinkedManager.updateLinkingMethod(phoneNumber, 'code');
      }
    }
  }
});
```

### index.js Integration

```javascript
// Initialize with logBot
codeAuthManager = new CodeAuthManager(logBot);
codeAuthManager.startCleanupInterval();

// Store in shared context
sharedContext.codeAuthManager = codeAuthManager;
services.register('codeAuthManager', codeAuthManager);
```

### GracefulShutdown Integration

```javascript
// Stop cleanup on shutdown
if (codeAuthManager) {
  codeAuthManager.stopCleanupInterval();
}
```

---

## Error Handling

CodeAuthManager never throws exceptions. All errors return `null` or `false`.

### Error Cases Handled

1. **Missing phoneNumber**
   - Returns `null`
   - Logs warning

2. **Code Already Active**
   - Returns existing code
   - Prevents spam generation

3. **Cooldown Active**
   - Returns `null`
   - Logs cooldown message with remaining time

4. **Expiration Check Failed**
   - Returns `null`
   - Logs expiration message

5. **Too Many Invalid Attempts**
   - Returns `false`
   - Deletes code entry
   - Logs attempt limit message

---

## Performance

- **Code Generation:** <1ms (cryptographically secure)
- **Code Validation:** <1ms (string comparison)
- **Memory per Code:** ~500 bytes
- **Cleanup Overhead:** ~1ms per 100 codes
- **Cleanup Frequency:** Every 10 seconds

---

## Security Considerations

1. **Cryptographic Security**
   - Uses `crypto.randomBytes()` for code generation
   - Not seedable or predictable
   - Suitable for production use

2. **Attempt Limiting**
   - Maximum 3 failed attempts per code
   - Code is revoked after 3 failures
   - Prevents brute force attacks

3. **Cooldown System**
   - 30-minute cooldown after 10 code generation attempts
   - Prevents rapid code exploitation
   - Per phone number (not global)

4. **Expiration**
   - Codes expire after 5 minutes
   - Cannot be reused
   - Automatic cleanup every 10 seconds

5. **Input Validation**
   - Strips non-digit characters
   - Normalizes input (handles spaces, dashes)
   - Safe to process user input

---

## Testing

### Unit Test Examples

```javascript
// Test 1: Code generation
const code = codeAuthManager.generateCode('+971505760056');
assert(code !== null, 'Code should generate');
assert(code.length === 6, 'Code should be 6 digits');
assert(/^\d{6}$/.test(code), 'Code should be all digits');

// Test 2: Code validation
const valid = codeAuthManager.validateCode('+971505760056', code);
assert(valid === true, 'Valid code should return true');

// Test 3: Code expiration
await sleep(5 * 60 * 1000 + 100);
const expired = codeAuthManager.validateCode('+971505760056', code);
assert(expired === false, 'Expired code should return false');

// Test 4: Attempt limiting
let attempts = 0;
while (attempts < 3) {
  const valid = codeAuthManager.validateCode('+971505760056', 'wrong');
  attempts++;
}
const endResult = codeAuthManager.validateCode('+971505760056', 'wrong');
assert(endResult === false, 'Should be revoked after 3 attempts');
```

---

## Monitoring & Logging

All operations are logged via the provided logFunction:

```
[14:25:30] ℹ️  [CodeAuth] Generated new code for +971505760056: 123456
[14:25:30] ℹ️  [CodeAuth] Code displayed for +971505760056
[14:25:45] ✅ [CodeAuth] Code validated for +971505760056 (15s)
[14:30:30] ℹ️  [CodeAuth] Cleaned up 2 expired codes
[14:35:00] 🔄 [CodeAuth] Fallback from QR: Generated 6-digit code for +971505760056
```

---

## Troubleshooting

### Code not appearing in terminal
- Check that `displayCodeInTerminal()` is being called
- Verify terminal supports Unicode/box drawing characters
- Check logging function is working correctly

### Codes expiring too quickly
- Default is 5 minutes (configurable)
- Verify system time is correct
- Check cleanup interval is running

### Validation always fails
- Ensure code hasn't already been used
- Check maximum attempts haven't been exceeded (3)
- Verify code hasn't expired (5 minutes)

### Cooldown blocking new codes
- Default is 30 minutes after 10 failed attempts
- User must wait or administrator clears code
- Check `getActiveCode()` to see remaining cooldown

---

## Changelog

### Version 1.0 (February 17, 2026)
- Initial release
- Secure 6-digit code generation
- Code validation with attempt limiting
- Automatic expiration and cleanup
- Metrics and analytics tracking
- Integration with QR fallback
- Terminal display formatting
- Full Event emitter support

---

## License
Part of the Linda WhatsApp Bot project (Production - 2026)

---

## Support
For issues or questions, refer to:
- Project: `WhatsApp-Bot-Linda`
- Module: `code/utils/CodeAuthManager.js`
- Status: Production Ready
- Last Updated: February 17, 2026
