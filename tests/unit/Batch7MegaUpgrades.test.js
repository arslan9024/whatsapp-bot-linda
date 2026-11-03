import { ContactPhoneNormalizer } from '../../src/outreach/ContactPhoneNormalizer.js';
import { CampaignConversionAnalytics } from '../../src/outreach/CampaignConversionAnalytics.js';
import { ReferralIncentivePrompter } from '../../src/outreach/ReferralIncentivePrompter.js';
import { OpenHouseBroadcastFormatter } from '../../src/outreach/OpenHouseBroadcastFormatter.js';
import { LandlordVacancyPrompter } from '../../src/outreach/LandlordVacancyPrompter.js';
import { OmnichannelFailoverPayload } from '../../src/outreach/OmnichannelFailoverPayload.js';
import { HubSpotCrmFormatter } from '../../src/integrations/HubSpotCrmFormatter.js';
import { SalesforcePropertyCloudMapper } from '../../src/integrations/SalesforcePropertyCloudMapper.js';
import { SlackOperationsNotifier } from '../../src/integrations/SlackOperationsNotifier.js';
import { OutboundWebhookDispatcher } from '../../src/integrations/OutboundWebhookDispatcher.js';
import { GoogleDriveCollateralResolver } from '../../src/integrations/GoogleDriveCollateralResolver.js';
import { MongoChangeStreamsFilter } from '../../src/integrations/MongoChangeStreamsFilter.js';
import { ViewingBookingLinkGenerator } from '../../src/integrations/ViewingBookingLinkGenerator.js';
import { DailyExecutiveDigestCompiler } from '../../src/integrations/DailyExecutiveDigestCompiler.js';
import { DocuSignWebhookReceiver } from '../../src/integrations/DocuSignWebhookReceiver.js';

