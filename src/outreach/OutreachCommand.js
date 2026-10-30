/**
 * Terminal command: `outreach`.
 *
 *   outreach                       usage + projects in the owners sheet
 *   outreach projects              owner count per project
 *   outreach budget                new-conversation budget of the master account
 *   outreach changes [project…]    owners sheet changes since the previous snapshot
 *   outreach link [project]        wa.me link so owners can message the master first
 *   outreach <project…>            plan: existing chat / new today / held, then outputs (asks first)
 *   outreach daily [project…]      daily draft run now: plan + CSV + sheet status + draft campaign
 *   outreach send-today [project…] daily send run now: plan + CSV + sheet status + send today's picks
 *   outreach auto [draft|send <project…> | off]   run one of the two daily modes automatically
 *
 * Projects are names or abbreviations (VARDON, JNP); separate multi-word names with commas.
 * The plan needs the master account CONNECTED (chat list and WhatsApp number checks).
 */

import path from 'path';
import { extractOwners, ownersForProjects, canonicalProject, UNKNOWN_PROJECT } from './OwnerSheetExtractor.js';
import { OwnerSheetSource } from './OwnerSheetSource.js';
import { getNewConversationGuard } from './MasterChatDirectory.js';
import { getNewConversationBudget, localDay } from './NewConversationBudget.js';
import { planOutreach } from './AreaOwnerOutreachPlanner.js';
import { summaryLines, writePlanCsv, draftCampaign, statusByRow, projectLabel } from './OutreachReport.js';
import { OwnerSnapshotStore, diffOwners, compactOwners } from './OwnerSnapshotStore.js';
import { phoneKey } from './OwnerPhoneNormalizer.js';

const USAGE = 'Usage: outreach <project…> | projects | budget | changes | link | daily | send-today | auto  (e.g. outreach VARDON)';

/** Resolves user input to canonical project names; returns { projects, unknown }. */
export function resolveProjects(input, known, aliases = new Map()) {
  const lookup = token => {
    const key = canonicalProject(token);
    if (known.has(key)) return key;
    if (aliases.has(key) && known.has(aliases.get(key))) return aliases.get(key);
    const prefixed = [...known].filter(name => name !== UNKNOWN_PROJECT && name.startsWith(key));
    return prefixed.length === 1 ? prefixed[0] : null;
  };
  const text = String(input || '').trim();
  const pieces = text.includes(',') ? text.split(',') : [text];
  const projects = new Set();
  const unknown = [];
  for (const piece of pieces.map(item => item.trim()).filter(Boolean)) {
    const whole = lookup(piece);
    if (whole) {
      projects.add(whole);
      continue;
    }
    for (const token of piece.split(/\s+/)) {
      const match = lookup(token);
      if (match) projects.add(match);
      else unknown.push(token);
    }
  }
  return { projects: [...projects], unknown };
}

/** Click-to-chat link to the master; chats the owner starts do not use the new-conversation budget. */
export function inboundLink(masterPhone, project = '') {
  const text = project
    ? `Hello, I own a property in ${projectLabel(project)} and would like to discuss renting or selling it.`
    : 'Hello, I would like to discuss my property.';
  return `https://wa.me/${phoneKey(masterPhone)}?text=${encodeURIComponent(text)}`;
}

export default class OutreachCommand {
  constructor({
    accountClients,
    connectionManagers,
    accountConfigManager,
    getWorkspace = null,
    ask = async () => 'no',
    print = console.log,
    source = new OwnerSheetSource(),
    guard = getNewConversationGuard(),
    budget = getNewConversationBudget(),
    cacheMs = 10 * 60 * 1000,
    csvDirectory,
    snapshots,
    daily = null,
    now = () => new Date(),
  }) {
    Object.assign(this, {
      accountClients, connectionManagers, accountConfigManager, getWorkspace, ask, print,
      source, guard, budget, cacheMs, csvDirectory, daily, now,
    });
    this.snapshots = snapshots === undefined
      ? new OwnerSnapshotStore({ directory: path.join(csvDirectory || path.resolve('data', 'outreach'), 'snapshots') })
      : snapshots;
    this.cache = null;
    this.snapshot = null;
  }

  masterPhone() {
    return this.accountConfigManager?.getMasterPhoneNumber?.() || null;
  }

