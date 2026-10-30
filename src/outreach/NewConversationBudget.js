/**
 * New-conversation budget: how many people the account may message for the
 * first time (no existing WhatsApp chat) per local day and per calendar month.
 *
 * The ledger is a local JSON file. A recipient is counted once per account,
 * ever; a reservation is kept even if the send later fails (conservative).
 * Reservations are synchronous, so check + record cannot interleave inside
 * the single Linda process.
 */

import fs from 'fs';
import path from 'path';
import { phoneKey } from './OwnerPhoneNormalizer.js';

const DEFAULT_FILE = path.join(process.cwd(), 'data', 'outreach', 'new-conversations.json');

function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function validTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function newConversationConfig(env = process.env) {
  const timezone = [env.NEW_CONVERSATIONS_TIMEZONE, env.WORK_HOURS_TIMEZONE, 'Asia/Dubai']
    .find(zone => zone && validTimezone(zone));
  return {
    monthlyLimit: positiveInt(env.NEW_CONVERSATIONS_MONTHLY_LIMIT, 30),
    dailyLimit: positiveInt(env.NEW_CONVERSATIONS_DAILY_LIMIT, 2),
    timezone,
    enforce: !/^(0|false|no|off)$/i.test(String(env.NEW_CONVERSATIONS_ENFORCE ?? 'true')),
  };
}

/** Local calendar parts and the UTC offset (ms) of `date` in `timezone`. */
export function zonedParts(timezone, date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return { ...parts, offsetMs: asUtc - Math.floor(date.getTime() / 1000) * 1000 };
}

const pad = value => String(value).padStart(2, '0');

export function localDay(timezone, date) {
  const p = zonedParts(timezone, date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function localMonth(timezone, date) {
  return localDay(timezone, date).slice(0, 7);
}

/** Start of the next local day (offset taken at `date`; exact for fixed-offset zones such as Asia/Dubai). */
export function nextLocalDayStart(timezone, date) {
  const p = zonedParts(timezone, date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + 1) - p.offsetMs);
}

export function nextLocalMonthStart(timezone, date) {
  const p = zonedParts(timezone, date);
  return new Date(Date.UTC(p.year, p.month, 1) - p.offsetMs);
}

export class NewConversationBudget {
  constructor({ file = DEFAULT_FILE, config = newConversationConfig(), now = () => new Date() } = {}) {
    this.file = file;
    this.config = config;
    this.now = now;
    this.entries = null;
  }

  load() {
    if (this.entries) return this.entries;
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.entries = Array.isArray(data?.entries) ? data.entries.filter(entry => entry?.account && entry?.phone) : [];
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`New-conversation ledger is unreadable (${this.file}): ${error.message}`);
      this.entries = [];
    }
    return this.entries;
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify({ version: 1, entries: this.entries }, null, 2)}\n`);
    fs.renameSync(temp, this.file);
  }

  has(account, phone) {
    const a = phoneKey(account);
    const p = phoneKey(phone);
    return this.load().some(entry => entry.account === a && entry.phone === p);
  }

  usage(account, at = this.now()) {
    const { timezone, dailyLimit, monthlyLimit } = this.config;
    const a = phoneKey(account);
    const day = localDay(timezone, at);
    const month = day.slice(0, 7);
    const mine = this.load().filter(entry => entry.account === a);
    const usedToday = mine.filter(entry => entry.day === day).length;
    const usedMonth = mine.filter(entry => entry.month === month).length;
    const dailyRemaining = Math.max(0, dailyLimit - usedToday);
    const monthlyRemaining = Math.max(0, monthlyLimit - usedMonth);
    return {
      day, month, usedToday, usedMonth, dailyLimit, monthlyLimit, dailyRemaining, monthlyRemaining,
      available: Math.min(dailyRemaining, monthlyRemaining),
    };
  }

  /** When the next slot opens after the budget is exhausted at `at`. */
  retryAt(account, at = this.now()) {
    const usage = this.usage(account, at);
    if (usage.available > 0) return at;
    return usage.monthlyRemaining === 0
      ? nextLocalMonthStart(this.config.timezone, at)
      : nextLocalDayStart(this.config.timezone, at);
  }

  /**
   * Records `phone` as a new conversation if the budget allows.
   * @returns {{allowed: true, counted: boolean} | {allowed: false, reason: string, retryAt: Date, usage: object}}
   */
  reserve({ account, phone, source = 'unknown' }) {
    const a = phoneKey(account);
    const p = phoneKey(phone);
    if (!a || !p) throw new Error('reserve requires account and phone');
    if (this.has(a, p)) return { allowed: true, counted: false };
    const at = this.now();
    const usage = this.usage(a, at);
    if (usage.available <= 0) {
      const reason = usage.monthlyRemaining <= 0
        ? `monthly new-conversation limit reached (${usage.usedMonth}/${usage.monthlyLimit} in ${usage.month})`
        : `daily new-conversation limit reached (${usage.usedToday}/${usage.dailyLimit} on ${usage.day})`;
      return { allowed: false, reason, retryAt: this.retryAt(a, at), usage };
    }
    this.entries.push({ account: a, phone: p, at: at.toISOString(), day: usage.day, month: usage.month, source });
    this.save();
    return { allowed: true, counted: true };
  }

  /**
   * Records a new conversation that already happened outside Linda (started on the phone).
   * It counts toward the budget but is never refused, because the message was already sent.
   */
  recordExternal({ account, phone, source = 'phone', at = this.now() }) {
    const a = phoneKey(account);
    const p = phoneKey(phone);
    if (!a || !p) throw new Error('recordExternal requires account and phone');
    if (this.has(a, p)) return { counted: false };
    const day = localDay(this.config.timezone, at);
    this.entries.push({ account: a, phone: p, at: at.toISOString(), day, month: day.slice(0, 7), source });
    this.save();
    return { counted: true, usage: this.usage(a, at) };
  }

  /** Ledger entries of `account` in `month` (YYYY-MM), grouped by source. */
  sources(account, month = localMonth(this.config.timezone, this.now())) {
    const a = phoneKey(account);
    const counts = {};
    for (const entry of this.load()) {
      if (entry.account === a && entry.month === month) counts[entry.source] = (counts[entry.source] || 0) + 1;
    }
    return counts;
  }
}

let shared = null;
export function getNewConversationBudget() {
  shared ||= new NewConversationBudget();
  return shared;
}