describe('Mega Batch 7 Upgrades 81–95 (Outreach Conversion, CRM & Cloud Integrations)', () => {
  it('Upgrade 81: ContactPhoneNormalizer normalizes local and E.164 numbers', () => {
    const normalizer = new ContactPhoneNormalizer();
    expect(normalizer.normalizeE164('0501234567')).toBe('+971501234567');
    expect(normalizer.toWhatsAppJid('0501234567')).toBe('971501234567@c.us');
  });

  it('Upgrade 82: CampaignConversionAnalytics computes conversion percentages', () => {
    const analytics = new CampaignConversionAnalytics();
    const res = analytics.calculateFunnel({ sent: 100, delivered: 90, responded: 20, qualified: 10, closed: 2 });
    expect(res.metrics.deliveryRatePercent).toBe(90);
    expect(res.metrics.responseRatePercent).toBe(22.2);
    expect(res.healthRating).toBe('HIGH_ENGAGEMENT');
  });

  it('Upgrade 83: ReferralIncentivePrompter formats prompt and detects referral intent', () => {
    const prompter = new ReferralIncentivePrompter();
    expect(prompter.formatReferralPrompt({ clientName: 'Hamdan' })).toContain('Hamdan');
    expect(prompter.isReferralIntent('my friend wants to buy in Dubai')).toBe(true);
  });

  it('Upgrade 84: OpenHouseBroadcastFormatter formats weekend event invites', () => {
    const formatter = new OpenHouseBroadcastFormatter();
    const invite = formatter.formatInvitation({ community: 'DAMAC Hills 2' });
    expect(invite).toContain('WEEKEND OPEN HOUSE');
    expect(invite).toContain('DAMAC Hills 2');
  });

  it('Upgrade 85: LandlordVacancyPrompter structures inventory status check', () => {
    const prompter = new LandlordVacancyPrompter();
    const msg = prompter.formatVacancyCheck({ ownerName: 'Saeed', unitNumber: 'Villa 102' });
    expect(msg).toContain('Villa 102');
    expect(msg).toContain('tenanted or vacant');
  });

  it('Upgrade 86: OmnichannelFailoverPayload creates SMS and Email payloads', () => {
    const failover = new OmnichannelFailoverPayload();
    const sms = failover.formatSmsPayload({ toPhone: '+971501', messageBody: 'Short alert' });
    expect(sms.channel).toBe('SMS');
    expect(sms.body.length).toBeLessThanOrEqual(160);
  });

  it('Upgrade 87: HubSpotCrmFormatter structures properties for contacts and deals', () => {
    const hubspot = new HubSpotCrmFormatter();
    const contact = hubspot.formatContactProperties({ phone: '+971501', firstName: 'Mona', budgetAed: 2000000 });
    expect(contact.properties.firstname).toBe('Mona');
    expect(contact.properties.lead_source).toBe('WHATSAPP_BOT_LINDA');
  });

  it('Upgrade 88: SalesforcePropertyCloudMapper maps Lead and Opportunity SObjects', () => {
    const sf = new SalesforcePropertyCloudMapper();
    const lead = sf.mapLeadSObject({ fullName: 'John Doe', phone: '+971501', community: 'Downtown' });
    expect(lead.attributes.type).toBe('Lead');
    expect(lead.LeadSource).toBe('WhatsApp Linda Bot');
  });

  it('Upgrade 89: SlackOperationsNotifier formats Block Kit deal notifications', () => {
    const slack = new SlackOperationsNotifier();
    const block = slack.formatLeadAlertBlock({ leadName: 'Vikram', budgetAed: 4500000, community: 'Palm Jumeirah' });
    expect(block.blocks.length).toBeGreaterThan(1);
    expect(block.text).toContain('Vikram');
  });

  it('Upgrade 90: OutboundWebhookDispatcher generates standardized JSON event envelopes', () => {
    const dispatcher = new OutboundWebhookDispatcher();
    const evt = dispatcher.formatWebhookEvent('LEAD_QUALIFIED', { leadId: 'lead_10' });
    expect(evt.eventId).toContain('evt_');
    expect(evt.eventType).toBe('LEAD_QUALIFIED');
  });

  it('Upgrade 91: GoogleDriveCollateralResolver maps communities to drive vaults', () => {
    const resolver = new GoogleDriveCollateralResolver();
    const vault = resolver.resolveBrochurePath('DAMAC_HILLS_2');
    expect(vault.brochureFileName).toContain('damac_hills_2');
  });

  it('Upgrade 92: MongoChangeStreamsFilter categorizes lead mutation events', () => {
    const filter = new MongoChangeStreamsFilter();
    const change = filter.categorizeChangeEvent({ operationType: 'insert', ns: { coll: 'propertycontacts' } });
    expect(change.shouldSyncToCrm).toBe(true);
  });

  it('Upgrade 93: ViewingBookingLinkGenerator formats pre-filled Calendly links', () => {
    const booking = new ViewingBookingLinkGenerator();
    const url = booking.generateBookingUrl({ clientName: 'Faisal', community: 'DAMAC Hills 2' });
    expect(url).toContain('name=Faisal');
    expect(url).toContain('DAMAC+Hills+2');
  });

  it('Upgrade 94: DailyExecutiveDigestCompiler compiles executive morning reports', () => {
    const digest = new DailyExecutiveDigestCompiler();
    const report = digest.compileDailyDigest({ messagesSent: 200, messagesReceived: 45, leadsQualified: 8 });
    expect(report.kpis.qualifiedLeadsCount).toBe(8);
    expect(report.kpis.responseRatePercent).toBe(22.5);
  });

  it('Upgrade 95: DocuSignWebhookReceiver parses contract completion events', () => {
    const docusign = new DocuSignWebhookReceiver();
    const res = docusign.parseSignatureEvent({ event: 'envelope-completed', envelopeId: 'env_123' });
    expect(res.isFullySigned).toBe(true);
    expect(res.status).toBe('FULLY_EXECUTED');
  });
});
