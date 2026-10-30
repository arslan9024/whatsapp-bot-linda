import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeOwnerPhone, phoneKey, maskPhone } from '../../src/outreach/OwnerPhoneNormalizer.js';
import {
  NewConversationBudget, newConversationConfig, localDay, nextLocalDayStart, nextLocalMonthStart,
} from '../../src/outreach/NewConversationBudget.js';
import { MasterChatDirectory, NewConversationGuard } from '../../src/outreach/MasterChatDirectory.js';
import {
  canonicalProject, statusRank, extractOwners, ownersForProjects, projectForTab, projectAliases,
} from '../../src/outreach/OwnerSheetExtractor.js';
import { planOutreach, scheduleDays, sortNewItems } from '../../src/outreach/AreaOwnerOutreachPlanner.js';
import {
  planCsv, statusByRow, draftCampaign, summaryLines, projectLabel, writePlanCsv,
} from '../../src/outreach/OutreachReport.js';
import OutreachCommand, { resolveProjects } from '../../src/outreach/OutreachCommand.js';
import { columnLetter, OwnerSheetSource } from '../../src/outreach/OwnerSheetSource.js';
import CampaignWorkspace, { timeOfDayGreeting } from '../../src/campaigns/CampaignWorkspace.js';

const TZ = 'Asia/Dubai';
const ACCOUNT = '971500000001';
const tempDirs = [];
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linda-outreach-'));
  tempDirs.push(dir);
  return dir;
};
afterAll(() => tempDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

const clock = iso => {
  const state = { at: new Date(iso) };
  const now = () => new Date(state.at);
  now.set = value => { state.at = new Date(value); };
  return now;
};
const makeBudget = (now, limits = {}) => new NewConversationBudget({
  file: path.join(tempDir(), 'ledger.json'),
  config: { monthlyLimit: 30, dailyLimit: 2, timezone: TZ, enforce: true, ...limits },
  now,
});

const owner = (digits, extra = {}) => ({
  key: digits, name: `Owner ${digits.slice(-3)}`, numbers: [{ digits, role: 'mobile' }], bestNumber: digits,
  projects: ['VARDON'], status: '', statusRank: 3, inMain: true, mainRows: [], flagged: false, flagReason: '', order: 0,
  ...extra,
});

describe('OwnerPhoneNormalizer', () => {
  test.each([
    ['050 123 4567', '971501234567'],
    ['0501234567', '971501234567'],
    ['501234567', '971501234567'],
    ['00971501234567', '971501234567'],
    ['+971-50-123-4567', '971501234567'],
    ['971|501234567', '971501234567'],
    ['971 | 0501234567', '971501234567'],
    ['+44 7911 123456', '447911123456'],
  ])('%s → %s', (raw, digits) => {
    expect(normalizeOwnerPhone(raw)).toMatchObject({ ok: true, digits });
  });

  test('rejects empty, invalid and landline values', () => {
    expect(normalizeOwnerPhone('')).toEqual({ ok: false, reason: 'empty' });
    expect(normalizeOwnerPhone('0')).toEqual({ ok: false, reason: 'empty' });
    expect(normalizeOwnerPhone('12345')).toEqual({ ok: false, reason: 'invalid' });
    expect(normalizeOwnerPhone('04 332 4567')).toEqual({ ok: false, reason: 'landline' });
  });

  test('phoneKey and maskPhone', () => {
    expect(phoneKey('971501234567@c.us')).toBe('971501234567');
    expect(phoneKey('+971 50 123')).toBe('97150123');
    expect(maskPhone('971501234567')).toBe('••••••4567');
  });
});

describe('NewConversationBudget', () => {
  test('config defaults and env parsing', () => {
    expect(newConversationConfig({})).toEqual({ monthlyLimit: 30, dailyLimit: 2, timezone: TZ, enforce: true });
    expect(newConversationConfig({
      NEW_CONVERSATIONS_MONTHLY_LIMIT: '10', NEW_CONVERSATIONS_DAILY_LIMIT: '1',
      NEW_CONVERSATIONS_ENFORCE: 'off', NEW_CONVERSATIONS_TIMEZONE: 'Bad/Zone', WORK_HOURS_TIMEZONE: 'Europe/London',
    })).toEqual({ monthlyLimit: 10, dailyLimit: 1, timezone: 'Europe/London', enforce: false });
  });

  test('local day/month boundaries use the configured zone', () => {
    const lateUtc = new Date('2026-03-31T21:00:00Z'); // 01:00 on 1 April in Dubai
    expect(localDay(TZ, lateUtc)).toBe('2026-04-01');
    expect(nextLocalDayStart(TZ, new Date('2026-03-01T10:00:00Z')).toISOString()).toBe('2026-03-01T20:00:00.000Z');
    expect(nextLocalMonthStart(TZ, new Date('2026-03-15T10:00:00Z')).toISOString()).toBe('2026-03-31T20:00:00.000Z');
  });

  test('daily and monthly limits, retry times, idempotent recipients and persistence', () => {
    const now = clock('2026-03-01T06:00:00Z');
    const budget = makeBudget(now, { dailyLimit: 2, monthlyLimit: 3 });
    expect(budget.reserve({ account: ACCOUNT, phone: '971501111111' })).toEqual({ allowed: true, counted: true });
    expect(budget.reserve({ account: `+${ACCOUNT}`, phone: '971501111111@c.us' })).toEqual({ allowed: true, counted: false });
    expect(budget.reserve({ account: ACCOUNT, phone: '971502222222' }).allowed).toBe(true);

    const daily = budget.reserve({ account: ACCOUNT, phone: '971503333333' });
    expect(daily).toMatchObject({ allowed: false, reason: expect.stringContaining('daily new-conversation limit reached (2/2') });
    expect(daily.retryAt.toISOString()).toBe('2026-03-01T20:00:00.000Z');
    // Another account has its own budget.
    expect(budget.reserve({ account: '971500000002', phone: '971503333333' }).allowed).toBe(true);

    now.set('2026-03-02T06:00:00Z');
    expect(budget.reserve({ account: ACCOUNT, phone: '971503333333' }).allowed).toBe(true);
    const monthly = budget.reserve({ account: ACCOUNT, phone: '971504444444' });
    expect(monthly.reason).toContain('monthly new-conversation limit reached (3/3 in 2026-03)');
    expect(monthly.retryAt.toISOString()).toBe('2026-03-31T20:00:00.000Z');

    const reloaded = new NewConversationBudget({ file: budget.file, config: budget.config, now });
    expect(reloaded.usage(ACCOUNT)).toMatchObject({ usedToday: 1, usedMonth: 3, available: 0 });
    expect(reloaded.has(ACCOUNT, '971502222222')).toBe(true);

    now.set('2026-04-01T06:00:00Z');
    expect(reloaded.usage(ACCOUNT)).toMatchObject({ month: '2026-04', usedMonth: 0, available: 2 });
  });

  test('an unreadable ledger fails loudly instead of resetting the budget', () => {
    const file = path.join(tempDir(), 'ledger.json');
    fs.writeFileSync(file, '{broken');
    const budget = new NewConversationBudget({ file, config: newConversationConfig({}) });
    expect(() => budget.usage(ACCOUNT)).toThrow(/unreadable/);
  });
});

describe('MasterChatDirectory and NewConversationGuard', () => {
  const chats = () => [
    { id: { server: 'c.us', user: '971501111111' }, timestamp: 1 },
    { id: { server: 'c.us', user: '971509999999' }, timestamp: 0, lastMessage: null }, // empty shell
    { id: { server: 'g.us', user: '1203' }, isGroup: true, timestamp: 1 },
    { id: { server: 'lid', user: '555', _serialized: '555@lid' }, timestamp: 1 },
    { id: { server: 'lid', user: '777', _serialized: '777@lid' }, timestamp: 1 },
  ];
  const client = () => ({
    getChats: jest.fn(async () => chats()),
    getChatById: jest.fn(),
    getContactLidAndPhone: jest.fn(async ids => ids.map(id => {
      if (id === '555@lid') return { lid: '555@lid', pn: '971502222222@c.us' };
      if (id === '971503333333@c.us') return { lid: '777@lid', pn: id };
      return { lid: null, pn: null };
    })),
  });

  test('finds direct and lid chats, ignores groups and empty shells, never opens chats', async () => {
    const mock = client();
    const directory = await new MasterChatDirectory(mock).refresh();
    expect(await directory.has('971501111111')).toBe(true);
    expect(await directory.has('+971 50 222 2222')).toBe(true);
    expect(await directory.has('971503333333')).toBe(true); // via unresolved lid lookup
    expect(await directory.has('971509999999')).toBe(false);
    expect(await directory.has('971504444444')).toBe(false);
    expect(directory.stats).toMatchObject({ chats: 5, direct: 3, lids: 2, lidsResolved: 1 });
    expect(mock.getChatById).not.toHaveBeenCalled();
    expect(mock.getChats).toHaveBeenCalledTimes(1);
  });

  test('guard: existing chats are free, new chats use the budget, then defer', async () => {
    const now = clock('2026-03-01T06:00:00Z');
    const budget = makeBudget(now, { dailyLimit: 1 });
    const guard = new NewConversationGuard({ budget });
    const mock = client();
    expect(await guard.reserve({ account: ACCOUNT, client: mock, phone: '971501111111', source: 't' }))
      .toEqual({ allowed: true, isNew: false });
    expect(await guard.reserve({ account: ACCOUNT, client: mock, phone: '971504444444', source: 't' }))
      .toEqual({ allowed: true, counted: true, isNew: true });
    // Now known as a chat: the next message is free.
    expect(await guard.reserve({ account: ACCOUNT, client: mock, phone: '971504444444', source: 't' }))
      .toEqual({ allowed: true, isNew: false });
    const blocked = await guard.reserve({ account: ACCOUNT, client: mock, phone: '971505555555', source: 't' });
    expect(blocked).toMatchObject({ allowed: false, isNew: true, retryAt: expect.any(Date) });
    expect(budget.usage(ACCOUNT).usedToday).toBe(1);
  });

  test('guard: chat-list failure counts as new; enforcement off allows everything', async () => {
    const budget = makeBudget(clock('2026-03-01T06:00:00Z'));
    const failing = { getChats: jest.fn(async () => { throw new Error('detached'); }) };
    expect(await new NewConversationGuard({ budget }).reserve({ account: ACCOUNT, client: failing, phone: '971501111111' }))
      .toMatchObject({ allowed: true, isNew: true, counted: true });
    const off = new NewConversationGuard({ budget, enforce: false });
    expect(await off.reserve({ account: ACCOUNT, client: failing, phone: '971502222222' })).toEqual({ allowed: true, isNew: false });
  });
});

describe('OwnerSheetExtractor', () => {
  const tabs = () => [
    {
      title: 'Sheet1',
      values: [
        ['Project', 'Name', 'Mobile', 'Secondary Mobile', 'Phone', 'PropertyStatus', 'Responses Status'],
        ['Vardon @ Akoya Oxygen', 'Ali  Khan', '0501111111', '971|502222222', '', 'Rented', ''],
        ['DAMAC HILLS (2) - CAMELIA', 'Sara', '0503333333', '', '04 332 4567', 'Available', ''],
        ['VARDON', 'Omar', '0504444444', '', '', 'Vacant', 'Wrong number'],
        ['VARDON', 'No Phone', '', '', '', '', ''],
        ['.', 'Unknown Proj', '0505555555', '', '', '', ''],
      ],
    },
    { title: 'ProjectsInD2', values: [['Project', 'Code', 'Abbreviate'], ['Vardon', 'V1', 'VRD'], ['Camelia', 'C1', 'CML']] },
    // Headerless cluster tab with two side-by-side lists; second number links to Ali via Sheet1.
    { title: 'VRD All', values: [['0506666666', '0502222222'], ['0507777777', '']] },
    { title: 'Contracts', values: [['Mobile', 'Name'], ['0508888888', 'Skip me']] },
  ];

  test('helpers', () => {
    expect(canonicalProject('Vardon @ Akoya Oxygen')).toBe('VARDON');
    expect(canonicalProject('DAMAC HILLS (2) - CAMELIA')).toBe('CAMELIA');
    expect(canonicalProject('0')).toBe('UNKNOWN');
    expect([statusRank('Available'), statusRank('vacant'), statusRank(''), statusRank('Rented')]).toEqual([0, 1, 3, 4]);
    const aliases = projectAliases(tabs());
    expect(aliases.get('VRD')).toBe('VARDON');
    expect(projectForTab('VRD All', aliases)).toBe('VARDON');
    expect(projectForTab('Misc', aliases)).toBe('UNKNOWN');
  });

  test('deduplicates owners across tabs, keeps flags, skips listed tabs', () => {
    const { owners, stats } = extractOwners(tabs());
    const byNumber = digits => owners.find(item => item.numbers.some(number => number.digits === digits));
    const ali = byNumber('971501111111');
    expect(ali).toMatchObject({
      name: 'Ali Khan', bestNumber: '971501111111', projects: ['VARDON'], inMain: true, mainRows: [2], status: 'Rented',
    });
    expect(ali.numbers.map(number => number.digits)).toEqual(['971501111111', '971502222222']);
    expect(byNumber('971503333333')).toMatchObject({ projects: ['CAMELIA'], statusRank: 0 });
    expect(byNumber('971504444444')).toMatchObject({ flagged: true, flagReason: 'Wrong number' });
    expect(byNumber('971506666666')).toMatchObject({ projects: ['VARDON'], inMain: false, mainRows: [] });
    expect(byNumber('971505555555').projects).toEqual(['UNKNOWN']);
    expect(byNumber('971508888888')).toBeUndefined();
    expect(stats).toMatchObject({ owners: 6, flagged: 1, mainRowsWithoutNumber: 1, rejected: { landline: 1 } });
    expect(stats.projectCounts).toMatchObject({ VARDON: 4, CAMELIA: 1, UNKNOWN: 1 });
    expect(ownersForProjects(owners, ['vardon'])).toHaveLength(4);
  });
});

describe('AreaOwnerOutreachPlanner', () => {
  test('sortNewItems prefers available status, then Sheet1, then order', () => {
    const items = [
      { owner: owner('1', { statusRank: 3, inMain: true, order: 0 }) },
      { owner: owner('2', { statusRank: 0, inMain: false, order: 5 }) },
      { owner: owner('3', { statusRank: 3, inMain: false, order: 1 }) },
      { owner: owner('4', { statusRank: 3, inMain: true, order: 2 }) },
    ];
    expect(sortNewItems(items).map(item => item.owner.key)).toEqual(['2', '1', '4', '3']);
  });

  test('scheduleDays respects daily and monthly caps across a month boundary', () => {
    const days = scheduleDays([1, 2, 3, 4, 5], {
      startAt: new Date('2026-03-30T06:00:00Z'), timezone: TZ, dailyLimit: 2, monthlyLimit: 3, usedInStartMonth: 2,
    }).map(item => item.day);
    expect(days).toEqual(['2026-03-30', '2026-04-01', '2026-04-01', '2026-04-02', '2026-05-01']);
    expect(scheduleDays([1], { startAt: new Date(), timezone: TZ, dailyLimit: 0, monthlyLimit: 30 })).toEqual([{ owner: 1, day: null }]);
  });

  test('classifies owners and plans today, tomorrow and later', async () => {
    const now = clock('2026-03-10T06:00:00Z');
    const budget = makeBudget(now, { dailyLimit: 2, monthlyLimit: 30 });
    budget.reserve({ account: ACCOUNT, phone: '971500000099' }); // 1 used today
    budget.reserve({ account: ACCOUNT, phone: '971501000001' }); // Linda already started this owner
    now.set('2026-03-11T06:00:00Z');
    const owners = [
      owner('971501000001'),
      owner('971501000002', { numbers: [{ digits: '971501000002' }, { digits: '971501000022' }] }),
      owner('971501000003', { flagged: true, flagReason: 'no whatsapp' }),
      owner('971501000004', { numbers: [{ digits: '971501000004' }, { digits: '971501000044' }], statusRank: 0 }),
      owner('971501000005'),
      owner('971501000006'),
      owner('971501000007'),
    ];
    const verifyNumber = jest.fn(async digits => (digits === '971501000004' ? null : `${digits}@c.us`));
    const plan = await planOutreach({
      owners, projects: ['VARDON'], account: ACCOUNT, budget, now: now(),
      hasChat: async digits => digits === '971501000022',
      verifyNumber,
    });
    expect(plan.totals).toEqual({ owners: 7, existing: 2, new: 4, skipped: 1, today: 2, waiting: 2 });
    expect(plan.existing.map(item => item.via)).toEqual(['started by Linda', 'WhatsApp chat']);
    expect(plan.existing[1].matched).toBe('971501000022');
    expect(plan.skipped.map(item => item.reason)).toEqual(['do-not-contact: no whatsapp']);
    // Owner 4 is first by status; its second number is the WhatsApp one.
    expect(plan.today.map(item => [item.sendTo, item.verified, item.day])).toEqual([
      ['971501000044', true, '2026-03-11'], ['971501000005', true, '2026-03-11'],
    ]);
    expect(plan.tomorrow.map(item => [item.sendTo, item.day])).toEqual([
      ['971501000006', '2026-03-12'], ['971501000007', '2026-03-12'],
    ]);
    expect(plan.lastDay).toBe('2026-03-12');
    expect(budget.usage(ACCOUNT).usedToday).toBe(0); // planning never reserves
  });

  test('a number that is not on WhatsApp is skipped; a lookup error leaves picks unverified', async () => {
    const budget = makeBudget(clock('2026-03-10T06:00:00Z'));
    const notOnWhatsApp = await planOutreach({
      owners: [owner('971501000001'), owner('971501000002')], projects: ['VARDON'], account: ACCOUNT, budget,
      hasChat: async () => false, verifyNumber: async digits => (digits.endsWith('1') ? null : `${digits}@c.us`),
    });
    expect(notOnWhatsApp.skipped[0].reason).toBe('not on WhatsApp');
    expect(notOnWhatsApp.today.map(item => item.sendTo)).toEqual(['971501000002']);

    const failing = await planOutreach({
      owners: [owner('971501000001'), owner('971501000002')], projects: ['VARDON'], account: ACCOUNT, budget,
      hasChat: async () => false, verifyNumber: async () => { throw new Error('offline'); },
    });
    expect(failing.verification.error).toBe('offline');
    expect(failing.today.map(item => item.verified)).toEqual([false, false]);
    expect(summaryLines(failing).join('\n')).toContain('today\'s picks are unverified');
  });

  test('budget already used today: everyone is held', async () => {
    const now = clock('2026-03-10T06:00:00Z');
    const budget = makeBudget(now, { dailyLimit: 1 });
    budget.reserve({ account: ACCOUNT, phone: '971500000099' });
    const plan = await planOutreach({
      owners: [owner('971501000001')], projects: ['VARDON'], account: ACCOUNT, budget, hasChat: async () => false,
    });
    expect(plan.totals).toMatchObject({ today: 0, waiting: 1 });
    expect(plan.tomorrow[0].day).toBe('2026-03-11');
    expect(summaryLines(plan).join('\n')).toContain('Budget used: no new conversations today');
  });
});

describe('OutreachReport', () => {
  const plan = () => ({
    projects: ['VARDON'], account: ACCOUNT,
    usage: { day: '2026-03-10', month: '2026-03', usedToday: 0, usedMonth: 0, available: 2 },
    limits: { dailyLimit: 2, monthlyLimit: 30, timezone: TZ },
    today: [{ owner: owner('971501000001', { name: '=HYPERLINK("x")', mainRows: [2, 5] }), project: 'VARDON', sendTo: '971501000001', verified: true, day: '2026-03-10' }],
    tomorrow: [{ owner: owner('971501000002', { mainRows: [3] }), project: 'VARDON', sendTo: '971501000002', day: '2026-03-11' }],
    later: [{ owner: owner('971501000003', { mainRows: [5] }), project: 'VARDON', sendTo: '971501000003', day: null }],
    existing: [{ owner: owner('971501000004', { mainRows: [4] }), project: 'VARDON', matched: '971501000004', via: 'WhatsApp chat' }],
    skipped: [{ owner: owner('971501000005', { mainRows: [6] }), project: 'VARDON', reason: 'not on WhatsApp' }],
    verification: { lookups: 1, limit: 20, error: null },
    lastDay: '2026-03-11',
    totals: { owners: 5, existing: 1, new: 3, skipped: 1, today: 1, waiting: 2 },
  });

  test('CSV escapes formulas and quotes; file goes to the given folder with a BOM', () => {
    const csv = planCsv(plan());
    expect(csv.split('\r\n')).toHaveLength(6);
    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    expect(csv).toContain('"existing","","Owner 004","VARDON","971501000004"');
    const dir = tempDir();
    const file = writePlanCsv(plan(), dir);
    expect(path.dirname(file)).toBe(dir);
    expect(path.basename(file)).toBe('outreach-vardon-2026-03-10.csv');
    expect(fs.readFileSync(file, 'utf8').startsWith('\uFEFF')).toBe(true);
  });

  test('statusByRow: today wins over other decisions on a shared row', () => {
    const statuses = statusByRow(plan());
    expect(Object.fromEntries(statuses)).toEqual({
      2: 'new - today 2026-03-10',
      3: 'planned 2026-03-11',
      4: 'existing chat (WhatsApp chat) 2026-03-10',
      5: 'new - today 2026-03-10',
      6: 'skipped: not on WhatsApp 2026-03-10',
    });
  });

  test('draftCampaign builds a valid draft in a real workspace', () => {
    const workspace = new CampaignWorkspace({
      directory: tempDir(), accounts: () => [], sendRecipient: jest.fn(), checkRecipient: jest.fn(),
    });
    workspace.initialize();
    const draft = draftCampaign(plan(), workspace);
    expect(draft).toMatchObject({ name: 'Outreach VARDON 2026-03-10', accountPhone: `+${ACCOUNT}`, status: 'draft' });
    expect(draft.contacts).toHaveLength(1);
    expect(draft.contacts[0].values?.project ?? draft.contacts[0].project).toBe('Vardon');
    expect(() => draftCampaign({ ...plan(), today: [] }, workspace)).toThrow(/nothing to draft/);
    expect(projectLabel('JUNIPER HEIGHTS')).toBe('Juniper Heights');
  });
});

describe('OutreachCommand', () => {
  const known = new Set(['VARDON', 'VERONA', 'JUNIPER', 'SYMBOLIC']);
  const aliases = new Map([['JNP', 'JUNIPER'], ['SYM', 'SYMBOLIC']]);

  test('resolveProjects: names, aliases, unique prefixes and unknown tokens', () => {
    expect(resolveProjects('vardon', known, aliases)).toEqual({ projects: ['VARDON'], unknown: [] });
    expect(resolveProjects('JNP SYM', known, aliases)).toEqual({ projects: ['JUNIPER', 'SYMBOLIC'], unknown: [] });
    expect(resolveProjects('VARD, xyz', known, aliases)).toEqual({ projects: ['VARDON'], unknown: ['xyz'] });
    expect(resolveProjects('V', known, aliases)).toEqual({ projects: [], unknown: ['V'] });
  });

  test('columnLetter', () => {
    expect([1, 26, 27, 52, 703].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'AZ', 'AAA']);
  });

  const setup = ({ answers = [], state = 'CONNECTED' } = {}) => {
    const now = clock('2026-03-10T06:00:00Z');
    const budget = makeBudget(now);
    const client = {
      getChats: jest.fn(async () => [{ id: { server: 'c.us', user: '971501000001' }, timestamp: 1 }]),
      getNumberId: jest.fn(async digits => ({ _serialized: `${digits}@c.us` })),
    };
    const mainValues = [
      ['Project', 'Name', 'Mobile'],
      ['VARDON', 'Has Chat', '0501000001'],
      ['VARDON', 'New One', '0501000002'],
      ['VARDON', 'New Two', '0501000003'],
      ['VARDON', 'New Three', '0501000004'],
      ['VERONA', 'Other', '0501000005'],
    ];
    const source = {
      config: { mainTab: 'Sheet1' },
      readAll: jest.fn(async () => ({ title: 'Owners', tabs: [{ title: 'Sheet1', values: mainValues }] })),
      writeStatus: jest.fn(async () => ({ ok: true, column: 'D', updated: 4 })),
    };
    const saveDraft = jest.fn(input => ({ ...input, id: 'd1' }));
    const lines = [];
    const command = new OutreachCommand({
      accountClients: new Map([[`+${ACCOUNT}`, client]]),
      connectionManagers: new Map([[`+${ACCOUNT}`, { state }]]),
      accountConfigManager: { getMasterPhoneNumber: () => `+${ACCOUNT}` },
      getWorkspace: () => ({ saveDraft }),
      ask: jest.fn(async () => answers.shift() || 'no'),
      print: line => lines.push(line),
      source,
      guard: new NewConversationGuard({ budget }),
      budget,
      csvDirectory: tempDir(),
      now,
    });
    return { command, source, saveDraft, lines, budget, client, mainValues };
  };

  test('plan: existing chat, two today, one held; draft and sheet write-back on yes', async () => {
    const { command, source, saveDraft, lines, budget, mainValues } = setup({ answers: ['yes', 'yes'] });
    const plan = await command.run(['vardon']);
    expect(plan.totals).toEqual({ owners: 4, existing: 1, new: 3, skipped: 0, today: 2, waiting: 1 });
    expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ accountPhone: `+${ACCOUNT}` }));
    expect(saveDraft.mock.calls[0][0].contacts.map(contact => contact.phone)).toEqual(['971501000002', '971501000003']);
    const [values, statuses] = source.writeStatus.mock.calls[0];
    expect(values).toBe(mainValues);
    expect(statuses.get(2)).toMatch(/^existing chat/);
    expect(statuses.get(5)).toBe('planned 2026-03-11');
    expect(mainValues[0][3]).toBe('Linda Outreach');
    expect(lines.join('\n')).toContain('Full report (contains phone numbers)');
    expect(budget.usage(ACCOUNT).usedToday).toBe(0);
    // Sheet is cached between runs.
    await command.run(['projects']);
    expect(source.readAll).toHaveBeenCalledTimes(1);
  });

  test('plan: answering no changes nothing; offline master is refused', async () => {
    const { command, source, saveDraft } = setup();
    await command.run(['VARDON']);
    expect(saveDraft).not.toHaveBeenCalled();
    expect(source.writeStatus).not.toHaveBeenCalled();
    await expect(setup({ state: 'DISCONNECTED' }).command.run(['VARDON'])).rejects.toThrow(/not connected/);
  });

  test('projects, budget and unknown project', async () => {
    const { command, lines } = setup();
    expect(await command.run(['projects'])).toEqual([['VARDON', 4], ['VERONA', 1]]);
    await expect(command.run(['budget'])).resolves.toMatchObject({ available: 2 });
    expect(await command.run(['nowhere'])).toBeNull();
    expect(lines.join('\n')).toContain('Unknown project(s): nowhere');
  });

  test('OwnerSheetSource.writeStatus appends the column after the widest row and reports 403 clearly', async () => {
    const update = jest.fn(async () => ({}));
    const source = new OwnerSheetSource({
      config: { spreadsheetId: 'sheet', mainTab: 'Sheet1' },
      sheets: { spreadsheets: { values: { update } } },
    });
    const result = await source.writeStatus([['A', 'B'], ['1', '2', '3']], new Map([[2, 'new - today']]));
    expect(result).toEqual({ ok: true, column: 'D', updated: 1 });
    expect(update.mock.calls[0][0]).toMatchObject({
      range: "'Sheet1'!D1:D2", requestBody: { values: [['Linda Outreach'], ['new - today']] },
    });
    update.mockRejectedValueOnce(Object.assign(new Error('forbidden'), { code: 403 }));
    expect((await source.writeStatus([['A']], new Map([[2, 'x']]))).error).toMatch(/no edit access/);
  });
});

