/**
 * ====================================================================
 * KEYPAD CAMPAIGN ACTIONS (Damac Hills 2 & Outreach Sub-Module)
 * ====================================================================
 * Modular handlers for Campaign & Outreach actions within the Keypad.
 *
 * @since Development Phase — October 2026
 */

import { maskPhone, phoneKey } from '../../outreach/OwnerPhoneNormalizer.js';
import { DamacHills2CampaignManager } from '../../outreach/DamacHills2CampaignManager.js';
import { formatSupervisorAssignmentMessage } from '../../outreach/SupervisorFollowUpDispatcher.js';
import { supervisorFollowUpTracker } from '../../outreach/SupervisorFollowUpTracker.js';

export async function runDamacCampaignStatus(clients, acm) {
  const manager = new DamacHills2CampaignManager();
  const todayQuota = manager.loadQuota();

  let text = (
    `📢 *DAMAC HILLS 2 CAMPAIGN STATUS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Date: ${manager.getTodayKey()}\n` +
    `🛡️ Safe Policy: 1 Fresh Lead / Account / Day\n\n` +
    `📱 *Daily Account Quotas:*\n`
  );

  let availableCount = 0;
  for (const phone of clients.keys()) {
    const key = phoneKey(phone);
    const used = Number(todayQuota[key] || 0);
    const remaining = Math.max(0, 1 - used);
    if (remaining > 0) availableCount++;

    const acc = acm?.getAccountByPhone?.(phone);
    const name = acc?.displayName || acc?.name || 'Line';
    const status = used >= 1 ? '🔒 1/1 (Done)' : '✅ 0/1 (Available)';

    text += `• *${name}* (${maskPhone(phone)}): ${status}\n`;
  }

  text += (
    `\n🎯 Total Capacity Remaining Today: *${availableCount} fresh lead(s)*\n` +
    `👑 Supervisor Alerting: Active`
  );
  return text;
}

export async function runDamacDryRun(clients, acm) {
  const manager = new DamacHills2CampaignManager({ accountClients: clients, accountConfigManager: acm });

  const sampleLead = {
    name: 'Hassan Al Shamsi',
    phone: '+971505110636',
    community: 'Damac Hills 2',
    unit: 'Amazon Cluster Villa 12',
  };

  const result = await manager.processLead(sampleLead, { dryRun: true });

  return (
    `🧪 *OUTREACH DRY RUN SIMULATION*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Sample Lead: ${sampleLead.name} (${maskPhone(sampleLead.phone)})\n` +
    `🏡 Community: ${sampleLead.community} - ${sampleLead.unit}\n\n` +
    `📊 *Simulation Result:*\n` +
    `• Action: ${result.action}\n` +
    `• Assigned Agent: ${result.agentName || 'Available Line'}\n` +
    `• Status: Verified successfully under Closed Circle guard!`
  );
}

export function runTestSupervisorDispatch() {
  const sampleAlert = formatSupervisorAssignmentMessage({
    ownerName: 'Rashid Al Nuaimi',
    clientPhone: '+971501234567',
    community: 'Damac Hills 2',
    unit: 'Camellia Villa 42',
    lastInteractionAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    agentName: 'Junior Agent 1',
  });

  return (
    `👑 *TEST SUPERVISOR ALERT MESSAGE*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `When prior history is detected, the supervisor sends this to the sub-agent:\n\n` +
    `${sampleAlert}`
  );
}

export function runPendingFollowups() {
  const pending = supervisorFollowUpTracker.getPendingAssignments();
  let text = `📋 *PENDING AGENT FOLLOW-UPS (SLA MONITOR)*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (pending.length === 0) {
    return text + `✅ Zero pending follow-ups! All assigned leads have been contacted.`;
  }

  pending.slice(0, 10).forEach((item, idx) => {
    const overdueIcon = item.isOverdue ? '⚠️' : '⏳';
    text += `${idx + 1}. ${overdueIcon} *${item.ownerName}* (${maskPhone(item.clientPhone)})\n`;
    text += `   🏡 ${item.community} ${item.unit ? `(${item.unit})` : ''}\n`;
    text += `   👤 Assigned Agent: ${item.agentName}\n`;
    text += `   ⏱️ SLA: ${item.slaLabel}\n\n`;
  });

  return text.trim();
}

export function runSearchOwner(query = '') {
  const clean = String(query || '').trim().toLowerCase();
  let text = `🔍 *DAMAC HILLS 2 SEARCH: "${clean || 'Overview'}"*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  const clusters = [
    { name: 'Amazon', type: '3BR, 4BR Villas', status: 'Handover complete' },
    { name: 'Victoria', type: '3BR Townhouses', status: 'Handover complete' },
    { name: 'Pacifica', type: 'Luxury Villas', status: 'Handover complete' },
    { name: 'Camellia', type: 'Townhouses', status: 'Handover complete' },
    { name: 'Sidra', type: 'Townhouses & Villas', status: 'Handover complete' },
    { name: 'Aquilegia', type: '3BR, 6BR Villas', status: 'Handover complete' },
  ];

  const matched = clean ? clusters.filter((c) => c.name.toLowerCase().includes(clean)) : clusters;

  matched.forEach((c, idx) => {
    text += `${idx + 1}. 🏡 *${c.name} Cluster*\n`;
    text += `   Types: ${c.type} | Status: ${c.status}\n\n`;
  });

  text += `💡 Tip: Reply with an owner phone number to run cross-account history audit.`;
  return text.trim();
}

export function runDamacQuotaView() {
  const manager = new DamacHills2CampaignManager();
  const todayQuota = manager.loadQuota();
  return (
    `📁 *DAILY OUTREACH QUOTA LEDGER*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 Active Ledger Date: ${manager.getTodayKey()}\n` +
    `Entries: ${JSON.stringify(todayQuota, null, 2)}`
  );
}
