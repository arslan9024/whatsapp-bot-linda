/**
 * Outputs of an area-owner outreach plan: terminal summary, CSV files,
 * a draft campaign for today's picks, and sheet status text per Sheet1 row.
 */

import fs from 'fs';
import path from 'path';
import { maskPhone } from './OwnerPhoneNormalizer.js';

export const DEFAULT_OUTREACH_TEMPLATE =
  '{greeting}. May I ask if your property is available for rent or sale in {project}?';

const titleCase = text => String(text || '').toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());

/** Human project name for messages, e.g. "VARDON" → "Vardon". */
export function projectLabel(project) {
  return titleCase(project);
}

export function summaryLines(plan, { maxRows = 10 } = {}) {
  const { totals, usage, limits } = plan;
  const lines = [
    `AREA OWNER OUTREACH | ${plan.projects.join(', ')} | account +${plan.account}`,
    `Owners ${totals.owners} | existing chat ${totals.existing} | new ${totals.new} | skipped ${totals.skipped}`,
    `New-conversation budget (${limits.timezone}): today ${usage.usedToday}/${limits.dailyLimit} used, ` +
      `month ${usage.month} ${usage.usedMonth}/${limits.monthlyLimit} used`,
    `Decision: send today ${totals.today} | hold ${totals.waiting} (tomorrow ${plan.tomorrow.length}, later ${plan.later.length})`,
  ];
  if (!totals.today && totals.new) {
    lines.push(usage.available
      ? 'No new owner could be verified on WhatsApp today; all new owners are held.'
      : 'Budget used: no new conversations today. Held owners start tomorrow or next month.');
  }
  if (plan.lastDay) lines.push(`At this budget every new owner is reached by ${plan.lastDay}.`);
  const unscheduled = plan.later.filter(item => !item.day).length;
  if (unscheduled) lines.push(`${unscheduled} owner(s) could not be scheduled (limit is 0 or the horizon is too long).`);
  if (plan.verification.error) {
    lines.push(`WhatsApp number check failed (${plan.verification.error}); today's picks are unverified.`);
  }
  const show = (title, items, describe) => {
    if (!items.length) return;
    lines.push(`${title}:`);
    for (const item of items.slice(0, maxRows)) lines.push(`  ${describe(item)}`);
    if (items.length > maxRows) lines.push(`  … ${items.length - maxRows} more (see CSV)`);
  };
  const who = item => `${item.owner.name || '(no name)'} | ${item.project} | ${maskPhone(item.sendTo || item.owner.bestNumber)}`;
  show('Today', plan.today, item => `${who(item)}${item.verified ? ' | on WhatsApp' : ' | unverified'}`);
  show('Tomorrow', plan.tomorrow, who);
  return lines;
}

const csvCell = value => {
  const text = String(value ?? '');
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
};

const HEADER = ['decision', 'day', 'name', 'project', 'send_to', 'all_numbers', 'property_status', 'sheet_rows', 'detail'];

function csvRow(decision, item) {
  const { owner } = item;
  const detail = item.reason || item.via || (item.verified === undefined ? '' : item.verified ? 'verified' : 'unverified');
  return [
    decision,
    item.day || '',
    owner.name,
    item.project,
    item.sendTo || item.matched || '',
    owner.numbers.map(number => number.digits).join(' '),
    owner.status,
    owner.mainRows.join(' '),
    detail,
  ];
}

/** One CSV with every owner of the plan; contains real numbers, so it stays in the git-ignored data folder. */
export function planCsv(plan) {
  const rows = [
    HEADER,
    ...plan.today.map(item => csvRow('today', item)),
    ...plan.tomorrow.map(item => csvRow('tomorrow', item)),
    ...plan.later.map(item => csvRow('later', item)),
    ...plan.existing.map(item => csvRow('existing', item)),
    ...plan.skipped.map(item => csvRow('skipped', item)),
  ];
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function writePlanCsv(plan, directory = path.resolve('data', 'outreach')) {
  fs.mkdirSync(directory, { recursive: true });
  const slug = plan.projects.join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '_').slice(0, 60) || 'all';
  const file = path.join(directory, `outreach-${slug}-${plan.usage.day}.csv`);
  fs.writeFileSync(file, `\uFEFF${planCsv(plan)}`);
  return file;
}

/** Draft campaign with today's picks; sending still passes the new-conversation guard. */
export function draftCampaign(plan, workspace, {
  template = DEFAULT_OUTREACH_TEMPLATE, intervalMs = 60000, intervalMaxMs = 180000,
} = {}) {
  if (!plan.today.length) throw new Error('No owners are planned for today; nothing to draft.');
  return workspace.saveDraft({
    name: `Outreach ${plan.projects.join(', ')} ${plan.usage.day}`.slice(0, 100),
    template,
    intervalMs,
    intervalMaxMs,
    accountPhone: `+${plan.account}`,
    contacts: plan.today.map(item => ({
      phone: item.sendTo,
      name: item.owner.name,
      group: item.project,
      values: { project: projectLabel(item.project) },
      selected: true,
    })),
  });
}

/** Status text per Sheet1 row (1-based) for the "Linda Outreach" column. */
export function statusByRow(plan) {
  const statuses = new Map();
  const set = (items, text) => {
    for (const item of items) {
      for (const row of item.owner.mainRows) statuses.set(row, text(item));
    }
  };
  const stamp = plan.usage.day;
  set(plan.existing, item => `existing chat (${item.via}) ${stamp}`);
  set(plan.skipped, item => `skipped: ${item.reason} ${stamp}`);
  set(plan.later, item => (item.day ? `planned ${item.day}` : 'held: no slot'));
  set(plan.tomorrow, item => `planned ${item.day}`);
  set(plan.today, () => `new - today ${stamp}`);
  return statuses;
}
