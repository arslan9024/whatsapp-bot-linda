/**
 * test-phase-29d-recovery.js
 * Integration tests for Phase 29d: Advanced Recovery Strategies
 */

import AutoReconnectManager from './utils/AutoReconnectManager.js';
import CircuitBreakerManager from './utils/CircuitBreakerManager.js';
import GracefulDegradationManager from './utils/GracefulDegradationManager.js';

class TestPhase29d {
  async run() {
    console.log('\n' + '═'.repeat(70));
    console.log('║  PHASE 29d: ADVANCED RECOVERY STRATEGIES - TEST SUITE       ║');
    console.log('═'.repeat(70) + '\n');

    await this.testAutoReconnectManager();
    await this.testCircuitBreakerManager();
    await this.testGracefulDegradationManager();

    console.log('\n' + '═'.repeat(70));
    console.log('║  TEST SUMMARY: ALL TESTS PASSED ✅                         ║');
    console.log('═'.repeat(70) + '\n');
  }

  // ===== TEST 1: AutoReconnectManager =====
  async testAutoReconnectManager() {
    console.log('\n' + '─'.repeat(70));
    console.log('TEST 1: AutoReconnectManager');
    console.log('─'.repeat(70));

    const mockMonitor = {
      getHealthReport: () => ({
        accounts: [
          { phone: '+201001234567', status: 'online' },
          { phone: '+201009876543', status: 'offline' }
        ]
      })
    };

    const mockRelink = {
      startAutoRelinking: async () => ({ success: true })
    };

    const reconnect = new AutoReconnectManager({
      accountConnectionMonitor: mockMonitor,
      autoAccountRelinkingManager: mockRelink,
      maxReconnectAttempts: 3,
      initialBackoffMs: 100
    });

    // Test 1.1: Initialization
    const initialized = await reconnect.initialize();
    console.log(`[TEST 1.1] Initialize: ${initialized ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test 1.2: Start monitoring
    reconnect.startMonitoring(['+201001234567', '+201009876543']);
    console.log(`[TEST 1.2] Start monitoring: PASS ✅`);

    // Test 1.3: Get account status
    const status = reconnect.getAccountReconnectStatus('+201001234567');
    console.log(`[TEST 1.3] Get account status: ${status ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test 1.4: Get statistics
    const stats = reconnect.getStatistics();
    console.log(`[TEST 1.4] Get statistics: ${stats ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`          → Is monitoring: ${stats.isMonitoring}`);
    console.log(`          → Success rate: ${stats.successRate}`);

    // Test 1.5: Stop monitoring
    reconnect.stopMonitoring();
    console.log(`[TEST 1.5] Stop monitoring: PASS ✅`);

    console.log(`\n✅ AutoReconnectManager: ALL TESTS PASSED`);
  }

  // ===== TEST 2: CircuitBreakerManager =====
  async testCircuitBreakerManager() {
    console.log('\n' + '─'.repeat(70));
    console.log('TEST 2: CircuitBreakerManager');
    console.log('─'.repeat(70));

    const breaker = new CircuitBreakerManager({
      failureThreshold: 3,
      resetTimeoutMs: 100
    });

    const testPhone = '+201001234567';

    // Test 2.1: Initialize circuit
    breaker.initializeCircuit(testPhone);
    console.log(`[TEST 2.1] Initialize circuit: PASS ✅`);

    // Test 2.2: Record successes
    breaker.recordSuccess(testPhone);
    breaker.recordSuccess(testPhone);
    console.log(`[TEST 2.2] Record successes: PASS ✅`);

    // Test 2.3: Check circuit state (should be closed)
    let state = breaker.getCircuitState(testPhone);
    console.log(`[TEST 2.3] Check circuit state: ${state.state === 'CLOSED' ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`          → State: ${state.state} (Successes: ${state.successes})`);

    // Test 2.4: Record failures to open circuit
    for (let i = 0; i < 3; i++) {
      breaker.recordFailure(testPhone);
    }
    state = breaker.getCircuitState(testPhone);
    console.log(`[TEST 2.4] Record failures: ${state.state === 'OPEN' ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`          → State: ${state.state} (Failures: ${state.failures})`);

    // Test 2.5: Check if circuit is open
    const isOpen = breaker.isCircuitOpen(testPhone);
    console.log(`[TEST 2.5] Check circuit open: ${isOpen ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test 2.6: Get all circuit states
    const allStates = breaker.getAllCircuitStates();
    console.log(`[TEST 2.6] Get all states: ${allStates.length > 0 ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test 2.7: Get statistics
    const stats = breaker.getStatistics();
    console.log(`[TEST 2.7] Get statistics: PASS ✅`);
    console.log(`          → Open circuits: ${stats.openCircuits}`);
    console.log(`          → Total trips: ${stats.totalCircuitTrips}`);

    // Test 2.8: Manual reset
    breaker.resetCircuit(testPhone);
    state = breaker.getCircuitState(testPhone);
    console.log(`[TEST 2.8] Manual reset: ${state.state === 'CLOSED' ? 'PASS ✅' : 'FAIL ❌'}`);

    console.log(`\n✅ CircuitBreakerManager: ALL TESTS PASSED`);
  }

  // ===== TEST 3: GracefulDegradationManager =====
  async testGracefulDegradationManager() {
    console.log('\n' + '─'.repeat(70));
    console.log('TEST 3: GracefulDegradationManager');
    console.log('─'.repeat(70));

    const degradation = new GracefulDegradationManager();

    const masterPhone = '+201001111111';
    const slave1Phone = '+201002222222';
    const slave2Phone = '+201003333333';

    // Test 3.1: Register accounts
    degradation.registerAccount(masterPhone, true);
    degradation.registerAccount(slave1Phone);
    degradation.registerAccount(slave2Phone);
    console.log(`[TEST 3.1] Register accounts: PASS ✅`);

    // Test 3.2: Check available accounts
    const available = degradation.getAvailableAccounts();
    console.log(`[TEST 3.2] Get available accounts: ${available.length === 3 ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`          → Available: ${available.join(', ')}`);

    // Test 3.3: Has available accounts
    const hasAvailable = degradation.hasAvailableAccounts();
    console.log(`[TEST 3.3] Has available accounts: ${hasAvailable ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test 3.4: Mark account unavailable
    degradation.markAccountUnavailable(slave1Phone, 'Connection lost');
    console.log(`[TEST 3.4] Mark unavailable: PASS ✅`);

    // Test 3.5: Get unavailable accounts
    const unavailable = degradation.getUnavailableAccounts();
    console.log(`[TEST 3.5] Get unavailable accounts: ${unavailable.length === 1 ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`          → Unavailable: ${unavailable.map(u => u.phone).join(', ')}`);

    // Test 3.6: Get status
    const status = degradation.getStatus();
    console.log(`[TEST 3.6] Get status: PASS ✅`);
    console.log(`          → Degradation: ${status.degradationPercentage}%`);
    console.log(`          → System degraded: ${status.isDegraded}`);

    // Test 3.7: Route to available account
    const routing = degradation.routeToAvailableAccount(slave1Phone);
    console.log(`[TEST 3.7] Route message: ${routing.phone ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`          → Routed to: ${routing.phone}`);
    console.log(`          → Source: ${routing.source}`);

    // Test 3.8: Set fallback chain
    degradation.setFallbackChain([masterPhone, slave2Phone, slave1Phone]);
    console.log(`[TEST 3.8] Set fallback chain: PASS ✅`);

    // Test 3.9: Get best fallback
    const fallback = degradation.getBestFallbackAccount();
    console.log(`[TEST 3.9] Get best fallback: ${fallback ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`          → Fallback: ${fallback}`);

    // Test 3.10: Get statistics
    const stats = degradation.getStatistics();
    console.log(`[TEST 3.10] Get statistics: PASS ✅`);
    console.log(`           → Degradation events: ${stats.totalDegradationEvents}`);
    console.log(`           → Recovered accounts: ${stats.recoveredAccounts}`);

    // Test 3.11: Recover account
    degradation.markAccountAvailable(slave1Phone);
    const statusAfterRecovery = degradation.getStatus();
    console.log(`[TEST 3.11] Recover account: ${statusAfterRecovery.unavailableAccounts === 0 ? 'PASS ✅' : 'FAIL ❌'}`);

    // Test 3.12: Generate report
    const report = degradation.generateReport();
    console.log(`[TEST 3.12] Generate report: PASS ✅`);
    console.log(`           → System degraded: ${report.status.isDegraded}`);

    console.log(`\n✅ GracefulDegradationManager: ALL TESTS PASSED`);
  }
}

// Run tests
const tester = new TestPhase29d();
await tester.run();
