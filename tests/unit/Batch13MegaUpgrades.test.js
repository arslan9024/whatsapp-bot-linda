/**
 * @file Batch13MegaUpgrades.test.js
 * @description Unit tests for Mega Batch 13 (Upgrades 171-185).
 */

import { AudioVoiceNoteStreamingPlayer } from '../../src/intelligence/AudioVoiceNoteStreamingPlayer.js';
import { PdfBrochureDrawerBackend } from '../../src/intelligence/PdfBrochureDrawerBackend.js';
import { WebSocketToastDispatcher } from '../../src/core/WebSocketToastDispatcher.js';
import { BroadcastVariableInterpolator } from '../../src/outreach/BroadcastVariableInterpolator.js';
import { CsvExcelReportGenerator } from '../../src/core/CsvExcelReportGenerator.js';
import { MultiAccountSwitcherManager } from '../../src/accounts/MultiAccountSwitcherManager.js';
import { MobileViewportLayoutAdapter } from '../../src/connection/MobileViewportLayoutAdapter.js';
import { DynamicConfigBackend } from '../../src/core/DynamicConfigBackend.js';
import { GoogleSheetsLiveSync } from '../../src/integrations/GoogleSheetsLiveSync.js';
import { GoogleContactsTwoWaySync } from '../../src/integrations/GoogleContactsTwoWaySync.js';
import { TelegramSupervisorDispatcher } from '../../src/integrations/TelegramSupervisorDispatcher.js';
import { ZapierMakeWebhookGateway } from '../../src/integrations/ZapierMakeWebhookGateway.js';
import { CalendlyAppointmentBooker } from '../../src/integrations/CalendlyAppointmentBooker.js';
import { EmailExecutiveReportDispatcher } from '../../src/integrations/EmailExecutiveReportDispatcher.js';
import { TwilioBackupSmsGateway } from '../../src/integrations/TwilioBackupSmsGateway.js';

