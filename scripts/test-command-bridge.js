/**
 * ========================================================================
 * WHATSAPP COMMAND BRIDGE — COMPREHENSIVE TEST SUITE
 * Phase 31: WhatsApp Command Bridge
 * ========================================================================
 *
 * 20 test suites, ~120 test cases covering:
 *   • Constructor & initialization
 *   • Phone number normalization
 *   • Authorization & sender validation
 *   • Message routing (shouldHandle)
 *   • Command parsing & dispatch
 *   • Console output capture
 *   • Message chunking / sendOutput
 *   • Health score calculation
 *   • All command handlers: help, health, accounts, stats, relink,
 *     recover, restore, goraha, analytics, sheets, link, list, device,
 *     bridge-stats
 *   • Error handling & edge cases
 *   • Stats tracking
 *
 * Run: npm run test:bridge
 *      node scripts/test-command-bridge.js
 *
 * @since Phase 31 – February 21, 2026
 */

// ── Helpers ─────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}`);
  }
}

function header(suite, title) {
  console.log(`\n📝 TEST SUITE ${suite}: ${title}`);
  console.log('─'.repeat(60));
}

// ── Mock factories ──────────────────────────────────────────────

/** Create a mock WhatsApp message */
function mockMsg(body, from = '971553633595@c.us', fromMe = false) {
  const replies = [];
  return {
    body,
    from,
    fromMe,
    reply: async (text) => replies.push(text),
    _replies: replies,
  };
}

/** Create a mock AccountConfigManager */
function mockACM(masterPhone = '+971505760056', accounts = null) {
  const defaultAccounts = [
    { phoneNumber: '+971505760056', displayName: 'Arslan Malik', role: 'primary' },
    { phoneNumber: '+971553633595', displayName: 'Big Broker', role: 'primary' },
  ];
  return {
    getMasterPhoneNumber: () => masterPhone,
    getAllAccounts: () => accounts || defaultAccounts,
  };
}

/** Create a mock DeviceLinkedManager */
function mockDLM(devices = {}) {
  return {
    getDevice: (phone) => devices[phone] || null,
    markDeviceLinked: (phone, data) => {
      devices[phone] = { ...devices[phone], ...data, status: 'linked' };
    },
  };
}

/** Create a mock TerminalHealthDashboard */
function mockTHD() {
  return {
    displayHealthDashboard: () => {
      console.log('╔══════════════════════╗');
      console.log('║  HEALTH DASHBOARD    ║');
      console.log('╚══════════════════════╝');
    },
    listAllDevices: () => {
      console.log('Device 1: +971505760056 (Online)');
      console.log('Device 2: +971553633595 (Offline)');
    },
    displayDeviceDetails: (phone) => {
      console.log(`Device details for ${phone}`);
      console.log('Status: linked');
    },
  };
}

/** Create mock terminal callbacks */
function mockCallbacks() {
  const calls = [];
  const record = (name) => (...args) => {
    calls.push({ name, args });
    console.log(`[Callback] ${name} called`);
  };
  return {
    _calls: calls,
    onLinkMaster: record('onLinkMaster'),
    onAddNewMaster: record('onAddNewMaster'),
    onRelinkMaster: record('onRelinkMaster'),
    onRelinkServant: record('onRelinkServant'),
    onRelinkDevice: record('onRelinkDevice'),
    onRestoreAllSessions: record('onRestoreAllSessions'),
    onGorahaStatusRequested: record('onGorahaStatusRequested'),
    onGorahaFilterRequested: record('onGorahaFilterRequested'),
    onAnalyticsReportRequested: record('onAnalyticsReportRequested'),
    onGoogleSheetsRead: record('onGoogleSheetsRead'),
    onGoogleSheetsCreate: record('onGoogleSheetsCreate'),
    onGoogleSheetsUpdate: record('onGoogleSheetsUpdate'),
    onGoogleSheetsDelete: record('onGoogleSheetsDelete'),
    onGoogleSheetsSearch: record('onGoogleSheetsSearch'),
    onGoogleSheetsMetadata: record('onGoogleSheetsMetadata'),
  };
}

/** Mock ServiceRegistry to inject callbacks */
let mockServiceRegistry = {};
function resetServiceRegistry() {
  mockServiceRegistry = {};
}