describe('Campaign integration', () => {
  test('timeOfDayGreeting follows the working-hours zone', () => {
    expect(timeOfDayGreeting(new Date('2026-03-10T05:00:00Z'), TZ)).toBe('Good Morning');
    expect(timeOfDayGreeting(new Date('2026-03-10T10:00:00Z'), TZ)).toBe('Good Afternoon');
    expect(timeOfDayGreeting(new Date('2026-03-10T14:00:00Z'), TZ)).toBe('Good Evening');
  });

  test('a deferred recipient stays pending while others are sent', async () => {
    const sendRecipient = jest.fn(async () => ({}));
    const retryAt = new Date(Date.now() + 60 * 60 * 1000);
    const workspace = new CampaignWorkspace({
      directory: tempDir(),
      accounts: () => [{ phone: '+971500000001', active: true }],
      sendRecipient,
      checkRecipient: jest.fn(async (campaign, contact) => (contact.phone.endsWith('1111')
        ? { allowed: false, defer: true, retryAt, reason: 'Deferred: daily new-conversation limit reached.' }
        : { allowed: true })),
      log: jest.fn(),
    });
    workspace.initialize();
    const draft = workspace.saveDraft({
      name: 'Defer test', template: '{greeting} {name}', intervalMs: 3000, accountPhone: '+971500000001',
      contacts: [
        { phone: '+971501111111', name: 'A', selected: true },
        { phone: '+971502222222', name: 'B', selected: true },
      ],
    });
    workspace.start(draft.id);
    for (let i = 0; i < 50 && sendRecipient.mock.calls.length < 1; i += 1) await new Promise(resolve => setTimeout(resolve, 10));
    await new Promise(resolve => setTimeout(resolve, 20));
    const campaign = workspace.get(draft.id);
    expect(sendRecipient).toHaveBeenCalledTimes(1);
    expect(campaign.contacts.map(contact => contact.status)).toEqual(['pending', 'sent']);
    expect(campaign.contacts[0]).toMatchObject({ deferredUntil: retryAt.getTime(), reason: expect.stringContaining('Deferred') });
    expect(campaign.status).toBe('running');
    expect(campaign.nextSendAt).toBe(retryAt.getTime());
    expect(workspace.summary(campaign).counts).toMatchObject({ pending: 1, deferred: 1, sent: 1 });
    workspace.stop(draft.id);
    await workspace.close();
    await Promise.all(workspace.jobs.values());
  });
});
