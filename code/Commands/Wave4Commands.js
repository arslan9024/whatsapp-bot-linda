/**
 * ====================================================================
 * WAVE 4 COMMANDS
 * ====================================================================
 * Bot commands for Wave-4 features:
 *   LeadQualificationService, AppointmentSchedulerService,
 *   PropertyMatcherService, SalesPipelineService
 *
 * Commands:
 *   !lead report                                          — lead stats
 *   !lead list <hot|warm|cold>                           — list leads by tier
 *   !lead view <phone>                                   — view lead profile
 *
 *   !appointment book <propertyId> <date> <time>         — book viewing
 *   !appointment list                                    — upcoming appointments
 *   !appointment cancel <id>                             — cancel appointment
 *   !appointment available <propertyId> <date>           — check free slots
 *   !appointment remind                                  — send tomorrow reminders
 *   !appointment stats                                   — stats
 *
 *   !match search <budget_max> <bedrooms> <location>     — find properties
 *   !match stats                                         — matcher stats
 *   !match report                                        — full report
 *
 *   !pipeline add <contactPhone> <propertyId> [value]    — create deal
 *   !pipeline list [mine|all]                            — list deals
 *   !pipeline move <dealId> <stage>                      — advance stage
 *   !pipeline view <dealId>                              — deal details
 *   !pipeline report                                     — funnel report
 *   !pipeline stale                                      — stale deals
 *
 * @since Wave-4 Feature Expansion — May 2026
 */

import leadQualification from '../Services/LeadQualificationService.js';
import appointmentScheduler from '../Services/AppointmentSchedulerService.js';
import propertyMatcher from '../Services/PropertyMatcherService.js';
import salesPipeline from '../Services/SalesPipelineService.js';
import { STAGES } from '../Services/SalesPipelineService.js';
import { Logger } from '../utils/Logger.js';

const log = new Logger('Wave4Commands');

