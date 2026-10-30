/**
 * Daily snapshots of the owners sheet (git-ignored, contain phone numbers) and
 * the difference to the previous day: new owners, removed owners, added numbers,
 * property status changes and new do-not-contact flags.
 *
 * Owners are matched by any shared number, because the owner key is the
 * owner's first number and can change when numbers are added.
 */

import fs from 'fs';
import path from 'path';

const FILE = /^owners-(\d{4}-\d{2}-\d{2})\.json$/;

export function compactOwners(owners) {
  return owners.map(owner => ({
    key: owner.key,
    name: owner.name || '',
    projects: owner.projects || [],
    numbers: (owner.numbers || []).map(number => number.digits),
    status: owner.status || '',
    flagged: Boolean(owner.flagged),
  }));
}

/** Changes from `before` to `after` (compact owner lists). */
export function diffOwners(before, after) {
  const byNumber = new Map();
  for (const owner of before) for (const number of owner.numbers) byNumber.set(number, owner);
  const matched = new Set();
  const diff = { added: [], removed: [], numbersAdded: [], statusChanged: [], newlyFlagged: [] };
  for (const owner of after) {
    const previous = owner.numbers.map(number => byNumber.get(number)).find(Boolean);
    if (!previous) {
      diff.added.push(owner);
      continue;
    }
    matched.add(previous);
    const extra = owner.numbers.filter(number => !previous.numbers.includes(number));
    if (extra.length) diff.numbersAdded.push({ owner, numbers: extra });
    if (previous.status !== owner.status) diff.statusChanged.push({ owner, from: previous.status, to: owner.status });
    if (owner.flagged && !previous.flagged) diff.newlyFlagged.push(owner);
  }
  diff.removed = before.filter(owner => !matched.has(owner));
  return diff;
}

export function diffSummary(diff, previousDay) {
  if (!previousDay) return 'First owners snapshot saved; changes are reported from the next day.';
  const parts = [
    `${diff.added.length} new owner(s)`,
    `${diff.removed.length} removed`,
    `${diff.numbersAdded.length} with new numbers`,
    `${diff.statusChanged.length} status change(s)`,
    `${diff.newlyFlagged.length} newly do-not-contact`,
  ];
  return `Owners sheet since ${previousDay}: ${parts.join(', ')}.`;
}

export class OwnerSnapshotStore {
  constructor({ directory = path.resolve('data', 'outreach', 'snapshots'), keep = 60 } = {}) {
    this.directory = directory;
    this.keep = keep;
  }

  days() {
    try {
      return fs.readdirSync(this.directory).map(name => FILE.exec(name)?.[1]).filter(Boolean).sort();
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  read(day) {
    const data = JSON.parse(fs.readFileSync(path.join(this.directory, `owners-${day}.json`), 'utf8'));
    return Array.isArray(data?.owners) ? data.owners : [];
  }

  /** Saves today's snapshot and returns the diff to the latest earlier day. */
  record(owners, day, { title = '' } = {}) {
    const compact = compactOwners(owners);
    const previousDay = this.days().filter(item => item < day).pop() || null;
    const diff = previousDay ? diffOwners(this.read(previousDay), compact) : null;
    fs.mkdirSync(this.directory, { recursive: true });
    const file = path.join(this.directory, `owners-${day}.json`);
    fs.writeFileSync(file, JSON.stringify({ version: 1, day, title, owners: compact }));
    for (const old of this.days().slice(0, -this.keep)) {
      fs.rmSync(path.join(this.directory, `owners-${old}.json`), { force: true });
    }
    return { day, previousDay, diff, file, summary: diffSummary(diff, previousDay) };
  }
}