describe('Mega Batch 13 (Upgrades 171–185) Test Suite', () => {
  // Upgrade 171
  test('Upgrade 171: AudioVoiceNoteStreamingPlayer prepares headers and validates stream buffers', () => {
    const player = new AudioVoiceNoteStreamingPlayer();
    const buffer = Buffer.alloc(1024);

    const stream = player.prepareAudioStream(buffer, 'audio/ogg; codecs=opus');
    expect(stream.canStream).toBe(true);
    expect(stream.headers['Content-Type']).toBe('audio/ogg; codecs=opus');
    expect(stream.headers['Content-Length']).toBe(1024);
  });

  // Upgrade 172
  test('Upgrade 172: PdfBrochureDrawerBackend extracts preview page counts and file size', () => {
    const backend = new PdfBrochureDrawerBackend();
    const fakePdf = Buffer.from('%PDF-1.4\n/Type /Page\n/Type /Page\n%%EOF');

    const meta = backend.extractPreviewMetadata(fakePdf, 'palm_villas.pdf');
    expect(meta.valid).toBe(true);
    expect(meta.estimatedPages).toBe(2);
    expect(meta.fileName).toBe('palm_villas.pdf');
  });

  // Upgrade 173
  test('Upgrade 173: WebSocketToastDispatcher registers clients and formats notifications', () => {
    const dispatcher = new WebSocketToastDispatcher();
    const mockWs = { readyState: 1, send: jest.fn() };

    dispatcher.registerClient(mockWs);
    const sent = dispatcher.broadcastToast('VIP Lead', 'Rashid just qualified for Palm Penthouse', 'success');

    expect(sent).toBe(1);
    expect(mockWs.send).toHaveBeenCalled();

    dispatcher.removeClient(mockWs);
  });

  // Upgrade 174
  test('Upgrade 174: BroadcastVariableInterpolator replaces variables and respects fallbacks', () => {
    const interpolator = new BroadcastVariableInterpolator();
    const template = 'Hi {firstName|Valued Client}, check {community} units under AED {budget}.';

    const res1 = interpolator.interpolate(template, { firstName: 'Ali', community: 'Downtown', budget: '2M' });
    expect(res1).toBe('Hi Ali, check Downtown units under AED 2M.');

    const resFallback = interpolator.interpolate(template, { community: 'Dubai Marina', budget: '1.5M' });
    expect(resFallback).toBe('Hi Valued Client, check Dubai Marina units under AED 1.5M.');
  });

  // Upgrade 175
  test('Upgrade 175: CsvExcelReportGenerator generates CSV with Excel BOM', () => {
    const generator = new CsvExcelReportGenerator();
    const headers = ['Name', 'Phone', 'Community'];
    const rows = [{ Name: 'Amir', Phone: '+971501112233', Community: 'Business Bay' }];

    const csv = generator.generateCsv(headers, rows);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Name","Phone","Community"');
    expect(csv).toContain('"Amir","+971501112233","Business Bay"');
  });

  // Upgrade 176
  test('Upgrade 176: MultiAccountSwitcherManager switches active account context', () => {
    const switcher = new MultiAccountSwitcherManager([
      { id: 'acc_1', name: 'Bot 1' },
      { id: 'acc_2', name: 'Bot 2' }
    ]);

    expect(switcher.getActiveAccount().id).toBe('acc_1');
    switcher.switchAccount('acc_2');
    expect(switcher.getActiveAccount().id).toBe('acc_2');

    const list = switcher.listAccounts();
    expect(list.find(a => a.id === 'acc_2').isActive).toBe(true);
  });

  // Upgrade 177
  test('Upgrade 177: MobileViewportLayoutAdapter resolves layout profile and density', () => {
    const adapter = new MobileViewportLayoutAdapter();

    expect(adapter.resolveLayoutProfile(400).device).toBe('MOBILE');
    expect(adapter.resolveLayoutProfile(400).density).toBe('compact');
    expect(adapter.resolveLayoutProfile(800).device).toBe('TABLET');
    expect(adapter.resolveLayoutProfile(1400).device).toBe('DESKTOP');
  });

  // Upgrade 178
  test('Upgrade 178: DynamicConfigBackend gets and updates runtime settings', () => {
    const backend = new DynamicConfigBackend({ dailyOutboundLimit: 300 });
    expect(backend.getSettings().dailyOutboundLimit).toBe(300);

    backend.updateSettings({ dailyOutboundLimit: 600, minJitterSeconds: 5 });
    expect(backend.getSettings().dailyOutboundLimit).toBe(600);
    expect(backend.getSettings().minJitterSeconds).toBe(5);
  });

  // Upgrade 179
  test('Upgrade 179: GoogleSheetsLiveSync formats rows and parses incoming sheet arrays', () => {
    const sync = new GoogleSheetsLiveSync();
    const row = sync.formatRow({
      name: 'Tariq',
      phone: '+971501234567',
      community: 'Dubai Hills',
      budgetAed: 4500000,
      status: 'QUALIFIED'
    });

    expect(row[1]).toBe('Tariq');
    expect(row[4]).toBe(4500000);

    const parsed = sync.parseRow(row);
    expect(parsed.name).toBe('Tariq');
    expect(parsed.budgetAed).toBe(4500000);
  });

  // Upgrade 180
  test('Upgrade 180: GoogleContactsTwoWaySync generates Google People API contact resource', () => {
    const sync = new GoogleContactsTwoWaySync();
    const res = sync.formatGoogleContactResource(
      { name: 'Sarah Connor', phone: '+971509998877', email: 's@connor.com', community: 'Jumeirah' },
      ['Linda_VIP']
    );

    expect(res.names[0].givenName).toBe('Sarah');
    expect(res.phoneNumbers[0].value).toBe('+971509998877');
    expect(res.userDefined[0].value).toBe('Linda_VIP');
  });

  // Upgrade 181
  test('Upgrade 181: TelegramSupervisorDispatcher formats HTML notification payload', () => {
    const tg = new TelegramSupervisorDispatcher({ chatId: '123456' });
    const payload = tg.formatTelegramPayload({
      title: 'CRITICAL ESCALATION',
      severity: 'CRITICAL',
      description: 'Broker failed to respond to UHNW lead in 30 minutes.'
    });

    expect(payload.chat_id).toBe('123456');
    expect(payload.text).toContain('🚨 <b>CRITICAL ESCALATION</b>');
    expect(payload.parse_mode).toBe('HTML');
  });

  // Upgrade 182
  test('Upgrade 182: ZapierMakeWebhookGateway packages standard event payloads', () => {
    const gateway = new ZapierMakeWebhookGateway();
    const payload = gateway.createWebhookPayload('lead.qualified', { name: 'Elena', budget: 3500000 });

    expect(payload.event).toBe('lead.qualified');
    expect(payload.data.name).toBe('Elena');
    expect(payload.source).toBe('whatsapp-bot-linda');
  });

  // Upgrade 183
  test('Upgrade 183: CalendlyAppointmentBooker creates booking URLs and parses webhooks', () => {
    const booker = new CalendlyAppointmentBooker({ baseUrl: 'https://cal.com/linda-viewings' });
    const url = booker.generateBookingUrl({
      clientName: 'Mansour',
      clientEmail: 'm@dubai.ae',
      propertyRef: 'EMAAR-101'
    });

    expect(url).toContain('https://cal.com/linda-viewings');
    expect(url).toContain('name=Mansour');

    const appointment = booker.parseBookingWebhook({ uid: 'cal_99', name: 'Mansour', email: 'm@dubai.ae' });
    expect(appointment.bookingId).toBe('cal_99');
    expect(appointment.status).toBe('SCHEDULED');
  });

  // Upgrade 184
  test('Upgrade 184: EmailExecutiveReportDispatcher compiles multipart executive report', () => {
    const dispatcher = new EmailExecutiveReportDispatcher();
    const email = dispatcher.compileEmailReport({
      totalInquiries: 50,
      qualifiedLeads: 12,
      totalVolumeAed: 35000000
    }, 'ceo@brokerage.ae');

    expect(email.to).toBe('ceo@brokerage.ae');
    expect(email.subject).toContain('Daily Executive Briefing');
    expect(email.html).toContain('35,000,000');
    expect(email.text).toContain('Total Inquiries: 50');
  });

  // Upgrade 185
  test('Upgrade 185: TwilioBackupSmsGateway formats fallback SMS payloads', () => {
    const gateway = new TwilioBackupSmsGateway({ fromNumber: '+19998887777' });
    const sms = gateway.createSmsPayload('+971501234567', 'Your viewing is confirmed for tomorrow 4 PM.');

    expect(sms.To).toBe('+971501234567');
    expect(sms.From).toBe('+19998887777');
    expect(sms.Body).toContain('Your viewing is confirmed');
  });
});