export class Wave4Commands {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
  }

  // ─────────────────────────────────────────────────────────────────
  // !lead
  // ─────────────────────────────────────────────────────────────────

  async handleLead(subCommand, args, msg) {
    switch ((subCommand || '').toLowerCase()) {
      case 'report':
        return leadQualification.reportText();

      case 'list': {
        const tier = (args[0] || 'hot').toLowerCase();
        const leads = await leadQualification.getLeadsByTier(tier);
        if (!leads.length) return `No ${tier} leads found.`;
        const lines = leads.map(l =>
          `${l.phone} — ${l.intent} | Budget: ${l.budget} | Score: ${l.score}/100`
        );
        return [`🔥 *${tier.toUpperCase()} Leads (${leads.length})*`, ...lines].join('\n');
      }

      case 'view': {
        const phone = args[0] || msg?.from;
        if (!phone) return '❌ Usage: !lead view <phone>';
        const lead = await leadQualification.getLead(phone);
        if (!lead) return `No lead profile found for ${phone}`;
        return [
          `👤 *Lead Profile: ${phone}*`,
          `Intent   : ${lead.intent}`,
          `Budget   : ${lead.budget}`,
          `Bedrooms : ${lead.bedrooms}`,
          `Location : ${lead.location}`,
          `Timeline : ${lead.timeline}`,
          `Score    : ${lead.score}/100`,
          `Tier     : ${lead.tier.toUpperCase()}`,
        ].join('\n');
      }

      default:
        return [
          '🏠 *Lead Commands*',
          `!lead report           — stats`,
          `!lead list <tier>      — hot / warm / cold`,
          `!lead view <phone>     — lead profile`,
        ].join('\n');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // !appointment
  // ─────────────────────────────────────────────────────────────────

  async handleAppointment(subCommand, args, msg) {
    switch ((subCommand || '').toLowerCase()) {
      case 'book': {
        const [propertyId, date, ...timeParts] = args;
        const timeSlot = timeParts.join(' ');
        if (!propertyId || !date || !timeSlot) {
          return '❌ Usage: !appointment book <propertyId> <YYYY-MM-DD> <HH:MM AM/PM>';
        }
        const phone = msg?.from || '';
        const result = await appointmentScheduler.bookAppointment({
          phone, propertyId, propertyLabel: propertyId, date, timeSlot,
        });
        if (!result.success) return `❌ ${result.error}`;
        return appointmentScheduler.formatBookingConfirmation(result.appointment);
      }

      case 'list': {
        const phone = msg?.from || '';
        const appts = await appointmentScheduler.getUpcoming(phone);
        if (!appts.length) return 'No upcoming appointments found.';
        const lines = appts.map(a => appointmentScheduler.formatAppointment(a));
        return [`📅 *Your Upcoming Appointments (${appts.length})*`, '', ...lines].join('\n');
      }

      case 'cancel': {
        const id = args[0];
        if (!id) return '❌ Usage: !appointment cancel <appointment_id>';
        const ok = await appointmentScheduler.cancelAppointment(id);
        return ok ? `✅ Appointment \`${id}\` cancelled.` : `❌ Appointment not found: ${id}`;
      }

      case 'available': {
        const [propertyId, date] = args;
        if (!propertyId || !date) return '❌ Usage: !appointment available <propertyId> <YYYY-MM-DD>';
        const slots = await appointmentScheduler.getAvailableSlots(propertyId, date);
        if (!slots.length) return `No available slots for ${propertyId} on ${date}.`;
        return [`📅 *Available Slots — ${propertyId} (${date})*`, ...slots.map(s => `  • ${s}`)].join('\n');
      }

      case 'remind': {
        const due = await appointmentScheduler.getDueTomorrow();
        return `📬 ${due.length} appointment(s) due tomorrow.`;
      }

      case 'stats':
        return appointmentScheduler.reportText();

      default:
        return [
          '📅 *Appointment Commands*',
          `!appointment book <propId> <date> <time>`,
          `!appointment list`,
          `!appointment cancel <id>`,
          `!appointment available <propId> <date>`,
          `!appointment remind`,
          `!appointment stats`,
        ].join('\n');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // !match
  // ─────────────────────────────────────────────────────────────────

  async handleMatch(subCommand, args, msg) {
    switch ((subCommand || '').toLowerCase()) {
      case 'search': {
        const [budgetMax, bedrooms, ...locationParts] = args;
        if (!budgetMax) return '❌ Usage: !match search <budget_max_AED> <bedrooms> <location>';
        const prefs = {
          budgetMin: 0,
          budgetMax: parseFloat(String(budgetMax).replace(/[^0-9.]/g, '')) || 0,
          bedrooms:  parseInt(bedrooms) || 0,
          locations: locationParts.length ? [locationParts.join(' ')] : [],
          intent:    'buy',
        };
        const results = propertyMatcher.findMatches(prefs, 5);
        return propertyMatcher.formatSearchResults(results, prefs);
      }

      case 'stats':
        return propertyMatcher.reportText();

      case 'report':
        return propertyMatcher.reportText();

      default:
        return [
          '🔍 *Property Match Commands*',
          `!match search <budget> <beds> <location>`,
          `!match stats`,
        ].join('\n');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // !pipeline
  // ─────────────────────────────────────────────────────────────────

  async handlePipeline(subCommand, args, msg) {
    switch ((subCommand || '').toLowerCase()) {
      case 'add': {
        const [contactPhone, propertyId, value] = args;
        if (!contactPhone || !propertyId) {
          return '❌ Usage: !pipeline add <contactPhone> <propertyId> [value_AED]';
        }
        const agentPhone = msg?.from || '';
        const deal = await salesPipeline.createDeal({
          contactPhone, propertyId, propertyLabel: propertyId,
          agentPhone, value: value || 0,
        });
        return [
          `✅ *Deal Created*`,
          `ID       : ${deal.dealId}`,
          `Contact  : ${deal.contactPhone}`,
          `Property : ${deal.propertyLabel}`,
          `Stage    : ${deal.stage.toUpperCase()}`,
          `Value    : AED ${Number(deal.value).toLocaleString()}`,
        ].join('\n');
      }

      case 'list': {
        const filter = (args[0] || 'mine').toLowerCase();
        const agentPhone = msg?.from || '';
        const deals = filter === 'all'
          ? await salesPipeline.getAllActive()
          : await salesPipeline.getDealsByAgent(agentPhone);
        if (!deals.length) return 'No active deals found.';
        const lines = deals.map(d => salesPipeline.formatDeal(d));
        return [`📊 *Active Deals (${deals.length})*`, '', ...lines].join('\n\n');
      }

      case 'move': {
        const [dealId, newStage] = args;
        if (!dealId || !newStage) return `❌ Usage: !pipeline move <dealId> <stage>\nStages: ${STAGES.join(', ')}`;
        const result = await salesPipeline.moveStage(dealId, newStage.toLowerCase());
        if (!result.success) return `❌ ${result.error}`;
        return `✅ Deal *${dealId}* moved to *${newStage.toUpperCase()}*`;
      }

      case 'view': {
        const dealId = args[0];
        if (!dealId) return '❌ Usage: !pipeline view <dealId>';
        const deals = await salesPipeline.getAllActive();
        const deal  = deals.find(d => d.dealId === dealId);
        if (!deal) return `❌ Deal not found: ${dealId}`;
        return salesPipeline.formatDeal(deal);
      }

      case 'report':
        return await salesPipeline.formatFunnelReport();

      case 'stale': {
        const stale = await salesPipeline.getStaleDeal();
        if (!stale.length) return '✅ No stale deals — pipeline is moving!';
        const lines = stale.map(d =>
          `⚠️  ${d.dealId} — stuck in ${d.stage} for ${d.daysSince}/${d.maxDays} days`
        );
        return [`🕰️ *Stale Deals (${stale.length})*`, ...lines].join('\n');
      }

      default:
        return [
          '📈 *Pipeline Commands*',
          `!pipeline add <phone> <propId> [value]`,
          `!pipeline list [mine|all]`,
          `!pipeline move <id> <stage>`,
          `!pipeline view <id>`,
          `!pipeline report`,
          `!pipeline stale`,
          ``,
          `Stages: ${STAGES.join(' → ')}`,
        ].join('\n');
    }
  }
}

export default Wave4Commands;
