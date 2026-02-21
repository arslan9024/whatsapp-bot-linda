/**
 * Phase 5 Communication Feature Test
 * Tests the entire Communication Templates & Messaging system
 * 
 * Run: node scripts/test-communication-feature.js
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Import schemas and services
import CommunicationTemplate from '../code/Database/CommunicationTemplateSchema.js';
import CommunicationLog from '../code/Database/CommunicationLogSchema.js';
import CommunicationService from '../code/Database/CommunicationService.js';

let mongoServer;
let passed = 0;
let failed = 0;
const results = [];

function log(msg) { console.log(msg); }
function pass(name) { passed++; results.push({ name, status: '✅' }); log(`  ✅ ${name}`); }
function fail(name, err) { failed++; results.push({ name, status: '❌', error: err }); log(`  ❌ ${name}: ${err}`); }

async function setup() {
  log('\n🔧 Setting up in-memory MongoDB...');
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  log(`  ✅ Connected to in-memory MongoDB\n`);
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
  log('\n🧹 Cleanup complete');
}

// ============================================
// TEST SUITES
// ============================================

async function testSchemas() {
  log('📋 Test Suite: Schema Validation');

  try {
    // Template schema
    const templateId = CommunicationTemplate.generateTemplateId();
    const template = new CommunicationTemplate({
      templateId,
      name: 'Test Template',
      category: 'greeting',
      content: 'Hello {name}, welcome to {property}!',
      variables: [
        { name: 'name', displayName: 'Name', required: true, example: 'Ahmed' },
        { name: 'property', displayName: 'Property', required: true, example: 'DAMAC Hills 2' }
      ],
      createdBy: 'test'
    });
    await template.save();
    pass('CommunicationTemplate created');

    // Verify templateId format
    if (templateId.startsWith('TMPL-')) pass('TemplateId format correct');
    else fail('TemplateId format', `Expected TMPL-*, got ${templateId}`);

    // Test render method
    const rendered = template.render({ name: 'Ahmed', property: 'DAMAC Hills 2' });
    if (rendered === 'Hello Ahmed, welcome to DAMAC Hills 2!') pass('Template render works');
    else fail('Template render', `Got: ${rendered}`);

    // Test preview method  
    const preview = template.preview();
    if (preview.includes('Ahmed')) pass('Template preview works');
    else fail('Template preview', `Got: ${preview}`);

    // Test validateVariables
    const valid = template.validateVariables({ name: 'Ahmed', property: 'DH2' });
    if (valid.valid) pass('Variable validation (valid)');
    else fail('Variable validation', 'Should be valid');

    const invalid = template.validateVariables({});
    if (!invalid.valid && invalid.missing.length === 2) pass('Variable validation (missing)');
    else fail('Variable validation (missing)', `Missing: ${invalid.missing}`);

    // Log schema
    const logId = CommunicationLog.generateLogId();
    const commLog = new CommunicationLog({
      logId,
      sentBy: 'test',
      recipientPhone: '+971501234567',
      content: 'Test message',
      status: 'queued'
    });
    await commLog.save();
    pass('CommunicationLog created');

    if (logId.startsWith('LOG-')) pass('LogId format correct');
    else fail('LogId format', `Expected LOG-*, got ${logId}`);

    // Test status methods
    await commLog.markSent();
    if (commLog.status === 'sent' && commLog.sentAt) pass('Log markSent()');
    else fail('Log markSent()', `Status: ${commLog.status}`);

    await commLog.markDelivered();
    if (commLog.status === 'delivered' && commLog.deliveredAt) pass('Log markDelivered()');
    else fail('Log markDelivered()', `Status: ${commLog.status}`);

  } catch (error) {
    fail('Schema test', error.message);
  }
}

async function testTemplateService() {
  log('\n📋 Test Suite: Template CRUD');

  try {
    // Create
    const createResult = await CommunicationService.createTemplate({
      name: 'Payment Reminder Test',
      category: 'payment_reminder',
      content: 'Dear {tenantName}, your rent of AED {amount} is due on {dueDate}.',
      createdBy: 'test-suite'
    });
    if (createResult.success) pass('Create template');
    else fail('Create template', createResult.error);

    const templateId = createResult.template?.templateId;

    // Auto-detected variables
    if (createResult.template?.variables?.length === 3) pass('Auto-detect variables (3 found)');
    else fail('Auto-detect variables', `Found: ${createResult.template?.variables?.length}`);

    // Read by ID
    const getResult = await CommunicationService.getTemplate(templateId);
    if (getResult.success && getResult.template.name === 'Payment Reminder Test') pass('Get template by ID');
    else fail('Get template by ID', getResult.error);

    // Read by name
    const byName = await CommunicationService.getTemplateByName('Payment Reminder Test');
    if (byName.success) pass('Get template by name');
    else fail('Get template by name', byName.error);

    // List
    const listResult = await CommunicationService.listTemplates({ status: undefined });
    if (listResult.success && listResult.templates.length >= 1) pass('List templates');
    else fail('List templates', `Found: ${listResult.templates?.length}`);

    // List by category
    const byCat = await CommunicationService.listTemplates({ category: 'payment_reminder' });
    if (byCat.success && byCat.templates.length >= 1) pass('List by category');
    else fail('List by category', `Found: ${byCat.templates?.length}`);

    // Update
    const updateResult = await CommunicationService.updateTemplate(templateId, {
      content: 'Dear {tenantName}, your rent of AED {amount} is due. Please pay by {dueDate}.',
      updatedBy: 'test-suite'
    });
    if (updateResult.success) pass('Update template');
    else fail('Update template', updateResult.error);

    // Activate
    const activateResult = await CommunicationService.activateTemplate(templateId);
    if (activateResult.success) pass('Activate template');
    else fail('Activate template', activateResult.error);

    // Preview
    const previewResult = await CommunicationService.previewTemplate(templateId, {
      tenantName: 'Ahmed',
      amount: '45,000',
      dueDate: 'March 1'
    });
    if (previewResult.success && previewResult.preview.includes('Ahmed')) pass('Preview template');
    else fail('Preview template', previewResult.error);

    // Duplicate check
    const dupResult = await CommunicationService.createTemplate({
      name: 'Payment Reminder Test',
      category: 'payment_reminder',
      content: 'Duplicate',
      createdBy: 'test'
    });
    if (!dupResult.success && dupResult.error.includes('already exists')) pass('Duplicate name rejected');
    else fail('Duplicate name rejected', 'Should have been rejected');

    // Delete (archive)
    const deleteResult = await CommunicationService.deleteTemplate(templateId);
    if (deleteResult.success) pass('Archive template');
    else fail('Archive template', deleteResult.error);

    // Verify archived
    const archived = await CommunicationService.getTemplate(templateId);
    if (archived.success && archived.template.status === 'archived') pass('Verify archived status');
    else fail('Verify archived status', `Status: ${archived.template?.status}`);

  } catch (error) {
    fail('Template Service test', error.message);
  }
}

async function testMessaging() {
  log('\n📋 Test Suite: Message Sending');

  try {
    // Create and activate a template
    const tmpl = await CommunicationService.createTemplate({
      name: 'Messaging Test Template',
      category: 'notification',
      content: 'Hi {name}, this is a {type} from DAMAC Hills 2.',
      createdBy: 'test'
    });
    await CommunicationService.activateTemplate(tmpl.template.templateId);

    // Send template message (no sendFn — queue only)
    const sendResult = await CommunicationService.sendTemplateMessage({
      templateId: tmpl.template.templateId,
      recipientPhone: '+971501234567',
      recipientName: 'Test User',
      variables: { name: 'Test', type: 'notification' },
      sentBy: 'test-suite'
    });
    if (sendResult.success && sendResult.log.status === 'queued') pass('Send template message (queued)');
    else fail('Send template message', sendResult.error);

    if (sendResult.renderedContent === 'Hi Test, this is a notification from DAMAC Hills 2.') pass('Rendered content correct');
    else fail('Rendered content', `Got: ${sendResult.renderedContent}`);

    // Send with mock sendFn
    let sentTo = null;
    const mockSendFn = async (phone, text) => { sentTo = { phone, text }; };

    const sendResult2 = await CommunicationService.sendTemplateMessage({
      templateId: tmpl.template.templateId,
      recipientPhone: '+971509876543',
      variables: { name: 'Sara', type: 'alert' },
      sentBy: 'test-suite',
      sendFn: mockSendFn
    });
    if (sendResult2.success && sendResult2.log.status === 'sent') pass('Send with sendFn (sent)');
    else fail('Send with sendFn', sendResult2.error);

    if (sentTo?.phone === '+971509876543') pass('SendFn received correct phone');
    else fail('SendFn phone', `Got: ${sentTo?.phone}`);

    // Missing required variables — should be rejected
    const missingVars = await CommunicationService.sendTemplateMessage({
      templateId: tmpl.template.templateId,
      recipientPhone: '+971501111111',
      variables: {},
      sentBy: 'test'
    });
    if (!missingVars.success && missingVars.error.includes('Missing required')) pass('Reject missing required variables');
    else fail('Reject missing variables', 'Should have been rejected');

    // Send direct message
    const directResult = await CommunicationService.sendDirectMessage({
      recipientPhone: '+971502222222',
      content: 'This is a direct test message',
      sentBy: 'test-suite'
    });
    if (directResult.success) pass('Send direct message');
    else fail('Send direct message', directResult.error);

    // Bulk send
    const bulkResult = await CommunicationService.sendBulkMessage({
      templateId: tmpl.template.templateId,
      recipients: [
        { phone: '+971501111111', name: 'User 1', variables: { name: 'User1', type: 'bulk' } },
        { phone: '+971502222222', name: 'User 2', variables: { name: 'User2', type: 'bulk' } },
        { phone: '+971503333333', name: 'User 3', variables: { name: 'User3', type: 'bulk' } }
      ],
      sentBy: 'test-suite',
      sendFn: mockSendFn,
      delayMs: 10 // fast for testing
    });
    if (bulkResult.success && bulkResult.stats.sent === 3) pass('Bulk send (3 messages)');
    else fail('Bulk send', `Sent: ${bulkResult.stats?.sent}`);

    if (bulkResult.bulkId && bulkResult.bulkId.startsWith('BULK-')) pass('Bulk ID generated');
    else fail('Bulk ID', `Got: ${bulkResult.bulkId}`);

    // Bulk status check
    const bulkStatus = await CommunicationService.getBulkStatus(bulkResult.bulkId);
    if (bulkStatus.success && bulkStatus.stats.total === 3) pass('Bulk status check');
    else fail('Bulk status check', `Total: ${bulkStatus.stats?.total}`);

  } catch (error) {
    fail('Messaging test', error.message);
  }
}

async function testScheduling() {
  log('\n📋 Test Suite: Message Scheduling');

  try {
    // Create and activate template
    const tmpl = await CommunicationService.createTemplate({
      name: 'Schedule Test Template',
      category: 'notification',
      content: 'Scheduled: {message}',
      createdBy: 'test'
    });
    await CommunicationService.activateTemplate(tmpl.template.templateId);

    // Schedule for future
    const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
    const schedResult = await CommunicationService.scheduleMessage({
      templateId: tmpl.template.templateId,
      recipientPhone: '+971504444444',
      variables: { message: 'Hello from the future!' },
      sentBy: 'test',
      scheduledFor: futureDate.toISOString()
    });
    if (schedResult.success) pass('Schedule future message');
    else fail('Schedule future message', schedResult.error);

    // Schedule for past (should fail)
    const pastDate = new Date(Date.now() - 3600000);
    const pastResult = await CommunicationService.scheduleMessage({
      templateId: tmpl.template.templateId,
      recipientPhone: '+971505555555',
      variables: { message: 'From the past' },
      sentBy: 'test',
      scheduledFor: pastDate.toISOString()
    });
    if (!pastResult.success) pass('Reject past schedule');
    else fail('Reject past schedule', 'Should have failed');

    // Get due scheduled messages (future message shouldn't be due yet)
    const due = await CommunicationService.getDueScheduledMessages();
    if (due.success) pass('Get due scheduled messages');
    else fail('Get due scheduled', due.error);

  } catch (error) {
    fail('Scheduling test', error.message);
  }
}

async function testAnalytics() {
  log('\n📋 Test Suite: Analytics & Dashboard');

  try {
    // Delivery stats
    const statsResult = await CommunicationService.getDeliveryStats();
    if (statsResult.success && typeof statsResult.stats.total === 'number') pass('Get delivery stats');
    else fail('Get delivery stats', statsResult.error);

    // Recipient history
    const historyResult = await CommunicationService.getRecipientHistory('+971501234567');
    if (historyResult.success) pass('Get recipient history');
    else fail('Get recipient history', historyResult.error);

    // Categories
    const catResult = await CommunicationService.getCategories();
    if (catResult.success && catResult.categories.length > 0) pass('Get categories');
    else fail('Get categories', `Found: ${catResult.categories?.length}`);

    // Dashboard
    const dashResult = await CommunicationService.getDashboard();
    if (dashResult.success && dashResult.dashboard.templates) pass('Get dashboard');
    else fail('Get dashboard', dashResult.error);

    // Template analytics
    const templates = await CommunicationService.listTemplates({ limit: 1 });
    if (templates.success && templates.templates.length > 0) {
      const analyticsResult = await CommunicationService.getTemplateAnalytics(templates.templates[0].templateId);
      if (analyticsResult.success) pass('Get template analytics');
      else fail('Get template analytics', analyticsResult.error);
    }

  } catch (error) {
    fail('Analytics test', error.message);
  }
}

async function testSeedTemplates() {
  log('\n📋 Test Suite: Default Template Seeding');

  try {
    const seedResult = await CommunicationService.seedDefaultTemplates();
    if (seedResult.success && seedResult.seeded >= 1) pass(`Seed templates (${seedResult.seeded} created)`);
    else fail('Seed templates', seedResult.error || `Seeded: ${seedResult.seeded}`);

    // Verify seeded templates exist
    const templates = await CommunicationService.listTemplates({ status: 'active' });
    if (templates.success && templates.templates.length >= 5) pass(`Active templates: ${templates.templates.length}`);
    else fail('Active templates count', `Found: ${templates.templates?.length}`);

    // Re-seed should skip existing
    const reSeed = await CommunicationService.seedDefaultTemplates();
    if (reSeed.success && reSeed.skipped >= 5) pass(`Re-seed skipped: ${reSeed.skipped}`);
    else fail('Re-seed skip', `Skipped: ${reSeed.skipped}`);

  } catch (error) {
    fail('Seed test', error.message);
  }
}

async function testVariableDetection() {
  log('\n📋 Test Suite: Variable Detection');

  try {
    const vars1 = CommunicationService.detectVariables('Hello {name}, your unit is {unitNumber}');
    if (vars1.length === 2) pass('Detect 2 variables');
    else fail('Detect variables', `Found: ${vars1.length}`);

    if (vars1[0].name === 'name' && vars1[1].name === 'unitNumber') pass('Variable names correct');
    else fail('Variable names', `Got: ${vars1.map(v => v.name).join(', ')}`);

    const vars2 = CommunicationService.detectVariables('No variables here!');
    if (vars2.length === 0) pass('Detect 0 variables');
    else fail('Detect 0 variables', `Found: ${vars2.length}`);

    // Duplicate variables
    const vars3 = CommunicationService.detectVariables('{name} says hi to {name}');
    if (vars3.length === 1) pass('Deduplicate variables');
    else fail('Deduplicate', `Found: ${vars3.length}`);

  } catch (error) {
    fail('Variable detection test', error.message);
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          PHASE 5 - COMMUNICATION FEATURE TESTS                 ║
║          Templates, Messaging, Analytics, Scheduling            ║
╚════════════════════════════════════════════════════════════════╝
`);

  const startTime = Date.now();

  try {
    await setup();

    await testSchemas();
    await testTemplateService();
    await testMessaging();
    await testScheduling();
    await testAnalytics();
    await testSeedTemplates();
    await testVariableDetection();

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    fail('Fatal', error.message);
  } finally {
    await teardown();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                     TEST RESULTS                                ║
╠════════════════════════════════════════════════════════════════╣
║  ✅ Passed: ${String(passed).padEnd(4)} │  ❌ Failed: ${String(failed).padEnd(4)} │  Total: ${String(passed + failed).padEnd(4)}     ║
║  ⏱️  Duration: ${String(duration + 's').padEnd(8)}                                      ║
║  📊 Pass Rate: ${String(((passed / (passed + failed)) * 100).toFixed(1) + '%').padEnd(8)}                                     ║
╚════════════════════════════════════════════════════════════════╝
`);

  if (failed > 0) {
    console.log('❌ Failed tests:');
    for (const r of results.filter(r => r.status === '❌')) {
      console.log(`  • ${r.name}: ${r.error}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
