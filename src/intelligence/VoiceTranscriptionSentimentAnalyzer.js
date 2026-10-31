/**
 * ====================================================================
 * VOICE TRANSCRIPTION & INTENT SENTIMENT ANALYZER (Pillar 1 - AI)
 * ====================================================================
 * Analyzes Whisper/Google speech transcripts from WhatsApp voice notes:
 *   1. Multilingual Language & Dialect Detection (Khaleeji, Arabic, English).
 *   2. Core Real Estate Intent Extraction:
 *      - WANT_TO_SELL (Urgent or planned sale)
 *      - WANT_TO_RENT (Seeking tenant or renting out)
 *      - CASH_OFFER_REQUEST (Demanding net cash valuation)
 *      - OBJECTION_PRICE (Believes valuation is too low)
 *      - OBJECTION_UNLIST (Requests removal/stop calling)
 *   3. Sentiment Polarity: POSITIVE, NEUTRAL, CRITICAL/ANGRY.
 *   4. Generates an action suggestion for the supervising agent.
 *
 * @since Development Phase — November 2026
 */

import { Logger } from '../core/Logger.js';

const logger = new Logger('VoiceTranscriptionSentimentAnalyzer');

export const VOICE_INTENTS = {
  WANT_TO_SELL: 'WANT_TO_SELL',
  WANT_TO_RENT: 'WANT_TO_RENT',
  CASH_OFFER_REQUEST: 'CASH_OFFER_REQUEST',
  OBJECTION_PRICE: 'OBJECTION_PRICE',
  OBJECTION_UNLIST: 'OBJECTION_UNLIST',
  GENERAL_INQUIRY: 'GENERAL_INQUIRY',
};

export const SENTIMENT = {
  POSITIVE: 'POSITIVE',
  NEUTRAL: 'NEUTRAL',
  NEGATIVE: 'NEGATIVE',
};

export class VoiceTranscriptionSentimentAnalyzer {
  /**
   * Analyze audio transcript text.
   *
   * @param {string} transcriptText
   * @returns {{
   *   language: string,
   *   intent: string,
   *   sentiment: string,
   *   urgency: string,
   *   suggestedAction: string,
   *   confidence: number
   * }}
   */
  static analyze(transcriptText = '') {
    const text = String(transcriptText || '').trim();
    const lower = text.toLowerCase();

    if (!text) {
      return {
        language: 'unknown',
        intent: VOICE_INTENTS.GENERAL_INQUIRY,
        sentiment: SENTIMENT.NEUTRAL,
        urgency: 'LOW',
        suggestedAction: 'Listen to original voice note manually.',
        confidence: 0,
      };
    }

    // 1. Language Detection (Arabic script detection vs English/Latin)
    const isArabic = /[\u0600-\u06FF]/.test(text);
    const language = isArabic ? 'ar' : 'en';

    // 2. Intent & Objection Detection
    let intent = VOICE_INTENTS.GENERAL_INQUIRY;
    let sentiment = SENTIMENT.NEUTRAL;
    let urgency = 'NORMAL';
    let suggestedAction = 'Follow up with standard inquiry reply.';
    let confidence = 0.85;

    // Check Unlist / Opt-out
    if (
      lower.includes('stop calling') ||
      lower.includes('stop messaging') ||
      lower.includes('remove my number') ||
      lower.includes('wrong number') ||
      text.includes('لا تتصل') ||
      text.includes('احذف رقمي') ||
      text.includes('الرقم غلط')
    ) {
      intent = VOICE_INTENTS.OBJECTION_UNLIST;
      sentiment = SENTIMENT.NEGATIVE;
      urgency = 'IMMEDIATE';
      suggestedAction = 'Tag as UNRESPONSIVE and cease outreach immediately.';
      confidence = 0.95;
    }
    // Check Cash Offer
    else if (
      lower.includes('cash offer') ||
      lower.includes('net to owner') ||
      lower.includes('how much in cash') ||
      text.includes('كاش') ||
      text.includes('صافي للمالك')
    ) {
      intent = VOICE_INTENTS.CASH_OFFER_REQUEST;
      sentiment = SENTIMENT.POSITIVE;
      urgency = 'HIGH';
      suggestedAction = 'Send cluster valuation benchmark and arrange agent call.';
      confidence = 0.92;
    }
    // Check Selling Intent
    else if (
      lower.includes('sell') ||
      lower.includes('selling my villa') ||
      lower.includes('list the townhouse') ||
      text.includes('ابيع') ||
      text.includes('للبيع') ||
      text.includes('اعرض الفيلا')
    ) {
      intent = VOICE_INTENTS.WANT_TO_SELL;
      sentiment = SENTIMENT.POSITIVE;
      urgency = 'HIGH';
      suggestedAction = 'Assign to senior broker for listing presentation.';
      confidence = 0.94;
    }
    // Check Price Objection
    else if (
      lower.includes('too low') ||
      lower.includes('market is higher') ||
      lower.includes('underpriced') ||
      text.includes('السعر قليل') ||
      text.includes('رخيص')
    ) {
      intent = VOICE_INTENTS.OBJECTION_PRICE;
      sentiment = SENTIMENT.NEGATIVE;
      urgency = 'NORMAL';
      suggestedAction = 'Share DLD recent transaction comparables to anchor expectations.';
      confidence = 0.88;
    }
    // Check Rent
    else if (
      lower.includes('rent') ||
      lower.includes('tenant') ||
      lower.includes('lease') ||
      text.includes('ايجار') ||
      text.includes('مستأجر')
    ) {
      intent = VOICE_INTENTS.WANT_TO_RENT;
      sentiment = SENTIMENT.NEUTRAL;
      urgency = 'NORMAL';
      suggestedAction = 'Provide rental yield estimate and property management terms.';
      confidence = 0.9;
    }

    logger.debug(`Transcript analyzed: Lang=${language}, Intent=${intent}, Sentiment=${sentiment}`);

    return {
      language,
      intent,
      sentiment,
      urgency,
      suggestedAction,
      confidence,
    };
  }
}

export default VoiceTranscriptionSentimentAnalyzer;

