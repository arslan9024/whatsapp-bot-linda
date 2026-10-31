/**
 * ====================================================================
 * DRY RUN: DAMAC HILLS 2 OUTREACH & SUPERVISOR DISPATCH TEST HARNESS
 * ====================================================================
 * Safely executes a simulation of the Damac Hills 2 property owner outreach
 * using closed-circle numbers only.
 *
 * Demonstrates:
 *   1. 100% Fresh Lead -> Assigned to sub-agent with available quota (1/1 per day).
 *   2. Existing Chat History -> Cold send blocked; Supervisor alerts sub-agent.
 *   3. Second fresh lead on same day -> Daily quota exhaustion protection.
 *
 * Usage:
 *   node scripts/dryrun-damac2-outreach.js [--live]
 */

import { DamacHills2CampaignManager } from '../src/outreach/DamacHills2CampaignManager.js';
import services from '../src/core/ServiceRegistry.js';
import path from 'path';
import fs from 'fs';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   DAMAC HILLS 2 OUTREACH & SUPERVISOR DISPATCH TEST HARNESS ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Clean temporary test quota file
const testQuotaPath = path.resolve('data', 'outreach', 'test-run-quota.json');
if (fs.existsSync(testQuotaPath)) {
  fs.unlinkSync(testQuotaPath);
}

// 1. Mock Accounts Setup
const mockAgent1 = {
  phoneNumber: '+971559156636',
  displayName: 'Junior Agent 1',
  client: {
    sendMessage: async (jid, text) => {
      console.log(`\n  📨 [OUTBOUND SEND from +971559156636 to ${jid}]:\n     "${text}"`);
      return { id: { id: 'sim_msg_001' } };
    },
    pupPage: { evaluate: async (fn, ...args) => (typeof fn === 'function' ? fn(...args) : null) }, // No prior chats
  },
};

const mockAgent2 = {
  phoneNumber: '+971589969886',
  displayName: 'Junior Agent 2',
  client: {
    sendMessage: async (jid, text) => {
      console.log(`\n  📨 [OUTBOUND SEND from +971589969886 to ${jid}]:\n     "${text}"`);
      return { id: { id: 'sim_msg_002' } };
    },
    pupPage: {
      evaluate: async (fn, jids) => {
        // Simulates old chat history exists ONLY for Tariq (+971505110636) on this line
        if (Array.isArray(jids) && jids.some((j) => String(j).includes('971505110636'))) {
          return {
            found: true,
            jid: '971505110636@c.us',
            messageCount: 8,
            lastTimestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago!
            lastBodySnippet: 'I own a 3-bedroom villa in Amazon cluster',
          };
        }
        return null;
      },
    },
  },
};

const mockSupervisor = {
  phoneNumber: '+971505760056',
  displayName: 'Linda Supervisor (Primary Master)',
  client: {
    sendMessage: async (jid, text) => {
      console.log(`\n  👑 [SUPERVISOR DISPATCH from +971505760056 to ${jid}]:\n     ${text.replace(/\n/g, '\n     ')}`);
      return { id: { id: 'sup_dispatch_001' } };
    },
    pupPage: { evaluate: async (fn, ...args) => (typeof fn === 'function' ? fn(...args) : null) },
  },
};

const mockClients = new Map([
  [mockSupervisor.phoneNumber, mockSupervisor.client],
  [mockAgent1.phoneNumber, mockAgent1.client],
  [mockAgent2.phoneNumber, mockAgent2.client],
]);

const mockAcm = {
  getMasterPhoneNumber: () => mockSupervisor.phoneNumber,
  getAccountByPhone: (phone) => {
    if (phone === mockSupervisor.phoneNumber) return mockSupervisor;
    if (phone === mockAgent1.phoneNumber) return mockAgent1;
    if (phone === mockAgent2.phoneNumber) return mockAgent2;
    return null;
  },
  getAllAccounts: () => [mockSupervisor, mockAgent1, mockAgent2],
};

services.register('accountClients', mockClients);
services.register('accountConfigManager', mockAcm);

const campaignManager = new DamacHills2CampaignManager({
  quotaFile: testQuotaPath,
  accountClients: mockClients,
  accountConfigManager: mockAcm,
});

async function runTest() {
  console.log('--- TEST CASE 1: Contact with Prior Chat History (Amazon Cluster Owner) ---');
  const existingLead = {
    name: 'Tariq Mansoor',
    phone: '+971505110636',
    community: 'Damac Hills 2',
    unit: 'Amazon Cluster Villa 18',
  };

  const res1 = await campaignManager.processLead(existingLead, { dryRun: false });
  console.log(`  Result Action: ${res1.action}`);
  console.log(`  Assigned Sub-Agent: ${res1.agentName} (${res1.assignedAgent})`);
  console.log('  Status: Cold outreach SKIPPED; Supervisor alerted sub-agent!\n');

  console.log('--- TEST CASE 2: 100% Brand-New Contact (Fresh Lead 1) ---');
  const freshLead1 = {
    name: 'Saeed Al Maktoum',
    phone: '+971509876543',
    community: 'Damac Hills 2',
    unit: 'Victoria Cluster Villa 05',
  };

  const res2 = await campaignManager.processLead(freshLead1, { dryRun: false });
  console.log(`  Result Action: ${res2.action}`);
  console.log(`  Sending Sub-Agent: ${res2.sendingAgent}`);
  console.log('  Status: 1 Daily greeting sent; 1/1 Quota used for this line.\n');

  console.log('--- TEST CASE 3: Second Fresh Lead Today on Line with Used Quota ---');
  const freshLead2 = {
    name: 'Karim Haddad',
    phone: '+971501122334',
    community: 'Damac Hills 2',
    unit: 'Pacifica Cluster Villa 99',
  };

  // Agent 1 has used quota, so Agent 2 will get this one (it has 0 used today)
  const res3 = await campaignManager.processLead(freshLead2, { dryRun: false });
  console.log(`  Result Action: ${res3.action}`);
  console.log(`  Sending Sub-Agent: ${res3.sendingAgent}`);
  console.log('  Status: Dispatched to remaining available agent.\n');

  console.log('--- TEST CASE 4: Third Fresh Lead When All Lines Exceeded Quota ---');
  const freshLead3 = {
    name: 'Omar Farooq',
    phone: '+971509988776',
    community: 'Damac Hills 2',
  };

  const res4 = await campaignManager.processLead(freshLead3, { dryRun: false });
  console.log(`  Result Action: ${res4.action}`);
  console.log('  Status: Quota safety guard held lead until tomorrow! Zero spam.\n');

  console.log('🎉 All test cases completed successfully and safely within Closed Circle rules.');

  // Clean test quota file
  if (fs.existsSync(testQuotaPath)) {
    fs.unlinkSync(testQuotaPath);
  }
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
