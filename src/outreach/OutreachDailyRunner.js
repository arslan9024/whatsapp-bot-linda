/**
 * Daily area-owner outreach, in two separate modes:
 *
 *   draft  plan + CSV + sheet status + draft campaign for today's picks (you start it from: campaigns)
 *   send   plan + CSV + sheet status + send today's verified picks from the master, spaced out
 *
 * Both run inside working hours only (WORK_HOURS_*, default 09:00-20:00 Asia/Dubai)
 * and every send passes the new-conversation guard (2/day, 30/month by default).
 *
 * Automatic mode (`outreach auto draft|send <projects>`) runs once per local day:
 * the first check inside working hours restores the master from its saved session
 * if it is offline (same as `master ready`), then runs the chosen mode.
 * Settings are kept in data/outreach/daily.json (git-ignored).
 */

import fs from 'fs';
import path from 'path';
import { isWithinWorkingHours, msUntilWorkingHours, describeWorkingHours, workingHoursConfig } from '../campaigns/WorkingHours.js';
import { timeOfDayGreeting } from '../campaigns/CampaignWorkspace.js';
import { DEFAULT_OUTREACH_TEMPLATE, projectLabel } from './OutreachReport.js';
import { localDay } from './NewConversationBudget.js';
import { maskPhone, phoneKey } from './OwnerPhoneNormalizer.js';

const MODES = ['draft', 'send'];
const MINUTE = 60 * 1000;

export function dailyDefaults(env = process.env) {
  const mode = String(env.OUTREACH_DAILY_MODE || 'draft').toLowerCase();
  return {
    enabled: /^(1|true|yes|on)$/i.test(String(env.OUTREACH_DAILY_ENABLED || '')),
    mode: MODES.includes(mode) ? mode : 'draft',
    projects: String(env.OUTREACH_DAILY_PROJECTS || '').trim(),
    template: env.OUTREACH_TEMPLATE || DEFAULT_OUTREACH_TEMPLATE,
    gapMinMs: Math.max(0, Number(env.OUTREACH_SEND_GAP_MIN_MINUTES ?? 3)) * MINUTE,
    gapMaxMs: Math.max(0, Number(env.OUTREACH_SEND_GAP_MAX_MINUTES ?? 8)) * MINUTE,
  };
}

export function renderOutreachMessage(template, item, { now = new Date(), timezone } = {}) {
  return template
    .replace(/\{greeting\}/g, timeOfDayGreeting(now, timezone))
    .replace(/\{project\}/g, projectLabel(item.project))
    .replace(/\{name\}/g, String(item.owner?.name || '').trim() || 'Sir/Madam');
}

export default class OutreachDailyRunner {
  constructor({
    command,
    ensureMaster = null,
    file = path.resolve('data', 'outreach', 'daily.json'),
    defaults = dailyDefaults(),
    hours = workingHoursConfig(),
    print = console.log,
    notify = null,
    now = () => new Date(),
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    random = Math.random,
    tickMs = 5 * MINUTE,
    retryMs = 30 * MINUTE,
    maxAttemptsPerDay = 4,
  }) {
    Object.assign(this, {
      command, ensureMaster, file, defaults, hours, print, notify, now, sleep, random,
      tickMs, retryMs, maxAttemptsPerDay,
    });
    this.state = null;
    this.running = null;
    this.timer = null;
    this.attempts = { day: null, count: 0, nextAt: 0 };
  }

  today() {
    return localDay(this.command.budget.config.timezone, this.now());
  }

