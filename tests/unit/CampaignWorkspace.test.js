import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from '@e965/xlsx';
import CampaignWorkspace, {
  normalizeRecipients,
  parseContactFile,
  personalize,
  exportCampaignResults,
  sendingDelay,
} from '../../code/Services/CampaignWorkspace.js';

const phone = '+15550000001';
const rows = [
  { phone: '15550000002', name: 'Alex', company: 'Acme', group: 'Customers' },
  { phone: '15550000003', name: 'Sam', company: 'North', group: 'Partners' },
];

describe('Persistent campaign workspace', () => {
  let directory;
  let workspace;
  let send;
  let check;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'linda-campaign-test-'));
    send = jest.fn().mockResolvedValue({});
    check = jest.fn().mockResolvedValue({ allowed: true });
    workspace = new CampaignWorkspace({
      directory,
      accounts: () => [{ phone, active: true }],
      sendRecipient: send,
      checkRecipient: check,
      log: jest.fn(),
    });
    workspace.initialize();
  });

  afterEach(async () => {
    await workspace.close();
    jest.useRealTimers();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const draft = (workspace, contacts = rows) =>
    workspace.saveDraft({
      name: 'Updates',
      template: 'Hello {name} from {company}',
      accountPhone: phone,
      intervalMs: 3000,
      contacts: normalizeRecipients(contacts).contacts,
    });

  test('normalizes international numbers, deduplicates and explicitly reports invalid rows', () => {
    const imported = normalizeRecipients([
      { 'Phone Number': '+1 (555) 000-0002', Name: 'Alex' },
      { phone: '0015550000002', name: 'Duplicate' },
      { phone: '123' },
      { phone: '15550000003', opted_out: 'yes' },
    ]);
    expect(imported.contacts).toHaveLength(2);
    expect(imported.duplicates).toBe(1);
    expect(imported.rejected).toEqual([expect.objectContaining({ row: 4 })]);
    expect(imported.contacts[1]).toMatchObject({
      optedOut: true,
      selected: false,
    });
  });

  test.each(['csv', 'xlsx'])(
    'imports %s with custom columns and quoted commas',
    extension => {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet([{ ...rows[0], company: 'Acme, Inc' }]),
        'Contacts',
      );
      const data =
        extension === 'csv'
          ? Buffer.from(XLSX.utils.sheet_to_csv(book.Sheets.Contacts))
          : XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
      const imported = parseContactFile(`contacts.${extension}`, data);
      expect(imported.contacts[0].values.company).toBe('Acme, Inc');
      expect(imported.contacts[0].phone).toBe(rows[0].phone);
    },
  );

  test('rejects unsupported, oversized and empty imports', () => {
    expect(() => parseContactFile('contacts.exe', Buffer.from('a'))).toThrow(
      'CSV',
    );
    expect(() =>
      parseContactFile('contacts.csv', Buffer.alloc(5 * 1024 * 1024 + 1)),
    ).toThrow('5 MB');
    expect(() => normalizeRecipients(Array(5001).fill(rows[0]))).toThrow(
      '5000',
    );
  });

  test('personalization supports custom columns and literal replacement characters, and rejects missing values', () => {
    const [contact] = normalizeRecipients([
      { ...rows[0], company: '$& Business' },
    ]).contacts;
    expect(personalize('{name}: {company} / {PHONE}', contact)).toBe(
      'Alex: $& Business / 15550000002',
    );
    expect(() => personalize('Hi {missing}', contact)).toThrow(
      'Missing variable',
    );
  });

  test('persists drafts and attachment bytes and refuses invalid intervals', () => {
    const campaign = draft(workspace);
    const file = workspace.addAttachment(campaign.id, {
      name: 'guide.pdf',
      mime: 'application/pdf',
      data: Buffer.from('%PDF-test').toString('base64'),
    });
    workspace.initialize();
    expect(workspace.get(campaign.id).attachments).toEqual([file]);
    expect(
      fs.readFileSync(path.join(directory, 'attachments', file.id), 'utf8'),
    ).toBe('%PDF-test');
    expect(() => workspace.saveDraft({ ...campaign, intervalMs: 1 })).toThrow(
      '3-3600',
    );
    expect(() =>
      workspace.addAttachment(campaign.id, {
        name: 'bad.exe',
        mime: 'application/octet-stream',
        data: 'YQ==',
      }),
    ).toThrow('Unsupported');
    workspace.removeAttachment(campaign.id, file.id);
    expect(fs.existsSync(path.join(directory, 'attachments', file.id))).toBe(
      false,
    );
  });

  test('only sends selected recipients, records failures, and never restarts completed sends', async () => {
    const campaign = draft(workspace, [
      rows[0],
      { ...rows[1], opted_out: true },
    ]);
    send.mockRejectedValueOnce(new Error('Disconnected'));
    workspace.start(campaign.id);
    await workspace.jobs.get(campaign.id);
    expect(workspace.summary(campaign).counts).toMatchObject({
      total: 2,
      selected: 1,
      failed: 1,
      notSent: 1,
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(campaign.contacts[0].reason).toBe('Disconnected');
    expect(() => workspace.start(campaign.id)).toThrow('Only draft or paused');
    expect(() => workspace.saveDraft(campaign, campaign.id)).toThrow(
      'read-only',
    );
  });

  test('pause during an in-flight recipient finishes it, then resumes only the next recipient after the interval', async () => {
    jest.useFakeTimers();
    const campaign = draft(workspace);
    let finish;
    send.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    workspace.start(campaign.id);
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
    workspace.pause(campaign.id);
    finish({});
    await workspace.jobs.get(campaign.id);
    expect(campaign.contacts.map(contact => contact.status)).toEqual([
      'sent',
      'pending',
    ]);
    workspace.start(campaign.id);
    await jest.advanceTimersByTimeAsync(2999);
    expect(send).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await workspace.jobs.get(campaign.id);
    expect(send).toHaveBeenCalledTimes(2);
    expect(campaign.status).toBe('completed');
  });

  test('known opt-outs become not-sent; unavailable consent checks or limits pause instead of silently sending', async () => {
    const campaign = draft(workspace);
    check
      .mockResolvedValueOnce({ allowed: false, reason: 'Recipient opted out.' })
      .mockResolvedValueOnce({
        allowed: false,
        pause: true,
        reason: 'Database unavailable',
      });
    workspace.start(campaign.id);
    await workspace.jobs.get(campaign.id);
    expect(send).not.toHaveBeenCalled();
    expect(campaign.contacts[0]).toMatchObject({
      status: 'not_sent',
      reason: 'Recipient opted out.',
    });
    expect(campaign.contacts[1].status).toBe('pending');
    expect(campaign.status).toBe('paused');
    expect(campaign.error).toBe('Database unavailable');
  });

  test('restart quarantines uncertain in-flight sends and requires explicit resume', () => {
    const campaign = draft(workspace);
    campaign.status = 'running';
    campaign.startedAt = new Date().toISOString();
    campaign.contacts[0].status = 'sending';
    workspace.persist();
    workspace.initialize();
    const restored = workspace.get(campaign.id);
    expect(restored.status).toBe('paused');
    expect(restored.contacts[0].status).toBe('not_sent');
    expect(restored.contacts[0].reason).toContain('delivery unknown');
    expect(restored.contacts[0].deliveryUnknown).toBe(true);
    expect(workspace.summary(restored)).toMatchObject({
      processed: 1,
      incomplete: true,
      counts: { unknown: 1, pending: 1 },
    });
    expect(send).not.toHaveBeenCalled();
  });

  test('reports the exact 2/30 incomplete progress shape without counting pending recipients as processed', () => {
    const campaign = draft(
      workspace,
      Array.from({ length: 30 }, (_, index) => ({
        ...rows[0],
        phone: String(15550000000 + index),
      })),
    );
    campaign.contacts[0].status = 'sent';
    campaign.contacts[1].status = 'failed';
    expect(workspace.summary(campaign)).toMatchObject({
      processed: 2,
      incomplete: true,
      counts: { total: 30, selected: 30, sent: 1, failed: 1, pending: 28 },
    });
  });

  test('supports attachment-only drafts but refuses empty tasks at start', async () => {
    const campaign = workspace.saveDraft({ ...draft(workspace), template: '' });
    expect(() => workspace.start(campaign.id)).toThrow(
      'message text or at least one attachment',
    );
    workspace.addAttachment(campaign.id, {
      name: 'guide.pdf',
      mime: 'application/pdf',
      data: Buffer.from('%PDF-test').toString('base64'),
    });
    workspace.start(campaign.id);
    workspace.pause(campaign.id);
    await workspace.jobs.get(campaign.id);
    expect(campaign.template).toBe('');
  });

  test('validates and persists interval ranges and samples both endpoints', () => {
    const campaign = workspace.saveDraft({
      ...draft(workspace),
      intervalMs: 6000,
      intervalMaxMs: 10000,
    });
    workspace.initialize();
    expect(workspace.get(campaign.id).intervalMaxMs).toBe(10000);
    expect(() =>
      workspace.saveDraft({ ...campaign, intervalMaxMs: 5999 }),
    ).toThrow('maximum');
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValue(0);
    expect(sendingDelay(campaign)).toBe(6000);
    random.mockReturnValue(0.999999);
    expect(sendingDelay(campaign)).toBe(10000);
    random.mockRestore();
  });

  test('enforces the sampled range delay between actual recipient sends', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    const campaign = draft(workspace);
    campaign.intervalMs = 6000;
    campaign.intervalMaxMs = 10000;
    workspace.start(campaign.id);
    await jest.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(9999);
    expect(send).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await workspace.jobs.get(campaign.id);
    expect(send).toHaveBeenCalledTimes(2);
    expect(campaign.status).toBe('completed');
  });

  test('stop interrupts the interval wait without sending another recipient', async () => {
    jest.useFakeTimers();
    const campaign = draft(workspace);
    workspace.start(campaign.id);
    await jest.advanceTimersByTimeAsync(0);
    workspace.stop(campaign.id);
    await workspace.jobs.get(campaign.id);
    await jest.advanceTimersByTimeAsync(10000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(campaign.contacts[1].status).toBe('pending');
    expect(campaign.status).toBe('stopped');
  });

  test('stop completes an in-flight recipient but never sends or resumes pending recipients', async () => {
    const campaign = draft(workspace);
    let finish;
    send.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    workspace.start(campaign.id);
    await Promise.resolve();
    await Promise.resolve();
    workspace.stop(campaign.id);
    finish({});
    await workspace.jobs.get(campaign.id);
    expect(campaign.status).toBe('stopped');
    expect(campaign.contacts.map(contact => contact.status)).toEqual([
      'sent',
      'pending',
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(() => workspace.start(campaign.id)).toThrow('Only draft or paused');
    workspace.initialize();
    expect(workspace.get(campaign.id).status).toBe('stopped');
  });

  test('delete waits for in-flight delivery, then removes local task and attachment copies', async () => {
    const campaign = draft(workspace);
    const attachment = workspace.addAttachment(campaign.id, {
      name: 'guide.pdf',
      mime: 'application/pdf',
      data: 'YQ==',
    });
    let finish;
    send.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    workspace.start(campaign.id);
    await Promise.resolve();
    await Promise.resolve();
    const deleting = workspace.delete(campaign.id);
    expect(
      fs.existsSync(path.join(directory, 'attachments', attachment.id)),
    ).toBe(true);
    finish({});
    await deleting;
    expect(send).toHaveBeenCalledTimes(1);
    expect(() => workspace.get(campaign.id)).toThrow('not found');
    expect(
      fs.existsSync(path.join(directory, 'attachments', attachment.id)),
    ).toBe(false);
    workspace.initialize();
    expect(workspace.campaigns).toHaveLength(0);
  });

  test('unknown delivery failures remain review-only after restart and in exports', async () => {
    const campaign = draft(workspace, [rows[0]]);
    send.mockRejectedValueOnce(
      Object.assign(new Error('Connection lost during send'), {
        deliveryUnknown: true,
      }),
    );
    workspace.start(campaign.id);
    await workspace.jobs.get(campaign.id);
    expect(workspace.summary(campaign)).toMatchObject({
      incomplete: true,
      counts: { failed: 1, unknown: 1 },
    });
    workspace.initialize();
    expect(workspace.get(campaign.id).contacts[0].deliveryUnknown).toBe(true);
    expect(exportCampaignResults(campaign)).toContain('"delivery_unknown"');
    expect(() => workspace.start(campaign.id)).toThrow('Only draft or paused');
  });

  test('validates account, all placeholders and selected recipients before any send', () => {
    const campaign = draft(workspace);
    campaign.template = 'Hello {unknown}';
    expect(() => workspace.start(campaign.id)).toThrow('Missing variable');
    campaign.template = 'Hello';
    campaign.accountPhone = 'not-linked';
    expect(() => workspace.start(campaign.id)).toThrow('active linked');
    expect(send).not.toHaveBeenCalled();
  });

  test('exports successful, failed, pending and excluded results without spreadsheet formulas', () => {
    const campaign = draft(workspace, [
      { ...rows[0], name: '=HYPERLINK("bad")' },
    ]);
    const csv = exportCampaignResults(campaign);
    expect(csv).toContain(`"'=HYPERLINK(""bad"")"`);
    expect(csv).toContain('"pending"');
  });
});
