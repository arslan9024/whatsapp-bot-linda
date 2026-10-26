import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import CampaignWorkspace from '../../code/Services/CampaignWorkspace.js';
import ContactConsentService from '../../code/Services/ContactConsentService.js';
import { campaignService } from '../../code/Services/CampaignService.js';
import { campaignRateLimiter } from '../../code/Services/CampaignRateLimiter.js';
import { createTerminalCampaigns } from '../../code/utils/CampaignWorkspaceSetup.js';

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { connection: { readyState: 1 } },
}));
jest.mock('whatsapp-web.js', () => ({
  __esModule: true,
  default: {
    MessageMedia: jest
      .fn()
      .mockImplementation((mime, data, name) => ({ mime, data, name })),
  },
}));
jest.mock('../../code/Services/ContactConsentService.js', () => ({
  __esModule: true,
  default: { getConsent: jest.fn() },
}));
jest.mock('../../code/Services/CampaignService.js', () => ({
  campaignService: {
    reserveCampaignMessage: jest.fn(),
    completeReservedCampaignMessage: jest.fn(),
    failReservedCampaignMessage: jest.fn(),
  },
}));
jest.mock('../../code/Services/CampaignRateLimiter.js', () => ({
  campaignRateLimiter: { canSendMessage: jest.fn(), recordOutcome: jest.fn() },
}));

