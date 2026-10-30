/**
 * Turns the owners workbook (all tabs as 2-D value arrays) into deduplicated
 * owners with their projects, valid mobile numbers and contact flags.
 *
 * Owners are the connected components of "numbers that appear on the same
 * row" (union-find), so one person listed in Sheet1 and in cluster tabs, or
 * with a primary and a secondary mobile, is one owner.
 */

import { DO_NOT_CONTACT, normalizeOwnerPhone } from './OwnerPhoneNormalizer.js';

export const UNKNOWN_PROJECT = 'UNKNOWN';
export const DEFAULT_SKIP_TABS = ['D2Magic', 'Contracts', 'Agents Deals', 'ProjectsInD2', 'PropertyStatus', 'LayoutsInD2', 'TempCheck'];

const ROLE_RANK = { mobile: 0, secondary: 1, phone: 2, cell: 3 };
const STATUS_RANK = [
  [/available/i, 0],
  [/^\s*vacant/i, 1],
  [/looks\s*vacant/i, 2],
  [/rented|occupied/i, 4],
];

/** "Vardon @ Akoya Oxygen" → "VARDON"; "DAMAC HILLS (2) - CAMELIA" → "CAMELIA"; "." / "0" / "" → UNKNOWN. */
export function canonicalProject(value) {
  let text = String(value ?? '').split('@')[0].trim().toUpperCase().replace(/\s+/g, ' ');
  if (text.includes(' - ')) text = text.split(' - ').pop().trim();
  return /[A-Z]/.test(text) ? text : UNKNOWN_PROJECT;
}

export function statusRank(status) {
  const text = String(status ?? '');
  if (!text.trim()) return 3;
  const match = STATUS_RANK.find(([pattern]) => pattern.test(text));
  return match ? match[1] : 3;
}

/** Project names and abbreviations from a "Project | Code | Abbreviate" tab (ProjectsInD2). */
export function projectAliases(tabs) {
  const aliases = new Map();
  const isProjectTable = tab => /^project$/i.test(String(tab.values?.[0]?.[0] ?? '').trim()) && tab.values.length > 1;
  const abbreviationColumn = tab => (tab.values?.[0] || []).findIndex(cell => /^abbreviat/i.test(String(cell ?? '').trim()));
  const table = tabs.find(tab => isProjectTable(tab) && abbreviationColumn(tab) >= 0) ||
    tabs.find(tab => /^projectsind2$/i.test(String(tab.title ?? '').trim()) && isProjectTable(tab));
  const column = table ? abbreviationColumn(table) : -1;
  for (const row of table?.values?.slice(1) || []) {
    const project = canonicalProject(row[0]);
    if (project === UNKNOWN_PROJECT) continue;
    aliases.set(project, project);
    const alias = column >= 0 ? row[column] : row[2];
    if (alias) aliases.set(String(alias).trim().toUpperCase(), project);
  }
  return aliases;
}

/** Project for a cluster tab title, e.g. "JNP ALL" → JUNIPER, "R2-M Zinnia" → ZINNIA; otherwise UNKNOWN. */
export function projectForTab(title, aliases) {
  const tokens = String(title).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  for (const token of tokens) if (aliases.has(token)) return aliases.get(token);
  return UNKNOWN_PROJECT;
}

function headerIndex(header) {
  const names = header.map(cell => String(cell ?? '').trim().toLowerCase().replace(/\s+/g, ' '));
  const find = (...patterns) => names.findIndex(name => patterns.some(pattern => pattern.test(name)));
  return {
    project: find(/^project$/),
    name: find(/^name$/, /^nameen$/, /^owner name$/),
    phone: find(/^phone$/),
    mobile: find(/^mobile$/),
    secondary: find(/^secondary mobile$/),
    status: find(/^propertystatus$/, /^property status$/),
    responses: find(/^responses status$/, /^response status$/),
    plot: find(/^plot number$/),
    pNumber: find(/^p-number$/),
  };
}

const cellAt = (row, index) => (index >= 0 ? String(row[index] ?? '').trim() : '');

function numbersFrom(entries, rejected) {
  const numbers = [];
  for (const [raw, role] of entries) {
    if (!String(raw ?? '').trim()) continue;
    const result = normalizeOwnerPhone(raw);
    if (result.ok) {
      if (!numbers.some(number => number.digits === result.digits)) numbers.push({ digits: result.digits, role, country: result.country });
    } else if (result.reason !== 'empty') {
      rejected[result.reason] = (rejected[result.reason] || 0) + 1;
    }
  }
  return numbers;
}

