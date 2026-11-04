/**
 * @file CalendlyAppointmentBooker.js
 * @description Generates pre-filled Cal.com and Calendly property viewing booking URLs
 * and parses appointment scheduling webhooks to automate physical site viewings.
 * Category: Integrations
 */

export class CalendlyAppointmentBooker {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://cal.com/linda-properties';
  }

  /**
   * Generates a pre-filled appointment booking link
   * @param {Object} params
   * @param {string} params.clientName
   * @param {string} params.clientEmail
   * @param {string} params.clientPhone
   * @param {string} params.propertyRef
   * @returns {string} URL with URL-encoded query parameters
   */
  generateBookingUrl(params) {
    const { clientName, clientEmail, clientPhone, propertyRef } = params;
    const url = new URL(this.baseUrl);

    if (clientName) url.searchParams.set('name', clientName);
    if (clientEmail) url.searchParams.set('email', clientEmail);
    if (clientPhone) url.searchParams.set('phone', clientPhone);
    if (propertyRef) url.searchParams.set('notes', `Viewing for Unit: ${propertyRef}`);

    return url.toString();
  }

  /**
   * Normalizes incoming appointment webhook from Cal.com/Calendly
   * @param {Object} webhookPayload
   * @returns {Object} Normalized appointment
   */
  parseBookingWebhook(webhookPayload = {}) {
    const payload = webhookPayload.payload || webhookPayload;
    return {
      bookingId: payload.uid || payload.id || `book_${Date.now()}`,
      startTime: payload.startTime || payload.event_start_time,
      endTime: payload.endTime || payload.event_end_time,
      clientName: payload.name || payload.invitee_name || '',
      clientEmail: payload.email || payload.invitee_email || '',
      status: 'SCHEDULED'
    };
  }
}

export default new CalendlyAppointmentBooker();

