/**
 * DocuSignWebhookReceiver.js
 * 
 * Single responsibility: Ingest and validate digital contract signing status webhooks (DocuSign/Adobe Sign).
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class DocuSignWebhookReceiver {
  parseSignatureEvent(webhookPayload = {}) {
    const event = webhookPayload.event || webhookPayload.status; // 'envelope-completed' | 'completed' | 'declined'
    const envelopeId = webhookPayload.data?.envelopeId || webhookPayload.envelopeId || 'unknown';

    const isFullySigned = event === 'envelope-completed' || event === 'completed';

    return {
      envelopeId,
      status: isFullySigned ? 'FULLY_EXECUTED' : 'PENDING_OR_DECLINED',
      isFullySigned,
      signerEmail: webhookPayload.recipientEmail || webhookPayload.data?.envelopeSummary?.recipients?.[0]?.email || null,
      completedAt: isFullySigned ? new Date().toISOString() : null,
    };
  }
}

export default new DocuSignWebhookReceiver();