  masterClient() {
    const master = this.masterPhone();
    if (!master) throw new Error('No master account configured.');
    const client = this.accountClients?.get(master);
    if (!client || this.connectionManagers?.get(master)?.state !== 'CONNECTED') {
      throw new Error(`Master ${master} is not connected. Restore it first (master ready), then run outreach again.`);
    }
    return { master, client };
  }

  async loadOwners() {
    if (this.cache && this.now().getTime() - this.cache.at < this.cacheMs) return this.cache;
    this.print('Reading the owners sheet (all tabs)…');
    const workbook = await this.source.readAll();
    const mainTab = this.source.config?.mainTab || 'Sheet1';
    const extracted = extractOwners(workbook.tabs, { mainTab });
    if (!workbook.tabs.some(tab => tab.title === mainTab)) {
      this.print(`⚠️  Main tab "${mainTab}" not found; status write-back is unavailable.`);
    }
    this.cache = {
      at: this.now().getTime(),
      title: workbook.title,
      mainValues: workbook.tabs.find(tab => tab.title === mainTab)?.values || null,
      ...extracted,
    };
    if (this.snapshots) {
      try {
        this.snapshot = this.snapshots.record(extracted.owners, localDay(this.budget.config.timezone, this.now()), {
          title: workbook.title,
        });
        this.print(this.snapshot.summary);
      } catch (error) {
        this.print(`⚠️  Owners snapshot not saved: ${error.message}`);
      }
    }
    return this.cache;
  }

  async run(args = []) {
    const [first = ''] = args;
    const rest = args.slice(1).join(' ');
    switch (first.toLowerCase()) {
      case '':
        this.print(USAGE);
        return this.showProjects();
      case 'projects': return this.showProjects();
      case 'budget': return this.showBudget();
      case 'changes': return this.showChanges(rest);
      case 'link': return this.showLink(rest);
      case 'daily': return this.requireDaily().runNow('draft', rest);
      case 'send-today': return this.requireDaily().runNow('send', rest);
      case 'auto': return this.requireDaily().configure(args.slice(1));
      default: return this.plan(args.join(' '));
    }
  }

  requireDaily() {
    if (!this.daily) throw new Error('Daily outreach is unavailable in this session.');
    return this.daily;
  }

  async showProjects() {
    const { stats, title } = await this.loadOwners();
    const counts = Object.entries(stats.projectCounts).sort((a, b) => b[1] - a[1]);
    this.print(`${title}: ${stats.owners} owners, ${stats.flagged} flagged do-not-contact, ${counts.length} projects`);
    for (let index = 0; index < counts.length; index += 4) {
      this.print(`  ${counts.slice(index, index + 4).map(([name, count]) => `${name} ${count}`).join(' | ')}`);
    }
    return counts;
  }

  showBudget() {
    const master = this.masterPhone();
    if (!master) throw new Error('No master account configured.');
    const usage = this.budget.usage(master, this.now());
    const { timezone, enforce } = this.budget.config;
    this.print(
      `New conversations for ${master} (${timezone}): today ${usage.usedToday}/${usage.dailyLimit}, ` +
      `${usage.month} ${usage.usedMonth}/${usage.monthlyLimit}, available now ${usage.available}` +
      `${enforce ? '' : ' | enforcement OFF (NEW_CONVERSATIONS_ENFORCE=false)'}`,
    );
    const sources = Object.entries(this.budget.sources?.(master, usage.month) || {});
    if (sources.length) this.print(`  This month by source: ${sources.map(([name, count]) => `${name} ${count}`).join(' | ')}`);
    return usage;
  }

  /** Changes since the previous snapshot, optionally limited to projects. */
  async showChanges(input = '') {
    const data = await this.loadOwners();
    const snapshot = this.snapshot;
    if (!snapshot?.previousDay) {
      this.print('No earlier owners snapshot to compare with yet.');
      return null;
    }
    let { diff } = snapshot;
    if (input.trim()) {
      const { projects } = resolveProjects(input, new Set(Object.keys(data.stats.projectCounts)), data.aliases);
      const wanted = new Set(projects);
      const keep = owner => owner.projects.some(name => wanted.has(name));
      diff = diffOwners(
        this.snapshots.read(snapshot.previousDay).filter(keep),
        compactOwners(ownersForProjects(data.owners, projects)),
      );
      this.print(`Changes in ${projects.join(', ') || '(no project)'} since ${snapshot.previousDay}:`);
    } else {
      this.print(snapshot.summary);
    }
    const name = owner => `${owner.name || '(no name)'} | ${owner.projects.join(', ')}`;
    const show = (title, items, describe) => {
      if (!items.length) return;
      this.print(`${title} (${items.length}):`);
      for (const item of items.slice(0, 10)) this.print(`  ${describe(item)}`);
      if (items.length > 10) this.print(`  … ${items.length - 10} more`);
    };
    show('New owners', diff.added, name);
    show('Status changed', diff.statusChanged, item => `${name(item.owner)} | ${item.from || '(blank)'} → ${item.to || '(blank)'}`);
    show('New numbers', diff.numbersAdded, item => `${name(item.owner)} | +${item.numbers.length}`);
    show('Newly do-not-contact', diff.newlyFlagged, name);
    show('Removed', diff.removed, name);
    return diff;
  }

