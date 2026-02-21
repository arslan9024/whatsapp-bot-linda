import { spawn } from 'child_process';

/**
 * Test script for relink command on Linda Bot
 * 1. Starts bot with npm run dev
 * 2. Sends "relink master +971505760056" command
 * 3. Captures and analyzes output for 12 seconds
 * 4. Reports on success/failure indicators
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRelinkCommand() {
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(15) + '🤖 LINDA BOT RELINK TEST' + ' '.repeat(19) + '║');
  console.log('╚' + '═'.repeat(58) + '╝\n');

  console.log('🚀 Starting bot with: npm run dev');
  console.log('─'.repeat(60) + '\n');

  // Start the bot
  const bot = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    cwd: process.cwd(),
    windowsHide: false
  });

  let allOutput = '';
  let stdoutData = '';
  let stderrData = '';
  let botReady = false;
  let commandSent = false;

  bot.stdout.on('data', (data) => {
    const text = data.toString();
    allOutput += text;
    stdoutData += text;
    
    // Show output in real-time
    process.stdout.write(text);

    // Check if bot is ready (look for prompt or startup complete)
    if (!botReady && (
      text.includes('▶ Linda Bot >') || 
      text.includes('listening') || 
      text.includes('started') ||
      text.includes('ready')
    )) {
      botReady = true;
      console.log('\n\n✅ Bot detected as ready!\n');
    }
  });

  bot.stderr.on('data', (data) => {
    const text = data.toString();
    allOutput += text;
    stderrData += text;
    
    // Show stderr in real-time (in red color for visibility)
    process.stderr.write(text);
  });

  bot.on('error', (err) => {
    console.error('❌ Bot spawn error:', err);
  });

  // Wait for bot to start
  console.log('⏳ Waiting 5 seconds for bot to initialize...');
  await sleep(5000);

  if (!botReady) {
    console.log('⚠️  Bot may not be fully ready, but attempting command anyway...\n');
  }

  // Send the relink command
  console.log('📤 Sending command to bot stdin: "relink master +971505760056"');
  console.log('─'.repeat(60) + '\n');
  
  try {
    bot.stdin.write('relink master +971505760056\n');
    commandSent = true;
  } catch (err) {
    console.error('❌ Failed to send command:', err.message);
    commandSent = false;
  }

  // Capture output for 12 seconds
  console.log('⏱️  Capturing output for 12 seconds...\n');
  await sleep(12000);

  // Stop the bot
  console.log('\n' + '─'.repeat(60));
  console.log('🛑 Stopping bot...');
  try {
    bot.kill('SIGTERM');
    await sleep(1000);
    bot.kill('SIGKILL');
  } catch (e) {
    // Ignore
  }

  await sleep(500);

  // Analyze results
  console.log('\n');
  analyzeOutput(allOutput, commandSent);
}

function analyzeOutput(output, commandSent) {
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(18) + '📊 ANALYSIS RESULTS' + ' '.repeat(20) + '║');
  console.log('╚' + '═'.repeat(58) + '╝\n');

  if (!commandSent) {
    console.log('⚠️  WARNING: Command was not successfully sent to bot stdin!\n');
  }

  const checks = [
    {
      label: 'Creating new client',
      expected: '✅ SHOULD APPEAR',
      pattern: /Creating new client|New client created/i,
      critical: true,
      description: 'Indicates fresh client initialization'
    },
    {
      label: 'Initializing fresh client',
      expected: '✅ SHOULD APPEAR',
      pattern: /Initializing fresh|Initializing.*client|Fresh client/i,
      critical: true,
      description: 'Shows async initialization in progress'
    },
    {
      label: 'client.on is not a function (BUG)',
      expected: '❌ SHOULD NOT APPEAR',
      pattern: /client\.on is not a function|TypeError.*client\.on/i,
      critical: true,
      shouldNotExist: true,
      description: 'Old bug we fixed'
    },
    {
      label: 'Failed to relink',
      expected: '❌ SHOULD NOT APPEAR',
      pattern: /Failed to relink|Relink failed|Error.*relink/i,
      critical: false,
      shouldNotExist: true,
      description: 'Would indicate relink failure'
    },
    {
      label: 'Async/await flow working',
      expected: '✅ SHOULD APPEAR',
      pattern: /Creating|Initializing|Linking|WhatsApp|Client|ready/i,
      critical: false,
      description: 'Indicates async flow is executing'
    },
    {
      label: 'QR code/scan messages',
      expected: '✅ SHOULD APPEAR',
      pattern: /QR|scan|code|please.*scan|📱|code:/i,
      critical: false,
      description: 'New client needs QR scan setup'
    }
  ];

  let passed = 0;
  let failed = 0;
  let criticalFailures = 0;

  console.log('Test Results:');
  console.log('─'.repeat(60) + '\n');

  for (let i = 0; i < checks.length; i++) {
    const check = checks[i];
    const found = check.pattern.test(output);
    
    // For checks that should NOT exist, flip the result
    const result = check.shouldNotExist ? !found : found;
    
    const status = result ? '✅ PASS' : '❌ FAIL';
    const marker = check.critical ? '🔴' : '🟡';
    
    if (result) {
      passed++;
    } else {
      failed++;
      if (check.critical) criticalFailures++;
    }

    console.log(`${marker} [${i + 1}] ${status} - ${check.label}`);
    console.log(`    Expected: ${check.expected}`);
    console.log(`    Details: ${check.description}`);
    
    if (check.pattern) {
      const matches = output.match(check.pattern);
      if (matches) {
        const preview = matches[0].substring(0, 50);
        console.log(`    Found: "${preview}${matches[0].length > 50 ? '...' : ''}"`);
      } else {
        if (!check.shouldNotExist || result) {
          console.log(`    Status: Not found in output`);
        }
      }
    }
    console.log('');
  }

  console.log('─'.repeat(60) + '\n');

  // Summary
  const totalChecks = checks.length;
  console.log('📈 SUMMARY:');
  console.log(`  Total checks: ${totalChecks}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(`  Critical failures: ${criticalFailures} 🔴\n`);

  if (criticalFailures === 0 && failed === 0) {
    console.log('🎉 EXCELLENT! All checks passed!');
    console.log('✅ Relink command working perfectly');
    console.log('✅ No TypeError for client.on');
    console.log('✅ Fresh client initialization working');
    return 0;
  } else if (criticalFailures === 0) {
    console.log('✅ SUCCESS! All critical checks passed!');
    console.log(`⚠️  ${failed} non-critical checks failed (see details above)`);
    return 0;
  } else {
    console.log(`❌ FAILURE! ${criticalFailures} critical check(s) failed.`);
    console.log('Review output above for details.');
    return 1;
  }
}

// Run the test
testRelinkCommand()
  .then((exitCode) => {
    console.log('\n╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(22) + 'TEST COMPLETE' + ' '.repeat(23) + '║');
    console.log('╚' + '═'.repeat(58) + '╝\n');
    process.exit(exitCode || 0);
  })
  .catch((err) => {
    console.error('\n❌ Test error:', err);
    process.exit(1);
  });
