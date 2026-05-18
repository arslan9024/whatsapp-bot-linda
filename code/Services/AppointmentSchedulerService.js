/**
 * ====================================================================
 * APPOINTMENT SCHEDULER SERVICE
 * ====================================================================
 * Enables tenants/buyers to book and manage property viewing
 * appointments directly via WhatsApp.
 *
 * Features:
 *   • Book a property viewing appointment
 *   • View upcoming appointments
 *   • Cancel / reschedule appointments
 *   • Automated reminder 1 day before (via cron integration)
 *   • Agent assignment and confirmation flow
 *   • Daily availability slots (configurable)
 *
 * Bot commands:
 *   !appointment book <property_id> <date> <time>
 *   !appointment list
 *   !appointment cancel <id>
 *   !appointment remind                    — admin: send tomorrow reminders
 *   !appointment available <date>          — check open slots
 *
 * @since Wave-4 Feature Expansion — May 2026
 */

import mongoose from 'mongoose';
import { Logger } from '../utils/Logger.js';

const log = new Logger('AppointmentScheduler');

// ─── Schema ─────────────────────────────────────────────────────────
const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true, unique: true },
    phone:         { type: String, required: true, index: true },
    propertyId:    { type: String, default: '' },
    propertyLabel: { type: String, default: '' },
    date:          { type: Date,   required: true, index: true },
    timeSlot:      { type: String, default: '' },        // e.g. "10:00 AM"
    status:        { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'], default: 'pending' },
    agentPhone:    { type: String, default: null },
    agentName:     { type: String, default: null },
    notes:         { type: String, default: '' },
    reminderSent:  { type: Boolean, default: false },
    confirmedAt:   { type: Date,   default: null },
    cancelledAt:   { type: Date,   default: null },
  },
  { timestamps: true }
);

// ─── Available time slots ────────────────────────────────────────────
const DEFAULT_TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM',
];

class AppointmentSchedulerService {
  constructor() {
    this._appointments = new Map();  // appointmentId → appointment
    this._Model        = null;
    this._stats        = { booked: 0, confirmed: 0, cancelled: 0, reminders: 0 };
  }