  showLink(input = '') {
    const master = this.masterPhone();
    if (!master) throw new Error('No master account configured.');
    const project = input.trim() ? canonicalProject(input) : '';
    const link = inboundLink(master, project);
    this.print(`Inbound link${project ? ` for ${project}` : ''} (put it in SMS, email, ads or a QR code):`);
    this.print(`  ${link}`);
    this.print('Owners who message the master first do not use the new-conversation budget.');
    return link;
  }

  /**
   * @param {string} input projects
   * @param {{draft?: 'ask'|boolean, writeSheet?: 'ask'|boolean}} options true = do it without asking
   */
  async plan(input, { draft = 'ask', writeSheet = 'ask' } = {}) {
    const { master, client } = this.masterClient();
    const data = await this.loadOwners();
    const known = new Set(Object.keys(data.stats.projectCounts));
    const { projects, unknown } = resolveProjects(input, known, data.aliases);
    if (unknown.length) this.print(`Unknown project(s): ${unknown.join(', ')}. Run "outreach projects" for the list.`);
    if (!projects.length) return null;

    const owners = ownersForProjects(data.owners, projects);
    const directory = this.guard.directoryFor(client);
    this.print(`Checking ${owners.length} owner(s) of ${projects.join(', ')} against the master chat list…`);
    await directory.refresh();
    const plan = await planOutreach({
      owners,
      projects,
      account: master,
      hasChat: digits => directory.has(digits),
      budget: this.budget,
      verifyNumber: async digits => (await client.getNumberId(digits))?._serialized || null,
      now: this.now(),
    });

    this.print('');
    for (const line of summaryLines(plan)) this.print(line);
    plan.csv = writePlanCsv(plan, this.csvDirectory);
    this.print(`Full report (contains phone numbers): ${plan.csv}`);
    if (!this.budget.config.enforce) {
      this.print('⚠️  NEW_CONVERSATIONS_ENFORCE=false: sends are not limited; the plan is advisory only.');
    }

    if (plan.today.length && this.getWorkspace && draft !== false) {
      const answer = draft === true ? 'yes'
        : await this.ask(`Create a draft campaign for today's ${plan.today.length} owner(s)? y/n [n]: `);
      if (answer === 'yes') {
        plan.draft = draftCampaign(plan, await this.getWorkspace());
        this.print(`Draft "${plan.draft.name}" saved. Review and start it from: campaigns`);
      }
    }
    if (data.mainValues && writeSheet !== false) {
      const statuses = statusByRow(plan);
      if (statuses.size) {
        const answer = writeSheet === true ? 'yes'
          : await this.ask(`Write the status of ${statuses.size} Sheet1 row(s) to the "Linda Outreach" column? y/n [n]: `);
        if (answer === 'yes') await this.writeStatuses(statuses);
      }
    }
    return plan;
  }

  /** Writes status text per Sheet1 row (1-based) and keeps the cached copy in step. */
  async writeStatuses(statuses) {
    const values = this.cache?.mainValues;
    if (!values || !statuses.size) return { ok: false, error: 'no Sheet1 rows to update' };
    const result = await this.source.writeStatus(values, statuses);
    if (result.ok) {
      this.print(`Sheet updated: column ${result.column}, ${result.updated} row(s).`);
      const index = result.column.split('').reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      (values[0] ||= [])[index] = 'Linda Outreach';
      for (const [row, text] of statuses) (values[row - 1] ||= [])[index] = text;
    } else {
      this.print(`⚠️  Sheet not updated: ${result.error}`);
    }
    return result;
  }
}
