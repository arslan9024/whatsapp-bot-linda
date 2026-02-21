/**
 * ========================================================================
 * COMMISSION RULES & CALCULATION ENGINE - TEST SUITE
 * Phase 5: Feature 2 - Commission Tracking System Enhancement
 * ========================================================================
 * 
 * Comprehensive tests for:
 * - CommissionRuleSchema validation
 * - CommissionCalculationEngine (all 4 rule types)
 * - Batch calculations
 * - Approval workflow
 * - Rule matching & priority
 * - Edge cases
 * 
 * Run: node scripts/test-commission-rules.js
 * 
 * @since Phase 5 - February 2026
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Import schemas and engine
import { CommissionRule, CalculationRecord } from '../code/Database/CommissionRuleSchema.js';
import { Commission } from '../code/Database/CommissionSchema.js';
import CommissionCalculationEngine from '../code/Services/CommissionCalculationEngine.js';

// ========================================================================
// TEST INFRASTRUCTURE
// ========================================================================

let mongoServer;
let passed = 0;
let failed = 0;
let total = 0;
const results = [];

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    results.push({ name: testName, status: '✅' });
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    results.push({ name: testName, status: '❌' });
    console.log(`  ❌ ${testName}`);
  }
}

function assertClose(a, b, tolerance, testName) {
  assert(Math.abs(a - b) < tolerance, testName);
}

async function setup() {
  console.log('\n🔧 Setting up in-memory MongoDB...');
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('✅ Connected to in-memory MongoDB\n');
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('\n🧹 Cleaned up test environment');
}

async function clearDB() {
  await CommissionRule.deleteMany({});
  await CalculationRecord.deleteMany({});
  await Commission.deleteMany({});
}

// ========================================================================
// TEST SUITES
// ========================================================================

async function testRuleCreation() {
  console.log('\n📋 TEST SUITE: Commission Rule Creation');
  console.log('─'.repeat(50));
  await clearDB();

  // Test 1: Create percentage rule
  const result1 = await CommissionCalculationEngine.createRule({
    name: 'Test Percentage Rule',
    type: 'percentage',
    percentageConfig: { rate: 2.5 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });
  assert(result1.success === true, 'Create percentage rule');
  assert(result1.rule.ruleId.startsWith('rule-'), 'Rule ID generated correctly');
  assert(result1.rule.type === 'percentage', 'Rule type is percentage');
  assert(result1.rule.percentageConfig.rate === 2.5, 'Rate is 2.5%');

  // Test 2: Create fixed rule
  const result2 = await CommissionCalculationEngine.createRule({
    name: 'Test Fixed Rule',
    type: 'fixed',
    fixedConfig: { amount: 5000, currency: 'AED' },
    appliesToTransactionTypes: ['lease_signup'],
    active: true,
    priority: 1
  });
  assert(result2.success === true, 'Create fixed rule');
  assert(result2.rule.fixedConfig.amount === 5000, 'Fixed amount is 5000');

  // Test 3: Create tiered rule
  const result3 = await CommissionCalculationEngine.createRule({
    name: 'Test Tiered Rule',
    type: 'tiered',
    tieredConfig: {
      tiers: [
        { minValue: 0, maxValue: 2000000, rate: 1.5, label: 'Standard' },
        { minValue: 2000001, maxValue: 5000000, rate: 2, label: 'Mid-range' },
        { minValue: 5000001, maxValue: null, rate: 2.5, label: 'Premium' }
      ],
      method: 'flat'
    },
    active: true,
    priority: 5
  });
  assert(result3.success === true, 'Create tiered rule');
  assert(result3.rule.tieredConfig.tiers.length === 3, 'Has 3 tiers');

  // Test 4: Create revenue share rule
  const result4 = await CommissionCalculationEngine.createRule({
    name: 'Test Revenue Share',
    type: 'revenue_share',
    revenueShareConfig: {
      baseRate: 3,
      splits: [
        { party: 'agent', percent: 60 },
        { party: 'broker', percent: 25 },
        { party: 'company', percent: 15 }
      ]
    },
    active: true,
    priority: 3
  });
  assert(result4.success === true, 'Create revenue share rule');
  assert(result4.rule.revenueShareConfig.splits.length === 3, 'Has 3 splits');

  // Test 5: Invalid revenue share (splits don't total 100%)
  const result5 = await CommissionCalculationEngine.createRule({
    name: 'Bad Revenue Share',
    type: 'revenue_share',
    revenueShareConfig: {
      baseRate: 3,
      splits: [
        { party: 'agent', percent: 50 },
        { party: 'broker', percent: 30 }
      ]
    },
    active: true
  });
  assert(result5.success === false, 'Reject invalid revenue share (80% != 100%)');

  // Test 6: Missing required fields
  const result6 = await CommissionCalculationEngine.createRule({
    // Missing name and type
    percentageConfig: { rate: 2 }
  });
  assert(result6.success === false, 'Reject rule without required fields');
}

async function testPercentageCalculation() {
  console.log('\n📋 TEST SUITE: Percentage Calculation');
  console.log('─'.repeat(50));
  await clearDB();

  // Create a percentage rule
  await CommissionCalculationEngine.createRule({
    name: 'Sale 2%',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  // Test 1: Basic calculation
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 2000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assert(result1.success === true, 'Percentage calculation succeeds');
  assertClose(result1.totalCommission, 40000, 0.01, 'Commission = AED 40,000 (2% of 2M)');
  assert(result1.effectiveRate === 2, 'Effective rate = 2%');
  assert(result1.calculationId !== null, 'Calculation ID generated');

  // Test 2: Small transaction
  const result2 = await CommissionCalculationEngine.calculate({
    transactionValue: 100000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assertClose(result2.totalCommission, 2000, 0.01, 'Commission = AED 2,000 (2% of 100K)');

  // Test 3: Large transaction
  const result3 = await CommissionCalculationEngine.calculate({
    transactionValue: 50000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assertClose(result3.totalCommission, 1000000, 0.01, 'Commission = AED 1,000,000 (2% of 50M)');
}

async function testFixedCalculation() {
  console.log('\n📋 TEST SUITE: Fixed Amount Calculation');
  console.log('─'.repeat(50));
  await clearDB();

  // Create a fixed rule
  await CommissionCalculationEngine.createRule({
    name: 'Lease Signup Fee',
    type: 'fixed',
    fixedConfig: { amount: 5000, currency: 'AED' },
    appliesToTransactionTypes: ['lease_signup'],
    active: true,
    priority: 1
  });

  // Test 1: Fixed amount regardless of transaction value
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 80000,
    transactionType: 'lease_signup',
    agentPhone: '+971501234567'
  });
  assert(result1.success === true, 'Fixed calculation succeeds');
  assert(result1.totalCommission === 5000, 'Commission = AED 5,000 (fixed)');

  // Test 2: Same fixed amount for different value
  const result2 = await CommissionCalculationEngine.calculate({
    transactionValue: 500000,
    transactionType: 'lease_signup',
    agentPhone: '+971501234567'
  });
  assert(result2.totalCommission === 5000, 'Same fixed amount for higher transaction');
}

async function testTieredCalculation() {
  console.log('\n📋 TEST SUITE: Tiered Calculation');
  console.log('─'.repeat(50));
  await clearDB();

  // Create flat tiered rule
  await CommissionCalculationEngine.createRule({
    name: 'Tiered Flat Sale',
    type: 'tiered',
    tieredConfig: {
      tiers: [
        { minValue: 0, maxValue: 2000000, rate: 1.5, label: 'Standard' },
        { minValue: 2000001, maxValue: 5000000, rate: 2, label: 'Mid' },
        { minValue: 5000001, maxValue: null, rate: 2.5, label: 'Premium' }
      ],
      method: 'flat'
    },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  // Test 1: Low tier (flat method - applies rate to full amount)
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assert(result1.success === true, 'Flat tiered low-value succeeds');
  assertClose(result1.totalCommission, 15000, 0.01, 'AED 1M * 1.5% = AED 15,000');

  // Test 2: Mid tier
  const result2 = await CommissionCalculationEngine.calculate({
    transactionValue: 3500000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assertClose(result2.totalCommission, 70000, 0.01, 'AED 3.5M * 2% = AED 70,000');

  // Test 3: Premium tier
  const result3 = await CommissionCalculationEngine.calculate({
    transactionValue: 8000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assertClose(result3.totalCommission, 200000, 0.01, 'AED 8M * 2.5% = AED 200,000');
}

async function testRevenueShareCalculation() {
  console.log('\n📋 TEST SUITE: Revenue Share Calculation');
  console.log('─'.repeat(50));
  await clearDB();

  // Create revenue share rule
  await CommissionCalculationEngine.createRule({
    name: 'Team Split',
    type: 'revenue_share',
    revenueShareConfig: {
      baseRate: 3,
      splits: [
        { party: 'agent', percent: 60 },
        { party: 'broker', percent: 25 },
        { party: 'company', percent: 15 }
      ]
    },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  // Test 1: Revenue share calculation
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 2000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assert(result1.success === true, 'Revenue share calculation succeeds');
  assertClose(result1.totalCommission, 60000, 0.01, 'Total commission = AED 60,000 (3% of 2M)');
  assert(result1.breakdown.length === 3, 'Has 3 breakdown items');

  // Check splits
  const agentShare = result1.breakdown.find(b => b.party === 'agent');
  const brokerShare = result1.breakdown.find(b => b.party === 'broker');
  const companyShare = result1.breakdown.find(b => b.party === 'company');

  assertClose(agentShare.amount, 36000, 0.01, 'Agent gets AED 36,000 (60%)');
  assertClose(brokerShare.amount, 15000, 0.01, 'Broker gets AED 15,000 (25%)');
  assertClose(companyShare.amount, 9000, 0.01, 'Company gets AED 9,000 (15%)');
}

async function testRuleMatching() {
  console.log('\n📋 TEST SUITE: Rule Matching & Priority');
  console.log('─'.repeat(50));
  await clearDB();

  // Create rules with different priorities
  await CommissionCalculationEngine.createRule({
    name: 'Default Sale (Low Priority)',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  await CommissionCalculationEngine.createRule({
    name: 'Villa Premium (High Priority)',
    type: 'percentage',
    percentageConfig: { rate: 3 },
    appliesToPropertyTypes: ['villa'],
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 10
  });

  await CommissionCalculationEngine.createRule({
    name: 'Inactive Rule',
    type: 'percentage',
    percentageConfig: { rate: 50 },
    appliesToTransactionTypes: ['sale'],
    active: false,
    priority: 100
  });

  // Test 1: Villa sale should match high-priority rule
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 2000000,
    transactionType: 'sale',
    propertyType: 'villa',
    agentPhone: '+971501234567'
  });
  assert(result1.success === true, 'Villa sale matches high-priority rule');
  assertClose(result1.totalCommission, 60000, 0.01, 'Commission = AED 60,000 (3% villa rate)');
  assert(result1.ruleApplied.name === 'Villa Premium (High Priority)', 'Correct rule applied');

  // Test 2: Apartment sale should match default rule
  const result2 = await CommissionCalculationEngine.calculate({
    transactionValue: 2000000,
    transactionType: 'sale',
    propertyType: 'apartment',
    agentPhone: '+971501234567'
  });
  assertClose(result2.totalCommission, 40000, 0.01, 'Commission = AED 40,000 (2% default rate)');

  // Test 3: Inactive rule should not be used
  const rules = await CommissionCalculationEngine.findApplicableRules({
    transactionType: 'sale',
    propertyType: 'apartment'
  });
  assert(rules.every(r => r.active === true), 'No inactive rules matched');
}

async function testRuleScoping() {
  console.log('\n📋 TEST SUITE: Rule Scoping');
  console.log('─'.repeat(50));
  await clearDB();

  // Create scoped rule
  await CommissionCalculationEngine.createRule({
    name: 'Agent-Specific Rule',
    type: 'percentage',
    percentageConfig: { rate: 5 },
    appliesToAgents: ['+971501234567'],
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 20
  });

  await CommissionCalculationEngine.createRule({
    name: 'General Rule',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  // Test 1: Specific agent gets special rate
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assertClose(result1.totalCommission, 50000, 0.01, 'Special agent gets 5% = AED 50,000');

  // Test 2: Other agent gets general rate
  const result2 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,
    transactionType: 'sale',
    agentPhone: '+971509999999'
  });
  assertClose(result2.totalCommission, 20000, 0.01, 'Other agent gets 2% = AED 20,000');

  // Test 3: Value range scoping
  await CommissionCalculationEngine.createRule({
    name: 'High-Value Bonus',
    type: 'percentage',
    percentageConfig: { rate: 3 },
    appliesToTransactionTypes: ['sale'],
    minTransactionValue: 5000000,
    active: true,
    priority: 15
  });

  const result3 = await CommissionCalculationEngine.calculate({
    transactionValue: 6000000,
    transactionType: 'sale',
    agentPhone: '+971509999999'
  });
  assertClose(result3.totalCommission, 180000, 0.01, 'High-value deal gets 3% = AED 180,000');
}

async function testBatchCalculation() {
  console.log('\n📋 TEST SUITE: Batch Calculation');
  console.log('─'.repeat(50));
  await clearDB();

  // Create a simple percentage rule
  await CommissionCalculationEngine.createRule({
    name: 'Batch Test Rule',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  // Test 1: Batch calculate multiple transactions
  const transactions = [
    { transactionValue: 1000000, transactionType: 'sale', agentPhone: '+971501111111' },
    { transactionValue: 2000000, transactionType: 'sale', agentPhone: '+971502222222' },
    { transactionValue: 3000000, transactionType: 'sale', agentPhone: '+971503333333' }
  ];

  const result = await CommissionCalculationEngine.batchCalculate(transactions);

  assert(result.success === true, 'Batch calculation succeeds');
  assert(result.summary.totalTransactions === 3, 'Processed 3 transactions');
  assert(result.summary.successful === 3, 'All 3 successful');
  assertClose(result.summary.totalCommission, 120000, 0.01, 'Total = AED 120,000 (20K + 40K + 60K)');

  // Test 2: Batch with some failures
  const mixedTransactions = [
    { transactionValue: 1000000, transactionType: 'sale', agentPhone: '+971501111111' },
    { transactionValue: -100, transactionType: 'sale', agentPhone: '+971502222222' },  // Invalid
    { transactionValue: 2000000, transactionType: 'sale', agentPhone: '+971503333333' }
  ];

  const result2 = await CommissionCalculationEngine.batchCalculate(mixedTransactions);
  assert(result2.summary.successful === 2, 'Batch: 2 successful');
  assert(result2.summary.failed === 1, 'Batch: 1 failed');
}

async function testApprovalWorkflow() {
  console.log('\n📋 TEST SUITE: Approval Workflow');
  console.log('─'.repeat(50));
  await clearDB();

  // Create rule with approval required
  await CommissionCalculationEngine.createRule({
    name: 'Approval Required Rule',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1,
    approvalRequired: true,
    approvalThreshold: 50000  // Auto-approve below 50K
  });

  // Test 1: Small commission auto-calculated (below threshold)
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,  // 2% = 20,000 (below 50K threshold)
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assert(result1.status === 'calculated', 'Small commission auto-calculated (below threshold)');
  assert(result1.requiresApproval === false, 'No approval required for small amount');

  // Test 2: Large commission needs approval
  const result2 = await CommissionCalculationEngine.calculate({
    transactionValue: 5000000,  // 2% = 100,000 (above 50K threshold)
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assert(result2.status === 'pending_approval', 'Large commission needs approval');
  assert(result2.requiresApproval === true, 'Approval required for large amount');

  // Test 3: Approve the calculation
  const approveResult = await CommissionCalculationEngine.approveCalculation(
    result2.calculationId,
    'manager@test.com',
    true
  );
  assert(approveResult.success === true, 'Approval succeeds');
  assert(approveResult.commissionId !== undefined, 'Commission record created on approval');

  // Test 4: Verify commission record was created
  const commission = await Commission.findOne({ commissionId: approveResult.commissionId });
  assert(commission !== null, 'Commission record exists in database');
  assertClose(commission.commissionAmount, 100000, 0.01, 'Commission amount = AED 100,000');

  // Test 5: Cannot approve already-approved calculation
  const doubleApprove = await CommissionCalculationEngine.approveCalculation(
    result2.calculationId,
    'another_manager'
  );
  assert(doubleApprove.success === false, 'Cannot double-approve');

  // Test 6: Reject a pending calculation
  const result3 = await CommissionCalculationEngine.calculate({
    transactionValue: 10000000,
    transactionType: 'sale',
    agentPhone: '+971509999999'
  });
  const rejectResult = await CommissionCalculationEngine.rejectCalculation(
    result3.calculationId,
    'manager@test.com',
    'Deal fell through'
  );
  assert(rejectResult.success === true, 'Rejection succeeds');
  assert(rejectResult.status === 'rejected', 'Status is rejected');

  // Test 7: Get pending approvals
  const pending = await CommissionCalculationEngine.getPendingApprovals();
  assert(Array.isArray(pending), 'Pending approvals returns array');
}

async function testPreview() {
  console.log('\n📋 TEST SUITE: Preview (No Save)');
  console.log('─'.repeat(50));
  await clearDB();

  await CommissionCalculationEngine.createRule({
    name: 'Preview Test Rule',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  const countBefore = await CalculationRecord.countDocuments();

  const result = await CommissionCalculationEngine.preview({
    transactionValue: 2000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });

  const countAfter = await CalculationRecord.countDocuments();

  assert(result.success === true, 'Preview succeeds');
  assertClose(result.totalCommission, 40000, 0.01, 'Preview shows correct amount');
  assert(countAfter === countBefore, 'No record saved during preview');
  assert(result.calculationId === null, 'No calculation ID for preview');
}

async function testRuleCRUD() {
  console.log('\n📋 TEST SUITE: Rule CRUD Operations');
  console.log('─'.repeat(50));
  await clearDB();

  // Create
  const createResult = await CommissionCalculationEngine.createRule({
    name: 'CRUD Test Rule',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    active: true,
    priority: 1
  });
  const ruleId = createResult.rule.ruleId;
  assert(createResult.success === true, 'Create: rule created');

  // Read
  const rule = await CommissionCalculationEngine.getRuleById(ruleId);
  assert(rule !== null, 'Read: rule found');
  assert(rule.name === 'CRUD Test Rule', 'Read: correct name');

  // Update
  const updateResult = await CommissionCalculationEngine.updateRule(ruleId, {
    name: 'Updated Rule',
    percentageConfig: { rate: 3 }
  });
  assert(updateResult.success === true, 'Update: rule updated');
  assert(updateResult.rule.name === 'Updated Rule', 'Update: name changed');

  // Deactivate
  const deactivateResult = await CommissionCalculationEngine.deactivateRule(ruleId);
  assert(deactivateResult.success === true, 'Deactivate: rule deactivated');
  const deactivatedRule = await CommissionCalculationEngine.getRuleById(ruleId);
  assert(deactivatedRule.active === false, 'Deactivate: active is false');

  // Delete
  const deleteResult = await CommissionCalculationEngine.deleteRule(ruleId);
  assert(deleteResult.success === true, 'Delete: rule deleted');
  const deletedRule = await CommissionCalculationEngine.getRuleById(ruleId);
  assert(deletedRule === null, 'Delete: rule no longer exists');
}

async function testCalculationHistory() {
  console.log('\n📋 TEST SUITE: Calculation History & Reports');
  console.log('─'.repeat(50));
  await clearDB();

  await CommissionCalculationEngine.createRule({
    name: 'History Test',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  // Generate some calculations
  const agentPhone = '+971501234567';
  for (let i = 0; i < 5; i++) {
    await CommissionCalculationEngine.calculate({
      transactionValue: (i + 1) * 1000000,
      transactionType: 'sale',
      agentPhone,
      propertyType: i < 3 ? 'villa' : 'apartment'
    });
  }

  // Test 1: Get calculation history
  const history = await CommissionCalculationEngine.getCalculationHistory(agentPhone);
  assert(history.length === 5, 'History: 5 records found');

  // Test 2: Get with limit
  const limited = await CommissionCalculationEngine.getCalculationHistory(agentPhone, { limit: 3 });
  assert(limited.length === 3, 'History: limit works');

  // Test 3: Generate earnings report
  const report = await CommissionCalculationEngine.generateEarningsReport(agentPhone);
  assert(report.success === true, 'Earnings report generated');
  assert(report.summary.totalCalculations === 5, 'Report: 5 calculations');
  assertClose(report.summary.totalCommission, 300000, 0.01, 'Report: total = AED 300,000');

  // Test 4: Report breakdown by property type
  assert(report.summary.byPropertyType.villa > 0, 'Report has villa breakdown');
  assert(report.summary.byPropertyType.apartment > 0, 'Report has apartment breakdown');
}

async function testSeedDefaultRules() {
  console.log('\n📋 TEST SUITE: Seed Default Rules');
  console.log('─'.repeat(50));
  await clearDB();

  const result = await CommissionCalculationEngine.seedDefaultRules();

  assert(result.success === true, 'Seed succeeds');
  assert(result.rulesCreated === 5, 'Created 5 default rules');
  assert(result.results.every(r => r.success), 'All rules created successfully');

  // Verify rules are in database
  const allRules = await CommissionCalculationEngine.getRules({});
  assert(allRules.length === 5, 'All 5 rules in database');

  // Verify active/inactive status
  const activeRules = await CommissionCalculationEngine.getRules({ active: true });
  assert(activeRules.length === 3, '3 rules are active (Standard Sale, Premium Villa, Lease Fixed)');
}

async function testEdgeCases() {
  console.log('\n📋 TEST SUITE: Edge Cases');
  console.log('─'.repeat(50));
  await clearDB();

  await CommissionCalculationEngine.createRule({
    name: 'Edge Test',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToTransactionTypes: ['sale'],
    active: true,
    priority: 1
  });

  // Test 1: Zero transaction value
  const result1 = await CommissionCalculationEngine.calculate({
    transactionValue: 0,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assert(result1.success === false, 'Reject zero transaction value');

  // Test 2: Negative transaction value
  const result2 = await CommissionCalculationEngine.calculate({
    transactionValue: -100000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  });
  assert(result2.success === false, 'Reject negative transaction value');

  // Test 3: Missing agent phone
  const result3 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,
    transactionType: 'sale'
  });
  assert(result3.success === false, 'Reject missing agent phone');

  // Test 4: No matching rule
  const result4 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,
    transactionType: 'lease_signup',  // No rule for this type
    agentPhone: '+971501234567'
  });
  assert(result4.success === false, 'No matching rule returns error');

  // Test 5: Non-existent rule ID
  const result5 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,
    transactionType: 'sale',
    agentPhone: '+971501234567'
  }, { ruleId: 'rule-nonexistent' });
  assert(result5.success === false, 'Non-existent rule ID returns error');

  // Test 6: Rule with expired date
  await CommissionCalculationEngine.createRule({
    name: 'Expired Rule',
    type: 'percentage',
    percentageConfig: { rate: 99 },
    appliesToTransactionTypes: ['lease_renewal'],
    active: true,
    priority: 100,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2020-12-31')  // Expired
  });

  const result6 = await CommissionCalculationEngine.calculate({
    transactionValue: 1000000,
    transactionType: 'lease_renewal',
    agentPhone: '+971501234567'
  });
  assert(result6.success === false, 'Expired rule not matched');

  // Test 7: Get rule stats for non-existent rule
  const stats = await CommissionCalculationEngine.getRuleStats('rule-nonexistent');
  assert(stats.success === true, 'Rule stats returns even for no data');
}

async function testRuleInstanceMethods() {
  console.log('\n📋 TEST SUITE: Rule Instance Methods');
  console.log('─'.repeat(50));
  await clearDB();

  const rule = new CommissionRule({
    ruleId: 'rule-test-instance',
    name: 'Instance Test',
    type: 'percentage',
    percentageConfig: { rate: 2 },
    appliesToPropertyTypes: ['villa'],
    appliesToTransactionTypes: ['sale'],
    appliesToAgents: ['+971501234567'],
    minTransactionValue: 500000,
    maxTransactionValue: 10000000,
    active: true,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-12-31')
  });

  // Test 1: isCurrentlyActive
  assert(rule.isCurrentlyActive() === true, 'Rule is currently active');

  // Test 2: appliesTo - matching transaction
  assert(rule.appliesTo({
    propertyType: 'villa',
    transactionType: 'sale',
    agentPhone: '+971501234567',
    transactionValue: 2000000
  }) === true, 'Applies to matching transaction');

  // Test 3: appliesTo - wrong property type
  assert(rule.appliesTo({
    propertyType: 'apartment',
    transactionType: 'sale',
    agentPhone: '+971501234567',
    transactionValue: 2000000
  }) === false, 'Does NOT apply to wrong property type');

  // Test 4: appliesTo - wrong agent
  assert(rule.appliesTo({
    propertyType: 'villa',
    transactionType: 'sale',
    agentPhone: '+971509999999',
    transactionValue: 2000000
  }) === false, 'Does NOT apply to wrong agent');

  // Test 5: appliesTo - below min value
  assert(rule.appliesTo({
    propertyType: 'villa',
    transactionType: 'sale',
    agentPhone: '+971501234567',
    transactionValue: 100000
  }) === false, 'Does NOT apply below min value');

  // Test 6: appliesTo - above max value
  assert(rule.appliesTo({
    propertyType: 'villa',
    transactionType: 'sale',
    agentPhone: '+971501234567',
    transactionValue: 20000000
  }) === false, 'Does NOT apply above max value');
}

// ========================================================================
// RUN ALL TESTS
// ========================================================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  COMMISSION RULES & CALCULATION ENGINE - TEST SUITE        ║');
  console.log('║  Phase 5: Feature 2 Enhancement                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await setup();

    await testRuleCreation();
    await testPercentageCalculation();
    await testFixedCalculation();
    await testTieredCalculation();
    await testRevenueShareCalculation();
    await testRuleMatching();
    await testRuleScoping();
    await testBatchCalculation();
    await testApprovalWorkflow();
    await testPreview();
    await testRuleCRUD();
    await testCalculationHistory();
    await testSeedDefaultRules();
    await testEdgeCases();
    await testRuleInstanceMethods();

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
    console.error(error.stack);
  } finally {
    await teardown();
  }

  // ========================================================================
  // RESULTS SUMMARY
  // ========================================================================

  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests:  ${String(total).padStart(4)}                                       ║`);
  console.log(`║  Passed:       ${String(passed).padStart(4)}  ✅                                   ║`);
  console.log(`║  Failed:       ${String(failed).padStart(4)}  ${failed > 0 ? '❌' : '✅'}                                   ║`);
  console.log(`║  Pass Rate:    ${String(passRate + '%').padStart(6)}                                    ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (failed > 0) {
    console.log('║  FAILED TESTS:                                             ║');
    for (const r of results.filter(r => r.status === '❌')) {
      console.log(`║  ❌ ${r.name.padEnd(55)}║`);
    }
  } else {
    console.log('║  🎉 ALL TESTS PASSED! Feature 2 is production-ready!       ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
