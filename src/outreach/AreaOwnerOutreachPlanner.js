/**
 * Area owner outreach planner.
 *
 * For the owners of the selected project(s): who already has a chat with the
 * account, who is new, who is skipped, which new owners can be messaged
 * today under the new-conversation budget, and the estimated day for every
 * owner that has to wait.
 */

import { localDay, nextLocalDayStart } from './NewConversationBudget.js';
import { phoneKey } from './OwnerPhoneNormalizer.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Priority: available/vacant property status first, then Sheet1 owners, then sheet order. */
export function sortNewItems(items) {
  return [...items].sort(({ owner: a }, { owner: b }) =>
    a.statusRank - b.statusRank || Number(b.inMain) - Number(a.inMain) || a.order - b.order);
}

/** Assigns each owner a local day: `perDay` per day and `monthlyLimit` per calendar month. */
export function scheduleDays(owners, { startAt, timezone, dailyLimit, monthlyLimit, usedInStartMonth = 0, maxDays = 3660 }) {
  const schedule = [];
  if (!owners.length) return schedule;
  if (dailyLimit <= 0 || monthlyLimit <= 0) return owners.map(owner => ({ owner, day: null }));
  let at = startAt;
  let month = localDay(timezone, at).slice(0, 7);
  let usedMonth = usedInStartMonth;
  let index = 0;
  for (let step = 0; step < maxDays && index < owners.length; step += 1) {
    const day = localDay(timezone, at);
    if (day.slice(0, 7) !== month) {
      month = day.slice(0, 7);
      usedMonth = 0;
    }
    const capacity = Math.min(dailyLimit, monthlyLimit - usedMonth);
    for (let slot = 0; slot < capacity && index < owners.length; slot += 1) {
      schedule.push({ owner: owners[index], day });
      index += 1;
      usedMonth += 1;
    }
    at = new Date(at.getTime() + DAY_MS);
  }
  while (index < owners.length) schedule.push({ owner: owners[index++], day: null });
  return schedule;
}

/**
 * @param {object} options
 * @param {object[]} options.owners owners already filtered to the selected projects
 * @param {string[]} options.projects selected canonical project names
 * @param {string} options.account sending account phone
 * @param {(digits: string) => Promise<boolean>} options.hasChat existing-chat check
 * @param {import('./NewConversationBudget.js').NewConversationBudget} options.budget
 * @param {(digits: string) => Promise<string|null>} [options.verifyNumber] WhatsApp id user for a registered number, null if not on WhatsApp
 * @param {number} [options.verifyLimit] maximum lookups per run
 * @param {boolean} [options.skipFlagged]
 */
export async function planOutreach({
  owners, projects, account, hasChat, budget, verifyNumber = null, verifyLimit = 20, skipFlagged = true,
  now = budget.now(),
}) {
  const { timezone, dailyLimit, monthlyLimit } = budget.config;
  const existing = [];
  const skipped = [];
  const fresh = [];

  for (const owner of owners) {
    const project = owner.projects.find(name => projects.includes(name)) || owner.projects[0];
    const item = { owner, project };
    if (skipFlagged && owner.flagged) {
      skipped.push({ ...item, reason: `do-not-contact: ${owner.flagReason}` });
      continue;
    }
    const startedByLinda = owner.numbers.find(number => budget.has(account, number.digits));
    if (startedByLinda) {
      existing.push({ ...item, matched: startedByLinda.digits, via: 'started by Linda' });
      continue;
    }
    let matched = null;
    for (const number of owner.numbers) {
      if (await hasChat(number.digits)) {
        matched = number.digits;
        break;
      }
    }
    if (matched) existing.push({ ...item, matched, via: 'WhatsApp chat' });
    else fresh.push(item);
  }

  const usage = budget.usage(account, now);
  const ordered = sortNewItems(fresh);
  const today = [];
  const waiting = [];
  let lookups = 0;
  let verifyError = null;

  for (const item of ordered) {
    if (today.length >= usage.available) {
      waiting.push(item);
      continue;
    }
    if (!verifyNumber || verifyError) {
      today.push({ ...item, sendTo: item.owner.bestNumber, verified: false });
      continue;
    }
    let sendTo = null;
    let checkedAll = true;
    for (const number of item.owner.numbers) {
      if (lookups >= verifyLimit) {
        checkedAll = false;
        break;
      }
      lookups += 1;
      try {
        const wid = await verifyNumber(number.digits);
        if (wid) {
          sendTo = phoneKey(wid);
          break;
        }
      } catch (error) {
        verifyError = error.message;
        break;
      }
    }
    if (sendTo) today.push({ ...item, sendTo, verified: true });
    else if (verifyError) today.push({ ...item, sendTo: item.owner.bestNumber, verified: false });
    else if (checkedAll) skipped.push({ ...item, reason: 'not on WhatsApp' });
    else waiting.push(item);
  }

  const tomorrowStart = nextLocalDayStart(timezone, now);
  const tomorrowDay = localDay(timezone, tomorrowStart);
  const sameMonth = tomorrowDay.slice(0, 7) === usage.month;
  const schedule = scheduleDays(waiting, {
    startAt: tomorrowStart, timezone, dailyLimit, monthlyLimit,
    usedInStartMonth: sameMonth ? usage.usedMonth + today.length : 0,
  }).map(({ owner: item, day }) => ({ ...item, sendTo: item.owner.bestNumber, day }));

  return {
    generatedAt: now.toISOString(),
    account: phoneKey(account),
    projects,
    usage,
    limits: { dailyLimit, monthlyLimit, timezone },
    today: today.map(item => ({ ...item, day: usage.day })),
    tomorrow: schedule.filter(item => item.day === tomorrowDay),
    later: schedule.filter(item => item.day !== tomorrowDay),
    existing,
    skipped,
    verification: { lookups, limit: verifyLimit, error: verifyError },
    lastDay: schedule.length ? schedule[schedule.length - 1].day : (today.length ? usage.day : null),
    totals: {
      owners: owners.length, existing: existing.length, new: fresh.length,
      skipped: skipped.length, today: today.length, waiting: schedule.length,
    },
  };
}
