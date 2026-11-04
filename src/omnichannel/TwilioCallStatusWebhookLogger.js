/**
 * @file TwilioCallStatusWebhookLogger.js
 * @description Ingests Twilio and Vonage voice telephony webhooks, updating lead communication records with duration, call disposition, and audio recording links.
 * Category: 2️⃣ Domain / Feature (Omnichannel Dominance)
 */

export class TwilioCallStatusWebhookLogger {
  /**
   * Processes Twilio call status webhook.
   * @param {Object} twilioPayload
   * @param {string} twilioPayload.CallSid
   * @param {string} twilioPayload.From
   * @param {string} twilioPayload.To
   * @param {string} twilioPayload.CallStatus ('completed', 'busy', 'no-answer', 'failed')
   * @param {string} [twilioPayload.CallDuration='0']
   * @param {string} [twilioPayload.RecordingUrl]
   * @returns {Object}
   */
  processCallWebhook(twilioPayload) {
    const durationSec = parseInt(twilioPayload.CallDuration || '0', 10);
    const status = (twilioPayload.CallStatus || 'completed').toLowerCase();

    let disposition = 'SUCCESSFUL_CALL';
    if (status === 'busy') disposition = 'LINE_BUSY';
    else if (status === 'no-answer') disposition = 'UNANSWERED';
    else if (status === 'failed') disposition = 'TELEPHONY_FAILURE';

    return {
      callSid: twilioPayload.CallSid,
      fromNumber: twilioPayload.From,
      toNumber: twilioPayload.To,
      durationSeconds: durationSec,
      rawStatus: twilioPayload.CallStatus,
      normalizedDisposition: disposition,
      recordingUrl: twilioPayload.RecordingUrl || null,
      leadTimelineNote: `Voice Call ${disposition.toUpperCase()} (${durationSec}s).${twilioPayload.RecordingUrl ? ' Audio recording attached.' : ''}`
    };
  }
}

export default new TwilioCallStatusWebhookLogger();