  async connectDB(conn) {
    try {
      this._Model = conn.model('Appointment', appointmentSchema);
      log.info('✅ AppointmentSchedulerService connected to DB');
    } catch (err) {
      log.warn(`⚠️  AppointmentScheduler DB connect failed: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Core API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Book an appointment.
   *
   * @param {object} params
   * @param {string} params.phone
   * @param {string} params.propertyId
   * @param {string} params.propertyLabel
   * @param {string|Date} params.date        - ISO date or Date
   * @param {string} params.timeSlot         - e.g. "10:00 AM"
   * @param {string} [params.notes]
   * @returns {Promise<{success: boolean, appointment?: object, error?: string}>}
   */
  async bookAppointment({ phone, propertyId, propertyLabel, date, timeSlot, notes = '' }) {
    try {
      const appointmentDate = new Date(date);
      if (isNaN(appointmentDate.getTime())) {
        return { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' };
      }

      if (appointmentDate < new Date()) {
        return { success: false, error: 'Appointment date must be in the future.' };
      }

      if (!DEFAULT_TIME_SLOTS.includes(timeSlot)) {
        return {
          success: false,
          error: `Invalid time slot. Available: ${DEFAULT_TIME_SLOTS.join(', ')}`,
        };
      }

      // Check for conflicts on same property + same slot
      const conflict = await this._findConflict(propertyId, appointmentDate, timeSlot);
      if (conflict) {
        return { success: false, error: `That slot is already taken. Please choose a different time.` };
      }

      const appt = {
        appointmentId: this._genId(),
        phone,
        propertyId:    propertyId    || '',
        propertyLabel: propertyLabel || propertyId || '',
        date:          appointmentDate,
        timeSlot,
        status:        'pending',
        notes,
        reminderSent:  false,
      };

      await this._save(appt);
      this._stats.booked++;
      log.info(`📅 Appointment booked: ${appt.appointmentId} for ${phone} on ${appointmentDate.toDateString()} @ ${timeSlot}`);
      return { success: true, appointment: appt };
    } catch (err) {
      log.error(`❌ bookAppointment failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Confirm an appointment (agent action).
   */
  async confirmAppointment(appointmentId, agentPhone, agentName) {
    return this._updateStatus(appointmentId, 'confirmed', { agentPhone, agentName, confirmedAt: new Date() });
  }

  /**
   * Cancel an appointment.
   */
  async cancelAppointment(appointmentId) {
    return this._updateStatus(appointmentId, 'cancelled', { cancelledAt: new Date() });
  }

  /**
   * Get upcoming appointments for a phone number.
   */
  async getUpcoming(phone) {
    const now = new Date();
    if (this._Model) {
      try {
        return await this._Model.find({ phone, date: { $gte: now }, status: { $in: ['pending', 'confirmed'] } })
          .sort({ date: 1 }).lean();
      } catch (_) {}
    }
    return [...this._appointments.values()].filter(a =>
      a.phone === phone && a.date >= now && ['pending', 'confirmed'].includes(a.status)
    ).sort((a, b) => a.date - b.date);
  }

  /**
   * Get all appointments needing tomorrow reminder.
   */
  async getDueTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end   = new Date(tomorrow.setHours(23, 59, 59, 999));

    if (this._Model) {
      try {
        return await this._Model.find({
          date: { $gte: start, $lte: end },
          status: { $in: ['pending', 'confirmed'] },
          reminderSent: false,
        }).lean();
      } catch (_) {}
    }
    return [...this._appointments.values()].filter(a =>
      a.date >= start && a.date <= end && !a.reminderSent && ['pending', 'confirmed'].includes(a.status)
    );
  }

  /**
   * Mark reminder as sent.
   */
  async markReminderSent(appointmentId) {
    this._stats.reminders++;
    await this._updateField(appointmentId, { reminderSent: true });
  }

  /**
   * Get available slots for a date.
   */
  async getAvailableSlots(propertyId, date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return DEFAULT_TIME_SLOTS;

    const booked = await this._bookedSlots(propertyId, d);
    return DEFAULT_TIME_SLOTS.filter(s => !booked.includes(s));
  }

  // ─────────────────────────────────────────────────────────────────
  // Bot command formatting helpers
  // ─────────────────────────────────────────────────────────────────

  formatAppointment(appt) {
    const d    = appt.date ? new Date(appt.date).toDateString() : '?';
    const icon = appt.status === 'confirmed' ? '✅' : appt.status === 'cancelled' ? '❌' : '⏳';
    return `${icon} *${appt.propertyLabel || appt.propertyId}*\n   ${d} @ ${appt.timeSlot}\n   ID: \`${appt.appointmentId}\` | ${appt.status}`;
  }

  formatBookingConfirmation(appt) {
    return [
      '📅 *Appointment Booked!*',
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      `Property : ${appt.propertyLabel || appt.propertyId}`,
      `Date     : ${new Date(appt.date).toDateString()}`,
      `Time     : ${appt.timeSlot}`,
      `Status   : ⏳ Pending confirmation`,
      `ID       : \`${appt.appointmentId}\``,
      ``,
      `Our team will confirm your viewing shortly. You\'ll receive a reminder the day before! 🏠`,
    ].join('\n');
  }

  reportText() {
    return [
      '📅 *Appointment Stats*',
      `━━━━━━━━━━━━━━━━━━━━`,
      `Booked     : ${this._stats.booked}`,
      `Confirmed  : ${this._stats.confirmed}`,
      `Cancelled  : ${this._stats.cancelled}`,
      `Reminders  : ${this._stats.reminders}`,
    ].join('\n');
  }

  stats() { return { ...this._stats }; }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  async _findConflict(propertyId, date, timeSlot) {
    const start = new Date(date).setHours(0, 0, 0, 0);
    const end   = new Date(date).setHours(23, 59, 59, 999);
    if (this._Model) {
      try {
        return await this._Model.findOne({
          propertyId, timeSlot,
          date: { $gte: new Date(start), $lte: new Date(end) },
          status: { $in: ['pending', 'confirmed'] },
        }).lean();
      } catch (_) {}
    }
    return [...this._appointments.values()].find(a =>
      a.propertyId === propertyId &&
      a.timeSlot   === timeSlot &&
      new Date(a.date).toDateString() === new Date(date).toDateString() &&
      ['pending', 'confirmed'].includes(a.status)
    ) || null;
  }

  async _bookedSlots(propertyId, date) {
    const start = new Date(date).setHours(0, 0, 0, 0);
    const end   = new Date(date).setHours(23, 59, 59, 999);
    if (this._Model) {
      try {
        const docs = await this._Model.find({
          propertyId, date: { $gte: new Date(start), $lte: new Date(end) },
          status: { $in: ['pending', 'confirmed'] },
        }).lean();
        return docs.map(d => d.timeSlot);
      } catch (_) {}
    }
    return [...this._appointments.values()]
      .filter(a => a.propertyId === propertyId &&
        new Date(a.date).toDateString() === new Date(date).toDateString() &&
        ['pending', 'confirmed'].includes(a.status))
      .map(a => a.timeSlot);
  }

  async _updateStatus(id, status, extra = {}) {
    const appt = await this._getById(id);
    if (!appt) return false;
    Object.assign(appt, { status, ...extra });
    await this._save(appt);
    if (status === 'confirmed') this._stats.confirmed++;
    if (status === 'cancelled') this._stats.cancelled++;
    return true;
  }

  async _updateField(id, fields) {
    const appt = await this._getById(id);
    if (!appt) return;
    Object.assign(appt, fields);
    await this._save(appt);
  }

  async _getById(appointmentId) {
    if (this._Model) {
      try { return await this._Model.findOne({ appointmentId }).lean(); } catch (_) {}
    }
    return this._appointments.get(appointmentId) || null;
  }

  async _save(appt) {
    this._appointments.set(appt.appointmentId, appt);
    if (this._Model) {
      try {
        await this._Model.findOneAndUpdate(
          { appointmentId: appt.appointmentId }, appt, { upsert: true, new: true }
        );
      } catch (_) {}
    }
  }

  _genId() {
    return `APT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
}

const appointmentScheduler = new AppointmentSchedulerService();
export default appointmentScheduler;
export { AppointmentSchedulerService };
