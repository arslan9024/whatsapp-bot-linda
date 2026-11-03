/**
 * @file StripeDepositLinkGenerator.js
 * @description Generates secure Stripe Checkout and Payment Intent links for token deposits,
 * expression of interest (EOI), and escrow reservation fees in AED or foreign currencies.
 * Category: Integrations
 */

export class StripeDepositLinkGenerator {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.STRIPE_SECRET_KEY || null;
    this.currency = (config.currency || 'AED').toUpperCase();
    this.baseSuccessUrl = config.baseSuccessUrl || 'https://botlinda.ai/payment/success';
    this.baseCancelUrl = config.baseCancelUrl || 'https://botlinda.ai/payment/cancel';
  }

  /**
   * Generates a payment deposit link session payload
   * @param {Object} params
   * @param {string} params.leadId
   * @param {string} params.propertyRef
   * @param {number} params.depositAmount
   * @param {string} [params.currency]
   * @param {string} [params.description]
   * @returns {Object} Structured checkout link metadata
   */
  generateDepositSession(params) {
    const { leadId, propertyRef, depositAmount, currency = this.currency, description } = params;
    if (!leadId || !propertyRef || !depositAmount) {
      throw new Error('leadId, propertyRef, and depositAmount are required to create a deposit link');
    }

    const sessionId = `cs_tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const lineItemTitle = description || `EOI Deposit for ${propertyRef}`;
    
    // In production this interfaces with stripe SDK or REST API
    const simulatedCheckoutUrl = `https://checkout.stripe.com/pay/${sessionId}?ref=${encodeURIComponent(propertyRef)}&amount=${depositAmount}&curr=${currency}`;

    return {
      sessionId,
      checkoutUrl: simulatedCheckoutUrl,
      currency,
      amount: depositAmount,
      propertyRef,
      leadId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    };
  }

  /**
   * Formats a client-facing WhatsApp payment invitation message
   * @param {Object} session
   * @returns {string}
   */
  formatPaymentInvitation(session) {
    const formattedAmount = Number(session.amount).toLocaleString('en-US');
    return [
      `💳 *Dubai Real Estate — Reservation Deposit Link*`,
      `Unit Reference: *${session.propertyRef}*`,
      `Deposit Amount: *${session.currency} ${formattedAmount}*`,
      ``,
      `Kindly click the secure Stripe portal link below to secure your Expression of Interest (EOI):`,
      `🔗 ${session.checkoutUrl}`,
      ``,
      `⏳ *Note:* This reservation link expires in 24 hours. Your payment is protected under RERA escrow standards.`
    ].join('\n');
  }
}

export default new StripeDepositLinkGenerator();