  load() {
    if (this.state) return this.state;
    let saved = {};
    try {
      saved = JSON.parse(fs.readFileSync(this.file, 'utf8')) || {};
    } catch (error) {
      if (error.code !== 'ENOENT') this.print(`⚠️  ${this.file} is unreadable (${error.message}); using defaults.`);
    }
    const { enabled, mode, projects } = this.defaults;
    this.state = { enabled, mode, projects, lastRun: null, ...saved };
    return this.state;
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(this.state, null, 2)}\n`);
    fs.renameSync(temp, this.file);
  }

  describe() {
    const state = this.load();
    const last = state.lastRun
      ? `last run ${state.lastRun.day} (${state.lastRun.mode}: ${state.lastRun.result})`
      : 'not run yet';
    const status = state.enabled && state.projects
      ? `ON | mode ${state.mode} | projects ${state.projects}`
      : 'OFF';
    return `Daily outreach: ${status} | working hours ${describeWorkingHours(this.hours)} | ${last}`;
  }

  /** `outreach auto` | `outreach auto off` | `outreach auto draft|send <projects>` */
  configure(args = []) {
    const state = this.load();
    const [action = '', ...rest] = args;
    const choice = action.toLowerCase();
    if (choice === 'off') {
      state.enabled = false;
      this.save();
    } else if (MODES.includes(choice)) {
      const projects = rest.join(' ').trim() || state.projects;
      if (!projects) throw new Error(`Usage: outreach auto ${choice} <project…>  (e.g. outreach auto ${choice} VARDON)`);
      Object.assign(state, { enabled: true, mode: choice, projects });
      this.save();
      this.attempts = { day: null, count: 0, nextAt: 0 };
      setTimeout(() => this.tick(), 1000).unref?.();
    } else if (choice && choice !== 'status') {
      throw new Error('Usage: outreach auto [status] | outreach auto draft <project…> | outreach auto send <project…> | outreach auto off');
    }
    this.print(this.describe());
    if (state.enabled && state.mode === 'send') {
      this.print('Send mode messages today\'s verified owners automatically (within the new-conversation limit).');
    }
    return { ...state };
  }

  /** Manual run of one mode now (terminal: outreach daily | outreach send-today). */
  async runNow(mode, projectsInput = '') {
    const projects = projectsInput.trim() || this.load().projects;
    if (!projects) {
      throw new Error(`Usage: outreach ${mode === 'send' ? 'send-today' : 'daily'} <project…>  (or set a project with outreach auto)`);
    }
    return this.run(mode, projects, { manual: true });
  }

  async run(mode, projects, { manual = false } = {}) {
    if (this.running || this.sending) throw new Error('A daily outreach run is already in progress.');
    if (!isWithinWorkingHours(this.hours, this.now())) {
      const minutes = Math.ceil(msUntilWorkingHours(this.hours, this.now()) / MINUTE);
      throw new Error(`Outside working hours (${describeWorkingHours(this.hours)}); next window in ${minutes} min.`);
    }
    const day = this.today();
    this.print(`\n${manual ? '' : '⏰ '}Daily outreach (${mode}) for ${projects}, ${day}`);
    this.running = (async () => {
      const plan = await this.command.plan(projects, { draft: mode === 'draft', writeSheet: true });
      if (!plan) throw new Error(`No known project in "${projects}".`);
      const record = {
        day, mode, projects: plan.projects.join(', '), at: this.now().toISOString(),
        today: plan.totals.today, held: plan.totals.waiting, existing: plan.totals.existing,
        csv: plan.csv, draft: plan.draft?.name || null,
      };
      if (mode === 'send') {
        record.sending = plan.today.filter(item => item.verified).length;
        // Sends are spaced minutes apart; run them in the background so the terminal stays free.
        this.sending = this.sendPlanned(plan)
          .then(result => {
            Object.assign(record, result, { result: `sent ${result.sent}, not sent ${result.notSent}` });
            this.finish(record);
          })
          .catch(error => {
            Object.assign(record, { result: `send failed: ${error.message}` });
            this.finish(record);
          })
          .finally(() => {
            this.sending = null;
          });
        record.result = `sending ${record.sending}`;
      } else {
        record.result = plan.draft ? `draft "${plan.draft.name}"` : `no draft (today ${plan.totals.today})`;
      }
      this.finish(record);
      return plan;
    })();
    try {
      return await this.running;
    } finally {
      this.running = null;
    }
  }

  finish(record) {
    const state = this.load();
    state.lastRun = record;
    this.save();
    this.notify?.(`Outreach ${record.mode} ${record.projects}: ${record.result}`);
  }

  /** Sends today's verified picks through the new-conversation guard, inside working hours. */
  async sendPlanned(plan) {
    const { master, client } = this.command.masterClient();
    const { template, gapMinMs, gapMaxMs } = this.defaults;
    const timezone = this.hours.timezone;
    const picks = plan.today.filter(item => item.verified);
    const unverified = plan.today.length - picks.length;
    if (unverified) this.print(`${unverified} unverified owner(s) are left for a manual check.`);
    const sent = [];
    const notSent = plan.today.filter(item => !item.verified).map(item => ({ item, reason: 'unverified' }));
    const stop = (index, reason) => {
      for (const item of picks.slice(index)) notSent.push({ item, reason });
      this.print(`Stopped: ${reason}.`);
    };
    for (const [index, item] of picks.entries()) {
      if (index > 0) {
        const gap = gapMinMs + Math.floor(this.random() * Math.max(0, gapMaxMs - gapMinMs));
        this.print(`Next outreach message in ${Math.round(gap / 1000)} s…`);
        await this.sleep(gap);
      }
      const who = `${item.owner.name || '(no name)'} ${maskPhone(item.sendTo)}`;
      if (!isWithinWorkingHours(this.hours, this.now())) {
        stop(index, `outside working hours (${describeWorkingHours(this.hours)})`);
        break;
      }
      const allowance = await this.command.guard.reserve({
        account: master, client, phone: item.sendTo, source: 'outreach-daily',
      });
      if (!allowance.allowed) {
        stop(index, allowance.reason);
        break;
      }
      try {
        const text = renderOutreachMessage(template, item, { now: this.now(), timezone });
        await client.sendMessage(`${phoneKey(item.sendTo)}@c.us`, text);
        sent.push(item);
        this.print(`✅ Outreach sent to ${who} (${item.project}).`);
      } catch (error) {
        notSent.push({ item, reason: error.message });
        this.print(`❌ Outreach to ${who} failed: ${error.message}`);
      }
    }
    const day = this.today();
    const statuses = new Map();
    for (const item of sent) for (const row of item.owner.mainRows) statuses.set(row, `sent ${day}`);
    for (const { item, reason } of notSent) {
      for (const row of item.owner.mainRows) statuses.set(row, `not sent ${day}: ${reason}`.slice(0, 120));
    }
    if (statuses.size) {
      try {
        await this.command.writeStatuses(statuses);
      } catch (error) {
        this.print(`⚠️  Sheet not updated: ${error.message}`);
      }
    }
    return { sent: sent.length, notSent: notSent.length };
  }

  /** Automatic check: once per day, inside working hours, after the master is online. */
  async tick() {
    const state = this.load();
    if (!state.enabled || !state.projects || this.running || this.sending) return null;
    const day = this.today();
    if (state.lastRun?.day === day && state.lastRun?.mode === state.mode) return null;
    if (!isWithinWorkingHours(this.hours, this.now())) return null;
    if (this.attempts.day !== day) this.attempts = { day, count: 0, nextAt: 0 };
    if (this.attempts.count >= this.maxAttemptsPerDay || this.now().getTime() < this.attempts.nextAt) return null;
    this.attempts.count += 1;
    this.attempts.nextAt = this.now().getTime() + this.retryMs;
    try {
      try {
        this.command.masterClient();
      } catch {
        if (!this.ensureMaster) throw new Error('master is offline');
        this.print('Daily outreach: master is offline; restoring the saved session (master ready)…');
        const ready = await this.ensureMaster();
        if (ready === false) throw new Error('master is not ready');
      }
      return await this.run(state.mode, state.projects);
    } catch (error) {
      const left = this.maxAttemptsPerDay - this.attempts.count;
      const message = `Daily outreach not run: ${error.message}.${left > 0 ? ` Retrying in ${Math.round(this.retryMs / MINUTE)} min.` : ' No more attempts today.'}`;
      this.print(message);
      this.notify?.(message);
      return null;
    }
  }

  start() {
    if (this.timer) return this;
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.timer.unref?.();
    setTimeout(() => this.tick(), 60 * 1000).unref?.();
    return this;
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
}