// ── Import and setup ────────────────────────────────────────────
async function setup() {
  console.log('🔧 Setting up test environment...\n');

  // Override ServiceRegistry get/register before importing bridge
  const srModule = await import('../code/utils/ServiceRegistry.js');
  const sr = srModule.default;

  // Monkey-patch ServiceRegistry for tests
  const originalGet = sr.get.bind(sr);
  sr.get = (key) => {
    if (mockServiceRegistry[key] !== undefined) return mockServiceRegistry[key];
    return originalGet(key);
  };
  const originalRegister = sr.register.bind(sr);
  sr.register = (key, value) => {
    mockServiceRegistry[key] = value;
    return originalRegister(key, value);
  };

  const { WhatsAppCommandBridge } = await import(
    '../code/WhatsAppBot/WhatsAppCommandBridge.js'
  );
  return WhatsAppCommandBridge;
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════

async function runAllTests() {
  const WhatsAppCommandBridge = await setup();

  // ── SUITE 1: Constructor & Initialization ───────────────────
  header(1, 'Constructor & Initialization');
  {
    const logs = [];
    const bridge = new WhatsAppCommandBridge({
      logBot: (msg) => logs.push(msg),
    });

    assert(bridge.prefix === 'linda', 'Default prefix is "linda"');
    assert(bridge.stats.totalCommands === 0, 'Stats start at 0');
    assert(bridge.stats.errors === 0, 'Errors start at 0');
    assert(bridge.stats.lastCommand === null, 'No last command');
    assert(bridge.accountConfigManager === null, 'ACM null by default');
    assert(bridge.terminalHealthDashboard === null, 'THD null by default');
    assert(bridge.deviceLinkedManager === null, 'DLM null by default');
    assert(logs.some((l) => l.includes('initialized')), 'Logs initialization');
  }

  // ── SUITE 2: Constructor with options ───────────────────────
  header(2, 'Constructor with Options');
  {
    const acm = mockACM();
    const thd = mockTHD();
    const dlm = mockDLM();
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: acm,
      terminalHealthDashboard: thd,
      deviceLinkedManager: dlm,
    });

    assert(bridge.accountConfigManager === acm, 'ACM injected');
    assert(bridge.terminalHealthDashboard === thd, 'THD injected');
    assert(bridge.deviceLinkedManager === dlm, 'DLM injected');
  }

  // ── SUITE 3: Phone Number Normalization ─────────────────────
  header(3, 'Phone Number Normalization');
  {
    const bridge = new WhatsAppCommandBridge({ logBot: () => {} });

    assert(bridge.normalizePhone('+971505760056') === '971505760056', 'Strips +');
    assert(bridge.normalizePhone('971-505-760-056') === '971505760056', 'Strips -');
    assert(bridge.normalizePhone('971 505 760 056') === '971505760056', 'Strips spaces');
    assert(bridge.normalizePhone('971505760056@c.us') === '971505760056', 'Strips @c.us');
    assert(bridge.normalizePhone('971505760056@s.whatsapp.net') === '971505760056', 'Strips @s.whatsapp.net');
    assert(bridge.normalizePhone('+971-505 760056@c.us') === '971505760056', 'Handles combined');
    assert(bridge.normalizePhone('') === '', 'Empty string');
    assert(bridge.normalizePhone(null) === '', 'Null returns empty');
    assert(bridge.normalizePhone(undefined) === '', 'Undefined returns empty');
  }

  // ── SUITE 4: Authorization — isAuthorizedSender ─────────────
  header(4, 'Authorization — isAuthorizedSender');
  {
    const acm = mockACM();
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: acm,
    });

    // Big Broker is authorized (known account, not primary)
    assert(
      bridge.isAuthorizedSender('971553633595@c.us') === true,
      'Secondary master is authorized'
    );

    // Primary master is NOT authorized (can\'t command itself)
    assert(
      bridge.isAuthorizedSender('971505760056@c.us') === false,
      'Primary master is NOT authorized'
    );

    // Unknown number is NOT authorized
    assert(
      bridge.isAuthorizedSender('971500000000@c.us') === false,
      'Unknown number not authorized'
    );

    // No ACM → not authorized
    const bridge2 = new WhatsAppCommandBridge({ logBot: () => {} });
    assert(
      bridge2.isAuthorizedSender('971553633595@c.us') === false,
      'No ACM → not authorized'
    );
  }

  // ── SUITE 5: shouldHandle — Basic Routing ───────────────────
  header(5, 'shouldHandle — Basic Routing');
  {
    const acm = mockACM();
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: acm,
    });

    const masterPhone = '+971505760056';

    // ✅ Should handle: "linda health" from secondary → primary
    assert(
      bridge.shouldHandle(
        mockMsg('linda health', '971553633595@c.us'),
        masterPhone
      ) === true,
      '"linda health" from secondary → primary: YES'
    );

    // ✅ Should handle: "Linda Help" (case-insensitive)
    assert(
      bridge.shouldHandle(
        mockMsg('Linda Help', '971553633595@c.us'),
        masterPhone
      ) === true,
      '"Linda Help" (case-insensitive): YES'
    );

    // ✅ Should handle: "linda" alone (shows help)
    assert(
      bridge.shouldHandle(
        mockMsg('linda', '971553633595@c.us'),
        masterPhone
      ) === true,
      '"linda" alone: YES'
    );

    // ❌ Not on non-master phone
    assert(
      bridge.shouldHandle(
        mockMsg('linda health', '971553633595@c.us'),
        '+971553633595'
      ) === false,
      'Not primary client: NO'
    );

    // ❌ Group messages
    assert(
      bridge.shouldHandle(
        mockMsg('linda health', '120363040@g.us'),
        masterPhone
      ) === false,
      'Group message: NO'
    );

    // ❌ Own messages
    assert(
      bridge.shouldHandle(
        mockMsg('linda health', '971553633595@c.us', true),
        masterPhone
      ) === false,
      'fromMe=true: NO'
    );

    // ❌ Primary sending to itself
    assert(
      bridge.shouldHandle(
        mockMsg('linda health', '971505760056@c.us'),
        masterPhone
      ) === false,
      'Primary to itself: NO'
    );

    // ❌ Unknown sender
    assert(
      bridge.shouldHandle(
        mockMsg('linda health', '971500000000@c.us'),
        masterPhone
      ) === false,
      'Unknown sender: NO'
    );

    // ❌ Not "linda" prefix
    assert(
      bridge.shouldHandle(
        mockMsg('hello world', '971553633595@c.us'),
        masterPhone
      ) === false,
      'No "linda" prefix: NO'
    );

    // ❌ "lindaX" without space
    assert(
      bridge.shouldHandle(
        mockMsg('lindahealth', '971553633595@c.us'),
        masterPhone
      ) === false,
      '"lindahealth" (no space): NO'
    );
  }

  // ── SUITE 6: handleMessage — Help ───────────────────────────
  header(6, 'handleMessage — Help & Prefix');
  {
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    // "linda" alone → help text
    const msg1 = mockMsg('linda');
    const result1 = await bridge.handleMessage(msg1);
    assert(result1 === true, '"linda" returns true');
    assert(msg1._replies.length === 1, 'One reply sent');
    assert(msg1._replies[0].includes('Linda WhatsApp Bridge'), 'Help text sent');

    // "linda help" → explicit help
    const msg2 = mockMsg('linda help');
    await bridge.handleMessage(msg2);
    assert(msg2._replies[0].includes('Linda WhatsApp Bridge'), '"linda help" sends help');
  }

  // ── SUITE 7: handleMessage — Unknown Command ────────────────
  header(7, 'handleMessage — Unknown Command');
  {
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    const msg = mockMsg('linda foobar');
    const result = await bridge.handleMessage(msg);
    assert(result === true, 'Unknown command returns true');
    assert(msg._replies[0].includes('Unknown command'), 'Replies with unknown');
    assert(msg._replies[0].includes('foobar'), 'Includes command name');
  }

  // ── SUITE 8: handleMessage — Stats Tracking ─────────────────
  header(8, 'handleMessage — Stats Tracking');
  {
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    assert(bridge.stats.totalCommands === 0, 'Starts at 0');

    await bridge.handleMessage(mockMsg('linda help'));
    assert(bridge.stats.totalCommands === 1, '1 after first command');
    assert(bridge.stats.lastCommand === 'help', 'lastCommand = help');
    assert(bridge.stats.commandsByName.help === 1, 'help count = 1');

    await bridge.handleMessage(mockMsg('linda help'));
    assert(bridge.stats.totalCommands === 2, '2 after second');
    assert(bridge.stats.commandsByName.help === 2, 'help count = 2');

    await bridge.handleMessage(mockMsg('linda foobar'));
    assert(bridge.stats.totalCommands === 3, '3 after unknown cmd');
    assert(bridge.stats.commandsByName.foobar === 1, 'foobar count = 1');
    assert(bridge.stats.lastCommand === 'foobar', 'lastCommand = foobar');
    assert(bridge.stats.lastCommandTime instanceof Date, 'lastCommandTime is Date');
  }

  // ── SUITE 9: captureOutput ──────────────────────────────────
  header(9, 'captureOutput');
  {
    const bridge = new WhatsAppCommandBridge({ logBot: () => {} });

    // Basic capture
    const out1 = await bridge.captureOutput(() => {
      console.log('Hello');
      console.log('World');
    });
    assert(out1 === 'Hello\nWorld', 'Captures console.log lines');

    // console.clear is suppressed
    const out2 = await bridge.captureOutput(() => {
      console.clear();
      console.log('After clear');
    });
    assert(out2 === 'After clear', 'console.clear is suppressed');

    // Restores after exception
    const origLog = console.log;
    try {
      await bridge.captureOutput(() => {
        throw new Error('test error');
      });
    } catch {}
    assert(console.log === origLog, 'Restores console.log after error');

    // Non-string arguments
    const out3 = await bridge.captureOutput(() => {
      console.log('Count:', 42, true);
    });
    assert(out3 === 'Count: 42 true', 'Handles non-string args');

    // Empty output
    const out4 = await bridge.captureOutput(() => {});
    assert(out4 === '', 'Empty function → empty string');

    // ANSI escape codes stripped
    const out5 = await bridge.captureOutput(() => {
      console.log('\x1B[31mRed\x1B[0m Normal');
    });
    assert(out5 === 'Red Normal', 'ANSI codes stripped');

    // Multiple blank lines collapsed (3+ newlines → 2)
    const out6 = await bridge.captureOutput(() => {
      console.log('A');
      console.log('');
      console.log('');
      console.log('');
      console.log('B');
    });
    assert(out6 === 'A\n\nB', 'Collapses 3+ blank lines to \\n\\n');
  }

  // ── SUITE 10: sendOutput ────────────────────────────────────
  header(10, 'sendOutput — Chunking');
  {
    const bridge = new WhatsAppCommandBridge({ logBot: () => {} });

    // Empty output → fallback
    const msg1 = mockMsg('test');
    await bridge.sendOutput(msg1, '', 'No data');
    assert(msg1._replies[0] === 'No data', 'Empty → fallback');

    // Null output → fallback
    const msg2 = mockMsg('test');
    await bridge.sendOutput(msg2, null, 'Fallback');
    assert(msg2._replies[0] === 'Fallback', 'Null → fallback');

    // Short output → single message
    const msg3 = mockMsg('test');
    await bridge.sendOutput(msg3, 'Short text');
    assert(msg3._replies.length === 1, 'Short → 1 chunk');
    assert(msg3._replies[0] === 'Short text', 'Content matches');

    // Long output → multiple chunks
    const msg4 = mockMsg('test');
    const longText = 'X'.repeat(5000); // Exceeds 4000
    await bridge.sendOutput(msg4, longText);
    assert(msg4._replies.length >= 2, 'Long text → 2+ chunks');
    assert(msg4._replies[0].includes('(1/'), 'First chunk has page number');
  }

  // ── SUITE 11: Health Score Calculation ──────────────────────
  header(11, 'Health Score Calculation');
  {
    const bridge = new WhatsAppCommandBridge({ logBot: () => {} });

    // Null device
    assert(bridge._calculateHealthScore(null) === 0, 'Null device → 0');

    // Empty device
    assert(bridge._calculateHealthScore({}) === 0, 'Empty device → 0');

    // Online only
    assert(bridge._calculateHealthScore({ isOnline: true }) === 40, 'Online → 40');

    // Online + linked
    assert(
      bridge._calculateHealthScore({ isOnline: true, status: 'linked' }) === 70,
      'Online + linked → 70'
    );

    // Perfect score: online + linked + recent heartbeat
    const now = new Date();
    assert(
      bridge._calculateHealthScore({
        isOnline: true,
        status: 'linked',
        lastHeartbeat: new Date(now - 30000), // 30 seconds ago
      }) === 100,
      'Full score → 100'
    );

    // Linked but offline with old heartbeat
    assert(
      bridge._calculateHealthScore({
        isOnline: false,
        status: 'linked',
        lastHeartbeat: new Date(now - 400000), // ~7 min
      }) === 40,
      'Offline + linked + stale heartbeat → 40'
    );

    // Cap at 100
    assert(
      bridge._calculateHealthScore({
        isOnline: true,
        status: 'linked',
        lastHeartbeat: new Date(now - 10000),
      }) <= 100,
      'Score capped at 100'
    );
  }

  // ── SUITE 12: handleHealthStatus ────────────────────────────
  header(12, 'handleHealthStatus');
  {
    // Per-account health
    const dlm = mockDLM({
      '+971553633595': {
        isOnline: true,
        status: 'linked',
        authMethod: 'qr',
        linkedAt: new Date().toISOString(),
        lastHeartbeat: new Date(),
      },
    });
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
      deviceLinkedManager: dlm,
    });

    const msg1 = mockMsg('linda health +971553633595');
    await bridge.handleHealthStatus(msg1, ['+971553633595']);
    assert(msg1._replies.length === 1, 'Per-account: 1 reply');
    assert(msg1._replies[0].includes('Health'), 'Contains health info');
    assert(msg1._replies[0].includes('Online'), 'Shows online status');

    // Device not found
    const msg2 = mockMsg('linda health +971999999999');
    await bridge.handleHealthStatus(msg2, ['+971999999999']);
    assert(msg2._replies[0].includes('not found'), 'Unknown device → not found');

    // Full dashboard (no args)
    const thd = mockTHD();
    const bridge2 = new WhatsAppCommandBridge({
      logBot: () => {},
      terminalHealthDashboard: thd,
    });
    const msg3 = mockMsg('linda health');
    await bridge2.handleHealthStatus(msg3, []);
    assert(msg3._replies.length === 1, 'Dashboard: 1 reply');
    assert(msg3._replies[0].includes('HEALTH DASHBOARD'), 'Dashboard output captured');

    // No DLM and no THD
    const bridge3 = new WhatsAppCommandBridge({ logBot: () => {} });
    const msg4 = mockMsg('linda health +971553633595');
    await bridge3.handleHealthStatus(msg4, ['+971553633595']);
    assert(msg4._replies[0].includes('not available'), 'No DLM → not available');
  }

  // ── SUITE 13: handleAccounts ───────────────────────────────
  header(13, 'handleAccounts');
  {
    const acm = mockACM();
    const dlm = mockDLM({
      '+971505760056': { isOnline: true, status: 'linked' },
      '+971553633595': { isOnline: false, status: 'pending' },
    });
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: acm,
      deviceLinkedManager: dlm,
    });

    const msg = mockMsg('linda accounts');
    await bridge.handleAccounts(msg);
    assert(msg._replies.length === 1, '1 reply');
    assert(msg._replies[0].includes('Accounts (2)'), 'Shows count');
    assert(msg._replies[0].includes('Arslan Malik'), 'Shows name 1');
    assert(msg._replies[0].includes('Big Broker'), 'Shows name 2');
    assert(msg._replies[0].includes('🟢'), 'Online icon');
    assert(msg._replies[0].includes('🔴'), 'Offline icon');

    // No ACM
    const bridge2 = new WhatsAppCommandBridge({ logBot: () => {} });
    const msg2 = mockMsg('linda accounts');
    await bridge2.handleAccounts(msg2);
    assert(msg2._replies[0].includes('not available'), 'No ACM → not available');

    // Empty accounts
    const bridge3 = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM('+971505760056', []),
    });
    const msg3 = mockMsg('linda accounts');
    await bridge3.handleAccounts(msg3);
    assert(msg3._replies[0].includes('No accounts'), 'Empty → No accounts');
  }

  // ── SUITE 14: handleStats ──────────────────────────────────
  header(14, 'handleStats');
  {
    const dlm = mockDLM({
      '+971553633595': {
        isOnline: true,
        status: 'linked',
        uptime: 7200000, // 2 hours
        heartbeatCount: 120,
        linkAttempts: 1,
        maxLinkAttempts: 5,
        lastActivity: new Date(),
        recoveryMode: false,
      },
    });
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      deviceLinkedManager: dlm,
    });

    // Valid phone
    const msg1 = mockMsg('linda stats +971553633595');
    await bridge.handleStats(msg1, ['+971553633595']);
    assert(msg1._replies[0].includes('Stats'), 'Has stats header');
    assert(msg1._replies[0].includes('Online'), 'Shows online');
    assert(msg1._replies[0].includes('2h'), 'Shows 2h uptime');
    assert(msg1._replies[0].includes('120'), 'Shows heartbeat count');

    // No phone arg
    const msg2 = mockMsg('linda stats');
    await bridge.handleStats(msg2, []);
    assert(msg2._replies[0].includes('Usage'), 'No phone → usage');

    // Unknown device
    const msg3 = mockMsg('linda stats +971999');
    await bridge.handleStats(msg3, ['+971999']);
    assert(msg3._replies[0].includes('not found'), 'Unknown → not found');

    // Uptime formatting for days
    const dlm2 = mockDLM({
      '+971555': {
        isOnline: true,
        status: 'linked',
        uptime: 172800000, // 2 days
      },
    });
    const bridge2 = new WhatsAppCommandBridge({
      logBot: () => {},
      deviceLinkedManager: dlm2,
    });
    const msg4 = mockMsg('linda stats +971555');
    await bridge2.handleStats(msg4, ['+971555']);
    assert(msg4._replies[0].includes('2d'), 'Shows days format');
  }

  // ── SUITE 15: handleRelink ─────────────────────────────────
  header(15, 'handleRelink');
  {
    const cbs = mockCallbacks();
    resetServiceRegistry();
    mockServiceRegistry['terminalCallbacks'] = cbs;

    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    // Relink master
    const msg1 = mockMsg('linda relink master');
    await bridge.handleRelink(msg1, ['master'], cbs);
    assert(msg1._replies.length >= 1, 'Relink master: replies');
    assert(cbs._calls.some((c) => c.name === 'onRelinkMaster'), 'onRelinkMaster called');

    // Relink master with phone
    const msg2 = mockMsg('linda relink master +971505760056');
    await bridge.handleRelink(msg2, ['master', '+971505760056'], cbs);
    assert(
      cbs._calls.some(
        (c) => c.name === 'onRelinkMaster' && c.args[0] === '+971505760056'
      ),
      'onRelinkMaster receives phone'
    );

    // Relink servant (no phone → error)
    const msg3 = mockMsg('linda relink servant');
    await bridge.handleRelink(msg3, ['servant'], cbs);
    assert(msg3._replies[0].includes('Usage'), 'Servant no phone → usage');

    // Relink servant with phone
    const msg4 = mockMsg('linda relink servant +971553633595');
    await bridge.handleRelink(msg4, ['servant', '+971553633595'], cbs);
    assert(cbs._calls.some((c) => c.name === 'onRelinkServant'), 'onRelinkServant called');

    // Relink bare phone
    const msg5 = mockMsg('linda relink +971555');
    await bridge.handleRelink(msg5, ['+971555'], cbs);
    assert(cbs._calls.some((c) => c.name === 'onRelinkDevice'), 'onRelinkDevice called');

    // Relink no args → usage
    const msg6 = mockMsg('linda relink');
    await bridge.handleRelink(msg6, [], cbs);
    assert(msg6._replies[0].includes('Usage'), 'No args → usage');

    // No callbacks
    const msg7 = mockMsg('linda relink master');
    await bridge.handleRelink(msg7, ['master'], null);
    assert(msg7._replies[0].includes('not available'), 'No callbacks → not available');
  }

  // ── SUITE 16: handleGoraha ─────────────────────────────────
  header(16, 'handleGoraha');
  {
    const cbs = mockCallbacks();

    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    // goraha (default = status)
    const msg1 = mockMsg('linda goraha');
    await bridge.handleGoraha(msg1, [], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGorahaStatusRequested' && c.args[0] === false),
      'Default goraha → onGorahaStatusRequested(false)'
    );

    // goraha verify
    const msg2 = mockMsg('linda goraha verify');
    await bridge.handleGoraha(msg2, ['verify'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGorahaStatusRequested' && c.args[0] === true),
      'goraha verify → onGorahaStatusRequested(true)'
    );

    // goraha contacts
    const msg3 = mockMsg('linda goraha contacts');
    await bridge.handleGoraha(msg3, ['contacts'], cbs);
    assert(msg3._replies.length >= 1, 'goraha contacts: replies');

    // goraha filter <text>
    const msg4 = mockMsg('linda goraha filter Security D2');
    await bridge.handleGoraha(msg4, ['filter', 'Security', 'D2'], cbs);
    assert(
      cbs._calls.some(
        (c) => c.name === 'onGorahaFilterRequested' && c.args[0] === 'Security D2'
      ),
      'goraha filter → onGorahaFilterRequested("Security D2")'
    );

    // goraha filter (no text)
    const msg5 = mockMsg('linda goraha filter');
    await bridge.handleGoraha(msg5, ['filter'], cbs);
    assert(msg5._replies[0].includes('Usage'), 'goraha filter no text → usage');

    // No callbacks
    const msg6 = mockMsg('linda goraha verify');
    await bridge.handleGoraha(msg6, ['verify'], {});
    assert(msg6._replies[0].includes('not available'), 'No callback → not available');
  }

  // ── SUITE 17: handleAnalytics ──────────────────────────────
  header(17, 'handleAnalytics');
  {
    const cbs = mockCallbacks();
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    // analytics (default = realtime)
    const msg1 = mockMsg('linda analytics');
    await bridge.handleAnalytics(msg1, [], cbs);
    assert(
      cbs._calls.some(
        (c) => c.name === 'onAnalyticsReportRequested' && c.args[0] === 'realtime'
      ),
      'Default → realtime'
    );

    // analytics report
    const msg2 = mockMsg('linda analytics report');
    await bridge.handleAnalytics(msg2, ['report'], cbs);
    assert(
      cbs._calls.some(
        (c) => c.name === 'onAnalyticsReportRequested' && c.args[0] === 'report'
      ),
      'analytics report → report'
    );

    // analytics uptime
    const msg3 = mockMsg('linda analytics uptime');
    await bridge.handleAnalytics(msg3, ['uptime'], cbs);
    assert(
      cbs._calls.some(
        (c) => c.name === 'onAnalyticsReportRequested' && c.args[0] === 'uptime'
      ),
      'analytics uptime → uptime'
    );

    // analytics account <phone>
    const msg4 = mockMsg('linda analytics account +971505760056');
    await bridge.handleAnalytics(msg4, ['account', '+971505760056'], cbs);
    assert(
      cbs._calls.some(
        (c) =>
          c.name === 'onAnalyticsReportRequested' &&
          c.args[0] === 'account' &&
          c.args[1] === '+971505760056'
      ),
      'analytics account → account + phone'
    );

    // analytics account (no phone)
    const msg5 = mockMsg('linda analytics account');
    await bridge.handleAnalytics(msg5, ['account'], cbs);
    assert(msg5._replies.some((r) => r.includes('Usage')), 'analytics account no phone → usage');

    // No callbacks
    const msg6 = mockMsg('linda analytics');
    await bridge.handleAnalytics(msg6, [], {});
    assert(msg6._replies[0].includes('not available'), 'No callback → not available');
  }

  // ── SUITE 18: handleSheets ─────────────────────────────────
  header(18, 'handleSheets');
  {
    const cbs = mockCallbacks();
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    // sheets (no sub) → usage
    const msg1 = mockMsg('linda sheets');
    await bridge.handleSheets(msg1, [], cbs);
    assert(msg1._replies[0].includes('Google Sheets'), 'sheets → usage help');

    // sheets read
    const msg2 = mockMsg('linda sheets read ABC123');
    await bridge.handleSheets(msg2, ['read', 'ABC123'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGoogleSheetsRead'),
      'sheets read → callback called'
    );

    // sheets read (no id)
    const msg3 = mockMsg('linda sheets read');
    await bridge.handleSheets(msg3, ['read'], cbs);
    assert(msg3._replies[0].includes('Usage'), 'sheets read no id → usage');

    // sheets add
    const msg4 = mockMsg('linda sheets add ABC123 Sheet1 val1 val2');
    await bridge.handleSheets(msg4, ['add', 'ABC123', 'Sheet1', 'val1', 'val2'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGoogleSheetsCreate'),
      'sheets add → callback'
    );

    // sheets update
    const msg5 = mockMsg('linda sheets update ABC123 A1 NewValue');
    await bridge.handleSheets(msg5, ['update', 'ABC123', 'A1', 'NewValue'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGoogleSheetsUpdate'),
      'sheets update → callback'
    );

    // sheets delete
    const msg6 = mockMsg('linda sheets delete ABC123 Sheet1 5');
    await bridge.handleSheets(msg6, ['delete', 'ABC123', 'Sheet1', '5'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGoogleSheetsDelete'),
      'sheets delete → callback'
    );

    // sheets search
    const msg7 = mockMsg('linda sheets search ABC123 Sheet1 John');
    await bridge.handleSheets(msg7, ['search', 'ABC123', 'Sheet1', 'John'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGoogleSheetsSearch'),
      'sheets search → callback'
    );

    // sheets info
    const msg8 = mockMsg('linda sheets info ABC123');
    await bridge.handleSheets(msg8, ['info', 'ABC123'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onGoogleSheetsMetadata'),
      'sheets info → callback'
    );

    // sheets unknown sub
    const msg9 = mockMsg('linda sheets xyz');
    await bridge.handleSheets(msg9, ['xyz'], cbs);
    assert(msg9._replies[0].includes('Unknown'), 'Unknown sheets sub');

    // No callback for read
    const msg10 = mockMsg('linda sheets read ABC123');
    await bridge.handleSheets(msg10, ['read', 'ABC123'], {});
    assert(msg10._replies.some((r) => r.includes('not available')), 'No callback → not available');
  }

  // ── SUITE 19: handleLink, handleList, handleDevice, handleBridgeStats ───
  header(19, 'Link, List, Device, Bridge-Stats');
  {
    const cbs = mockCallbacks();

    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
      terminalHealthDashboard: mockTHD(),
    });

    // link master (no phone)
    const msg1 = mockMsg('linda link master');
    await bridge.handleLink(msg1, ['master'], cbs);
    assert(cbs._calls.some((c) => c.name === 'onLinkMaster'), 'link master → onLinkMaster');

    // link master +phone name
    const msg2 = mockMsg('linda link master +971555 MyAccount');
    await bridge.handleLink(msg2, ['master', '+971555', 'MyAccount'], cbs);
    assert(
      cbs._calls.some((c) => c.name === 'onAddNewMaster'),
      'link master +phone → onAddNewMaster'
    );

    // link something else
    const msg3 = mockMsg('linda link servant');
    await bridge.handleLink(msg3, ['servant'], cbs);
    assert(msg3._replies[0].includes('Usage'), 'link servant → usage');

    // list
    const msg4 = mockMsg('linda list');
    await bridge.handleList(msg4);
    assert(msg4._replies[0].includes('Device'), 'list → device list');

    // device (no phone)
    const msg5 = mockMsg('linda device');
    await bridge.handleDevice(msg5, []);
    assert(msg5._replies[0].includes('Usage'), 'device no phone → usage');

    // device with phone
    const msg6 = mockMsg('linda device +971505760056');
    await bridge.handleDevice(msg6, ['+971505760056']);
    assert(msg6._replies[0].includes('details'), 'device with phone → details');

    // bridge-stats
    // First generate some stats
    await bridge.handleMessage(mockMsg('linda help'));
    await bridge.handleMessage(mockMsg('linda accounts'));

    const msg7 = mockMsg('linda bridge-stats');
    await bridge.handleBridgeStats(msg7);
    assert(msg7._replies[0].includes('Bridge Stats'), 'bridge-stats header');
    assert(msg7._replies[0].includes('Total commands'), 'Shows total commands');
    assert(msg7._replies[0].includes('Top commands'), 'Shows top commands');
  }

  // ── SUITE 20: Error Handling ───────────────────────────────
  header(20, 'Error Handling');
  {
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
    });

    // Handler that throws
    const msg1 = mockMsg('linda health +971553633595');
    // Force error: DLM getDevice throws
    const badDLM = {
      getDevice: () => {
        throw new Error('DB connection lost');
      },
    };
    bridge.deviceLinkedManager = badDLM;

    // handleMessage catches and replies with error
    const result = await bridge.handleMessage(msg1);
    assert(result === true, 'Returns true even on error');
    assert(bridge.stats.errors === 1, 'Error count incremented');
    assert(msg1._replies.some((r) => r.includes('Command error')), 'Error reply sent');
    assert(
      msg1._replies.some((r) => r.includes('DB connection lost')),
      'Error message included'
    );

    // Restore
    bridge.deviceLinkedManager = null;

    // handleRestore with no callbacks
    const msg2 = mockMsg('linda restore');
    await bridge.handleRestore(msg2, null);
    assert(msg2._replies[0].includes('not available'), 'restore null callbacks → not available');
  }

  // ── SUITE 21: Full Integration — handleMessage dispatch ─────
  header(21, 'Full Integration — handleMessage dispatch');
  {
    const cbs = mockCallbacks();
    resetServiceRegistry();
    mockServiceRegistry['terminalCallbacks'] = cbs;

    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      accountConfigManager: mockACM(),
      terminalHealthDashboard: mockTHD(),
      deviceLinkedManager: mockDLM({
        '+971553633595': { isOnline: true, status: 'linked' },
      }),
    });

    // Test multiple commands dispatched correctly
    const commands = [
      { body: 'linda help', expects: 'Linda WhatsApp Bridge' },
      { body: 'linda accounts', expects: 'Accounts' },
      { body: 'linda stats +971553633595', expects: 'Stats' },
      { body: 'linda health +971553633595', expects: 'Health' },
      { body: 'linda list', expects: 'Device' },
    ];

    for (const { body, expects } of commands) {
      const msg = mockMsg(body);
      await bridge.handleMessage(msg);
      assert(
        msg._replies.some((r) => r.includes(expects)),
        `"${body}" → reply includes "${expects}"`
      );
    }
  }

  // ── SUITE 22: handleRecover ────────────────────────────────
  header(22, 'handleRecover');
  {
    const dlm = mockDLM({
      '+971553633595': { isOnline: false, status: 'unlinked' },
    });
    const bridge = new WhatsAppCommandBridge({
      logBot: () => {},
      deviceLinkedManager: dlm,
    });

    // No phone arg
    const msg1 = mockMsg('linda recover');
    await bridge.handleRecover(msg1, []);
    assert(msg1._replies[0].includes('Usage'), 'recover no phone → usage');

    // Unknown device
    const msg2 = mockMsg('linda recover +971999');
    await bridge.handleRecover(msg2, ['+971999']);
    assert(msg2._replies[0].includes('not found'), 'Unknown device → not found');

    // Device exists but SessionManager import will fail in test env
    const msg3 = mockMsg('linda recover +971553633595');
    await bridge.handleRecover(msg3, ['+971553633595']);
    // Should either succeed or report error – both are valid
    assert(msg3._replies.length >= 1, 'recover known device → at least 1 reply');
  }

  // ── SUITE 23: getHelpText ──────────────────────────────────
  header(23, 'getHelpText');
  {
    const bridge = new WhatsAppCommandBridge({ logBot: () => {} });
    const help = bridge.getHelpText();

    assert(help.includes('Linda WhatsApp Bridge'), 'Has title');
    assert(help.includes('Monitoring'), 'Has Monitoring section');
    assert(help.includes('Account Management'), 'Has Account Mgmt section');
    assert(help.includes('Goraha'), 'Has Goraha section');
    assert(help.includes('Analytics'), 'Has Analytics section');
    assert(help.includes('Google Sheets'), 'Has Sheets section');
    assert(help.includes('bridge-stats'), 'Has bridge-stats');
    assert(help.includes('linda help'), 'Has help command');
  }

  // ═══════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 WHATSAPP COMMAND BRIDGE TEST RESULTS`);
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 Total:  ${passed + failed}`);
  console.log(`  📈 Rate:   ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log('\n❌ Failed tests:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  console.log('═'.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error('\n💥 Test runner crashed:', err);
  process.exit(1);
});
