import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from '@e965/xlsx';
import CampaignWorkspace, {
  normalizeRecipients,
} from '../../code/Services/CampaignWorkspace.js';
import TerminalCampaignMenu from '../../code/utils/TerminalCampaignMenu.js';

describe('Terminal-only headless campaign controls', () => {
  let directory;
  let workspace;
  let menu;
  let output;
  let send;
  let readSheet;
  const phone = '+15550000001';
  const rows = [
    { phone: '15550000002', name: 'Alex', group: 'Customers', company: 'Acme' },
    { phone: '15550000003', name: 'Sam', group: 'Partners', company: 'North' },
  ];

  beforeEach(() => {
    directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'linda-terminal-campaign-'),
    );
    send = jest.fn().mockResolvedValue({});
    output = jest.fn();
    readSheet = jest.fn().mockResolvedValue({
      success: true,
      data: [
        ['phone', 'name', 'company'],
        [rows[0].phone, rows[0].name, 'Acme'],
      ],
    });
    workspace = new CampaignWorkspace({
      directory,
      accounts: () => [{ phone, name: 'Master', active: true }],
      sendRecipient: send,
      checkRecipient: async () => ({ allowed: true }),
      log: jest.fn(),
    });
    workspace.initialize();
    menu = new TerminalCampaignMenu({ workspace, readSheet, output });
  });

  afterEach(async () => {
    await menu.close();
    jest.useRealTimers();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  async function enter(...lines) {
    for (const line of lines) {
      expect(await menu.handleInput(line)).toBe(true);
    }
  }

  function openDraft(contacts = rows) {
    const draft = workspace.saveDraft({
      name: 'Updates',
      template: 'Hello {name} from {company}',
      intervalMs: 3000,
      accountPhone: phone,
      contacts: normalizeRecipients(contacts).contacts,
    });
    menu.open();
    return draft;
  }

  test('opens a counted numbered list, routes only active input, and exits without sending', async () => {
    expect(await menu.handleInput('1')).toBe(false);
    openDraft();
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('CAMPAIGNS | 1 saved | headless'),
    );
    await enter('2', '00', '0');
    expect(menu.active).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  test('creates and persists a draft from pasted CSV, numbered account, and escaped newlines', async () => {
    menu.open();
    await enter(
      '1',
      'Offers',
      'Hi {name}\\nFrom {company}',
      '3',
      '1',
      '2',
      'phone,name,company\\n15550000002,Alex,Acme\\n15550000002,Duplicate,Acme\\n12,Bad,Acme',
    );
    expect(workspace.campaigns).toHaveLength(1);
    expect(menu.campaign()).toMatchObject({
      name: 'Offers',
      template: 'Hi {name}\nFrom {company}',
      intervalMs: 3000,
      accountPhone: phone,
    });
    expect(menu.campaign().contacts).toHaveLength(1);
    expect(output).toHaveBeenCalledWith(
      'Imported 1 | duplicates 1 | rejected 1',
    );
    expect(send).not.toHaveBeenCalled();
    await enter('5', '1');
    expect(output).toHaveBeenCalledWith(
      'Preview for Alex:\nHi Alex\nFrom Acme',
    );
    const restored = new CampaignWorkspace({ directory });
    restored.initialize();
    expect(restored.campaigns[0].name).toBe('Offers');
  });

  test.each(['csv', 'xlsx'])(
    'creates a draft using a quoted %s file path',
    async extension => {
      const filename = path.join(directory, `my contacts.${extension}`);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(rows),
        'Contacts',
      );
      fs.writeFileSync(
        filename,
        extension === 'csv'
          ? XLSX.utils.sheet_to_csv(book.Sheets.Contacts)
          : XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }),
      );
      menu.open();
      await enter(
        '1',
        'File test',
        'Hi {name}',
        '3',
        '1',
        '1',
        `"${filename}"`,
      );
      expect(menu.campaign().contacts).toHaveLength(2);
      expect(menu.view).toBe('campaign');
    },
  );

  test('imports Google Sheets without changing case-sensitive IDs and surfaces failures', async () => {
    menu.open();
    await enter('1', 'Sheets', 'Hi {name}', '3', '1', '3', 'AbC123Id', '');
    expect(readSheet).toHaveBeenCalledWith('AbC123Id', 'Sheet1!A1:Z5001');
    expect(menu.campaign().contacts[0].name).toBe('Alex');
    readSheet.mockResolvedValue({ success: false, error: 'Access denied' });
    await enter('3', '3', 'AnotherID', '');
    expect(output).toHaveBeenCalledWith('Campaign error: Access denied');
    expect(menu.campaign().contacts).toHaveLength(1);
  });

  test('filters groups, toggles numbered recipients and cannot select known opt-outs', async () => {
    openDraft([
      ...rows,
      { phone: '15550000004', name: 'Opt-out', opted_out: true },
    ]);
    await enter('2', '4', '13', 'Customers', '1');
    expect(menu.campaign().contacts[0].selected).toBe(false);
    await enter('14');
    expect(menu.campaign().contacts[0].selected).toBe(true);
    await enter('15');
    expect(menu.campaign().contacts[0].selected).toBe(false);
    await enter('13', '', '3');
    expect(output).toHaveBeenCalledWith(
      'Campaign error: Opted-out contacts cannot be selected.',
    );
    expect(menu.campaign().contacts[2].selected).toBe(false);
  });

  test('adds and removes attachments by number; invalid paths do not silently succeed', async () => {
    openDraft();
    const filename = path.join(directory, 'guide.pdf');
    fs.writeFileSync(filename, '%PDF-test');
    await enter('2', '6', filename);
    expect(menu.campaign().attachments[0].name).toBe('guide.pdf');
    await enter('7', '1');
    expect(menu.campaign().attachments).toHaveLength(0);
    await enter('6', path.join(directory, 'missing.pdf'));
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('Campaign error: ENOENT'),
    );
    expect(menu.campaign().attachments).toHaveLength(0);
  });

  test('requires explicit numeric confirmation and starts only after it is given', async () => {
    const draft = openDraft([rows[0]]);
    await enter('2', '8', '0');
    expect(send).not.toHaveBeenCalled();
    await enter('8', 'yes');
    expect(send).not.toHaveBeenCalled();
    await enter('8', '1');
    await workspace.jobs.get(draft.id);
    expect(send).toHaveBeenCalledTimes(1);
    expect(draft.status).toBe('completed');
    await enter('8', '1');
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('pauses and resumes from numbered actions; emits progress only when changed', async () => {
    jest.useFakeTimers();
    const draft = openDraft();
    let finish;
    send.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    await enter('2', '8', '1');
    expect(send).toHaveBeenCalledTimes(1);
    await enter('9');
    finish({});
    await workspace.jobs.get(draft.id);
    expect(draft.contacts[1].status).toBe('pending');
    await enter('8', '1');
    menu.progress();
    const count = output.mock.calls.length;
    menu.progress();
    expect(output.mock.calls).toHaveLength(count);
    await jest.advanceTimersByTimeAsync(3000);
    await workspace.jobs.get(draft.id);
    expect(draft.status).toBe('completed');
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('creates a 6-10 second attachment-only draft and displays task overview and storage scope', async () => {
    menu.open();
    await enter(
      '1',
      'Media task',
      '',
      '6-10',
      '1',
      '2',
      'phone,name\\n15550000002,Alex',
    );
    expect(menu.campaign()).toMatchObject({
      template: '',
      intervalMs: 6000,
      intervalMaxMs: 10000,
    });
    expect(output).toHaveBeenCalledWith('Message: None');
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('interval 6-10s | attachments 0 files'),
    );
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('No browser extension or device sync'),
    );
  });

  test('filters tasks into Drafts, Sending and History without sending anything', async () => {
    const draft = openDraft();
    await enter('drafts');
    expect(menu.list.map(item => item.id)).toEqual([draft.id]);
    draft.status = 'paused';
    await enter('sending');
    expect(menu.list.map(item => item.id)).toEqual([draft.id]);
    await enter('history');
    expect(menu.list).toHaveLength(0);
    draft.status = 'stopped';
    await enter('history');
    expect(menu.list.map(item => item.id)).toEqual([draft.id]);
    expect(send).not.toHaveBeenCalled();
  });

  test('workspace help explains terminal-only operation, local persistence and delivery safety', async () => {
    openDraft();
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('WhatsApp accounts: 1 connected'),
    );
    await enter('help');
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining(`saved locally in ${directory}`),
    );
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining(
        'Unknown delivery is never retried automatically',
      ),
    );
    workspace.accounts = () => [{ phone, name: 'Master', active: false }];
    await enter('2');
    expect(output).toHaveBeenCalledWith(expect.stringContaining('OFFLINE'));
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('link-code <phone> or link-qr <phone>'),
    );
    expect(send).not.toHaveBeenCalled();
  });

  test('requires confirmation for stop and delete and returns to the list after deletion', async () => {
    const draft = openDraft();
    draft.status = 'paused';
    await enter('2', '12', '0');
    expect(draft.status).toBe('paused');
    await enter('12', '1');
    expect(draft.status).toBe('stopped');
    await enter('13', '0');
    expect(workspace.campaigns).toHaveLength(1);
    await enter('13', '1');
    expect(workspace.campaigns).toHaveLength(0);
    expect(menu.view).toBe('home');
    expect(send).not.toHaveBeenCalled();
  });

  test('Failed results include uncertain deliveries, mask numbers and show review warnings', async () => {
    const draft = openDraft();
    draft.contacts[0].status = 'sent';
    draft.contacts[1].status = 'not_sent';
    draft.contacts[1].deliveryUnknown = true;
    await enter('2', '14', 'failed', '10', '1');
    expect(output).toHaveBeenCalledWith('Results: failed | 1 recipients');
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('155****0003 | not_sent'),
    );
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining(
        'Delivery status unknown. Review WhatsApp before retrying.',
      ),
    );
    expect(
      output.mock.calls.some(([text]) => text.includes('Sam 15550000003 |')),
    ).toBe(false);
    await enter('14', 'all', '10', '1');
    expect(output).toHaveBeenCalledWith('Results: all | 2 recipients');
  });

  test('paginates results and exports CSV without overwriting existing files', async () => {
    openDraft([{ ...rows[0], name: '=BAD' }]);
    await enter('2', '10', '1');
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('1. =BAD 155****0002 | pending'),
    );
    const filename = path.join(directory, 'results.csv');
    await enter('11', filename);
    const exported = fs.readFileSync(filename, 'utf8');
    expect(exported).toContain(`"'=BAD"`);
    await enter('11', filename);
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('Campaign error: EEXIST'),
    );
    expect(fs.readFileSync(filename, 'utf8')).toBe(exported);
  });

  test('cancels prompts and rejects invalid interval/account without creating or sending a campaign', async () => {
    menu.open();
    await enter('1', '0');
    expect(menu.pending).toBe(null);
    expect(workspace.campaigns).toHaveLength(0);
    await enter(
      '1',
      'Bad',
      'Hi',
      '1',
      '1',
      '2',
      'phone,name\\n15550000002,Alex',
    );
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('Campaign error: Sending interval'),
    );
    expect(workspace.campaigns).toHaveLength(0);
    await enter('1', 'Bad', 'Hi', '3', '99');
    expect(output).toHaveBeenCalledWith(
      'Campaign error: Choose a listed account number.',
    );
    expect(send).not.toHaveBeenCalled();
  });
});