describe('Headless campaign transport uses existing linked clients', () => {
  let directory;
  let menu;
  let client;
  const phone = '+15550000001';
  const contact = { phone: '15550000002', name: 'Alex' };
  const campaign = {
    id: 'campaign-1',
    accountPhone: phone,
    attachments: [],
    template: 'Hi {name}',
    intervalMs: 3000,
  };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'linda-transport-test-'));
    // Redirect workspace storage without changing the transport or the shared process cwd.
    const initialize = CampaignWorkspace.prototype.initialize;
    jest
      .spyOn(CampaignWorkspace.prototype, 'initialize')
      .mockImplementation(function () {
        this.directory = directory;
        this.file = path.join(directory, 'campaigns.json');
        return initialize.call(this);
      });
    mongoose.connection.readyState = 1;
    client = {
      getState: jest.fn().mockResolvedValue('CONNECTED'),
      sendMessage: jest.fn().mockResolvedValue({ id: 'ack' }),
    };
    ContactConsentService.getConsent.mockResolvedValue(null);
    campaignRateLimiter.canSendMessage.mockResolvedValue({
      allowed: true,
      campaignRemaining: 10,
      accountRemaining: 45,
    });
    campaignService.reserveCampaignMessage.mockResolvedValue({
      success: true,
      log: { messageId: 'reserved' },
    });
    campaignService.completeReservedCampaignMessage.mockResolvedValue({
      success: true,
    });
    campaignService.failReservedCampaignMessage.mockResolvedValue({});
    menu = createTerminalCampaigns({
      accountClients: new Map([[phone, client]]),
      connectionManagers: new Map([[phone, { state: 'CONNECTED' }]]),
      accountConfigManager: {
        getAllAccounts: () => [{ phoneNumber: phone, displayName: 'Master' }],
      },
      googleSheetsManager: null,
      logBot: jest.fn(),
    });
  });

  afterEach(async () => {
    await menu.close();
    jest.useRealTimers();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('uses an already-connected account without launching another browser and excludes revoked consent', async () => {
    expect(menu.workspace.accounts()).toEqual([
      { phone, name: 'Master', active: true },
    ]);
    expect(
      await menu.workspace.checkRecipient(campaign, contact),
    ).toMatchObject({ allowed: true });
    expect(campaignRateLimiter.canSendMessage).toHaveBeenCalledWith(
      'campaign-1',
      phone,
      10,
    );
    ContactConsentService.getConsent.mockResolvedValue({ status: 'revoked' });
    expect(
      await menu.workspace.checkRecipient(campaign, contact),
    ).toMatchObject({ allowed: false, reason: 'Recipient opted out.' });
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  test('fails closed when MongoDB, account state, or daily capacity is unavailable', async () => {
    mongoose.connection.readyState = 0;
    expect(
      await menu.workspace.checkRecipient(campaign, contact),
    ).toMatchObject({ allowed: false, pause: true });
    mongoose.connection.readyState = 1;
    client.getState.mockResolvedValue('UNPAIRED');
    expect(
      await menu.workspace.checkRecipient(campaign, contact),
    ).toMatchObject({ allowed: false, pause: true });
    client.getState.mockResolvedValue('CONNECTED');
    campaignRateLimiter.canSendMessage.mockResolvedValue({
      allowed: true,
      campaignRemaining: 1,
      accountRemaining: 45,
    });
    expect(
      await menu.workspace.checkRecipient(
        { ...campaign, attachments: [{}, {}] },
        contact,
      ),
    ).toMatchObject({
      allowed: false,
      pause: true,
      reason: expect.stringContaining('needs 2 messages'),
    });
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  test('sends acknowledged text through the existing client and logs each actual message', async () => {
    await menu.workspace.sendRecipient(campaign, contact, 'Hi Alex', []);
    expect(client.sendMessage).toHaveBeenCalledWith(
      '15550000002@c.us',
      'Hi Alex',
      undefined,
    );
    expect(
      campaignService.completeReservedCampaignMessage,
    ).toHaveBeenCalledWith('reserved');
    expect(campaignRateLimiter.recordOutcome).toHaveBeenCalledWith(phone, true);
  });

  test('duplicate reservations are not sent; missing acknowledgments fail explicitly without completing', async () => {
    campaignService.reserveCampaignMessage.mockResolvedValueOnce({
      success: true,
      duplicate: true,
    });
    expect(
      await menu.workspace.sendRecipient(campaign, contact, 'Hi', []),
    ).toMatchObject({ skipped: true });
    expect(client.sendMessage).not.toHaveBeenCalled();
    client.sendMessage.mockResolvedValue(undefined);
    await expect(
      menu.workspace.sendRecipient(campaign, contact, 'Hi', []),
    ).rejects.toThrow('did not acknowledge');
    expect(campaignService.failReservedCampaignMessage).toHaveBeenCalledWith(
      'reserved',
      expect.stringContaining('did not acknowledge'),
    );
    expect(
      campaignService.completeReservedCampaignMessage,
    ).not.toHaveBeenCalled();
  });

  test('media attachments have captions/document flags, pacing and independent daily accounting', async () => {
    jest.useFakeTimers();
    const files = [
      { mime: 'image/png', data: 'YQ==', name: 'image.png' },
      { mime: 'application/pdf', data: 'Yg==', name: 'guide.pdf' },
    ];
    const sending = menu.workspace.sendRecipient(
      campaign,
      contact,
      'Hi Alex',
      files,
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2999);
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await sending;
    expect(client.sendMessage).toHaveBeenNthCalledWith(
      1,
      '15550000002@c.us',
      expect.objectContaining({ name: 'image.png' }),
      { caption: 'Hi Alex', sendMediaAsDocument: false },
    );
    expect(client.sendMessage).toHaveBeenNthCalledWith(
      2,
      '15550000002@c.us',
      expect.objectContaining({ name: 'guide.pdf' }),
      { caption: undefined, sendMediaAsDocument: true },
    );
    expect(campaignService.reserveCampaignMessage).toHaveBeenNthCalledWith(
      2,
      campaign.id,
      contact.phone,
      contact.name,
      'Hi Alex',
      phone,
      'part-2',
    );
    expect(
      campaignService.completeReservedCampaignMessage,
    ).toHaveBeenCalledTimes(2);
    expect(campaignRateLimiter.canSendMessage).toHaveBeenCalledTimes(2);
  });

  test('enforces the sampled range delay between attachment sends', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    const sending = menu.workspace.sendRecipient(
      { ...campaign, intervalMs: 6000, intervalMaxMs: 10000 },
      contact,
      'Hi',
      [
        { mime: 'image/png', data: 'YQ==', name: 'a.png' },
        { mime: 'image/png', data: 'YQ==', name: 'b.png' },
      ],
    );
    await jest.advanceTimersByTimeAsync(0);
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(9999);
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await sending;
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });

  test('marks interrupted partial delivery and unacknowledged sends for review', async () => {
    client.sendMessage.mockResolvedValueOnce(undefined);
    await expect(
      menu.workspace.sendRecipient(campaign, contact, 'Hi', []),
    ).rejects.toMatchObject({ deliveryUnknown: true });
    jest.useFakeTimers();
    campaignRateLimiter.canSendMessage
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({
        allowed: false,
        reason: 'Account disconnected',
      });
    const sending = menu.workspace.sendRecipient(campaign, contact, 'Hi', [
      { mime: 'image/png', data: 'YQ==', name: 'a.png' },
      { mime: 'image/png', data: 'YQ==', name: 'b.png' },
    ]);
    const assertion = expect(sending).rejects.toMatchObject({
      message: 'Account disconnected',
      deliveryUnknown: true,
    });
    await jest.advanceTimersByTimeAsync(3000);
    await assertion;
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });

  test('an acknowledged send with a thrown log-update error remains review-required', async () => {
    campaignService.completeReservedCampaignMessage.mockRejectedValueOnce(
      new Error('Database disconnected after sending'),
    );
    await expect(
      menu.workspace.sendRecipient(campaign, contact, 'Hi', []),
    ).rejects.toMatchObject({ deliveryUnknown: true });
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
  });

  test('long captions send as separate text; accounting failure is not reported as success', async () => {
    jest.useFakeTimers();
    const text = 'a'.repeat(1025);
    const sending = menu.workspace.sendRecipient(campaign, contact, text, [
      { mime: 'video/mp4', data: 'YQ==', name: 'clip.mp4' },
    ]);
    await jest.advanceTimersByTimeAsync(3000);
    await sending;
    expect(client.sendMessage).toHaveBeenNthCalledWith(
      1,
      '15550000002@c.us',
      text,
      undefined,
    );
    expect(client.sendMessage).toHaveBeenNthCalledWith(
      2,
      '15550000002@c.us',
      expect.objectContaining({ name: 'clip.mp4' }),
      { caption: undefined, sendMediaAsDocument: false },
    );
    campaignService.completeReservedCampaignMessage.mockResolvedValue({
      success: false,
    });
    await expect(
      menu.workspace.sendRecipient(campaign, contact, 'Hi', []),
    ).rejects.toThrow('Do not resend');
  });
});