/** Rows of one tab → records `{ tab, row, main, project, name, status, responses, numbers }`. */
export function recordsFromTab(tab, { main = false, aliases = new Map(), rejected = {} } = {}) {
  const values = tab.values || [];
  if (!values.length) return [];
  const header = headerIndex(values[0]);
  const structured = header.mobile >= 0 && (header.name >= 0 || header.project >= 0);
  const tabProject = main ? UNKNOWN_PROJECT : projectForTab(tab.title, aliases);
  const records = [];
  values.forEach((row, index) => {
    if (structured && index === 0) return;
    if (!Array.isArray(row) || !row.length) return;
    const project = structured && header.project >= 0 ? canonicalProject(row[header.project]) : UNKNOWN_PROJECT;
    const base = {
      tab: tab.title,
      row: index + 1,
      main,
      project: project === UNKNOWN_PROJECT ? tabProject : project,
      name: cellAt(row, header.name).replace(/\s+/g, ' '),
      status: cellAt(row, header.status),
      responses: cellAt(row, header.responses),
    };
    if (!structured) {
      // Headerless tabs often hold separate lists side by side; each cell is its own contact.
      for (const number of numbersFrom(row.map(cell => [cell, 'cell']), rejected)) records.push({ ...base, numbers: [number] });
      return;
    }
    const entries = [[cellAt(row, header.mobile), 'mobile'], [cellAt(row, header.secondary), 'secondary'], [cellAt(row, header.phone), 'phone']];
    records.push({ ...base, numbers: numbersFrom(entries, rejected) });
  });
  return records;
}

class UnionFind {
  constructor() { this.parent = new Map(); }
  find(key) {
    if (!this.parent.has(key)) this.parent.set(key, key);
    let root = key;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    while (this.parent.get(key) !== root) {
      const next = this.parent.get(key);
      this.parent.set(key, root);
      key = next;
    }
    return root;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

/**
 * @param {Array<{title: string, values: any[][]}>} tabs
 * @returns {{ owners: object[], stats: object, aliases: Map<string,string> }}
 */
export function extractOwners(tabs, { mainTab = 'Sheet1', skipTabs = DEFAULT_SKIP_TABS } = {}) {
  const skip = new Set(skipTabs.map(name => name.trim().toLowerCase()));
  const aliases = projectAliases(tabs);
  const rejected = {};
  const records = [];
  for (const tab of tabs) {
    const title = String(tab.title ?? '').trim();
    const main = title.toLowerCase() === mainTab.toLowerCase();
    if (!main && skip.has(title.toLowerCase())) continue;
    records.push(...recordsFromTab(tab, { main, aliases, rejected }));
  }

  const uf = new UnionFind();
  for (const record of records) {
    record.numbers.forEach(number => uf.find(number.digits));
    for (let i = 1; i < record.numbers.length; i += 1) uf.union(record.numbers[0].digits, record.numbers[i].digits);
  }

  const groups = new Map();
  let rowsWithoutNumber = 0;
  records.forEach((record, order) => {
    if (!record.numbers.length) {
      if (record.main) rowsWithoutNumber += 1;
      return;
    }
    const root = uf.find(record.numbers[0].digits);
    if (!groups.has(root)) groups.set(root, { records: [], order });
    groups.get(root).records.push(record);
  });

  const owners = [...groups.values()].map(({ records: list, order }) => {
    const numbers = new Map();
    for (const record of list) {
      for (const number of record.numbers) {
        const rank = (record.main ? 0 : 10) + ROLE_RANK[number.role];
        const existing = numbers.get(number.digits);
        if (!existing || rank < existing.rank) numbers.set(number.digits, { ...number, rank });
      }
    }
    const sortedNumbers = [...numbers.values()].sort((a, b) => a.rank - b.rank).map(({ rank, ...number }) => number);
    const projects = [...new Set(list.map(record => record.project).filter(project => project !== UNKNOWN_PROJECT))];
    const flagRecord = list.find(record => DO_NOT_CONTACT.test(record.responses));
    const named = list.find(record => record.main && record.name) || list.find(record => record.name);
    const status = list.map(record => record.status).filter(Boolean).sort((a, b) => statusRank(a) - statusRank(b))[0] || '';
    return {
      key: sortedNumbers[0].digits,
      name: named?.name || '',
      numbers: sortedNumbers,
      bestNumber: sortedNumbers[0].digits,
      projects: projects.length ? projects : [UNKNOWN_PROJECT],
      status,
      statusRank: statusRank(status),
      inMain: list.some(record => record.main),
      mainRows: [...new Set(list.filter(record => record.main).map(record => record.row))].sort((a, b) => a - b),
      flagged: Boolean(flagRecord),
      flagReason: flagRecord ? flagRecord.responses.slice(0, 80) : '',
      order,
    };
  });

  const projectCounts = {};
  for (const owner of owners) for (const project of owner.projects) projectCounts[project] = (projectCounts[project] || 0) + 1;
  return {
    owners,
    aliases,
    stats: {
      tabs: tabs.length,
      records: records.length,
      owners: owners.length,
      flagged: owners.filter(owner => owner.flagged).length,
      mainRowsWithoutNumber: rowsWithoutNumber,
      rejected,
      projectCounts,
    },
  };
}

/** Owners that belong to any of `projects` (canonical names, case-insensitive). */
export function ownersForProjects(owners, projects) {
  const wanted = new Set(projects.map(project => canonicalProject(project)));
  return owners.filter(owner => owner.projects.some(project => wanted.has(project)));
}
