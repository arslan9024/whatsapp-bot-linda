/**
 * MessageReactionTelemetry.js
 * 
 * Single responsibility: Ingest and decode WhatsApp emoji reactions into structured sentiment markers.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const REACTION_SENTIMENT_MAP = Object.freeze({
  '👍': { sentiment: 'POSITIVE', weight: 1.0, intent: 'AGREEMENT' },
  '❤️': { sentiment: 'VERY_POSITIVE', weight: 2.0, intent: 'APPRECIATION' },
  '🔥': { sentiment: 'VERY_POSITIVE', weight: 2.0, intent: 'HIGH_INTEREST' },
  '👏': { sentiment: 'POSITIVE', weight: 1.0, intent: 'APPROVAL' },
  '🙏': { sentiment: 'POSITIVE', weight: 1.0, intent: 'GRATITUDE' },
  '👎': { sentiment: 'NEGATIVE', weight: -1.5, intent: 'DISAGREEMENT' },
  '😡': { sentiment: 'VERY_NEGATIVE', weight: -3.0, intent: 'ANGER' },
  '❓': { sentiment: 'NEUTRAL', weight: 0.0, intent: 'CONFUSION' },
});

export class MessageReactionTelemetry {
  decodeReaction(emoji) {
    if (!emoji || typeof emoji !== 'string') {
      return { sentiment: 'UNKNOWN', weight: 0.0, intent: 'UNKNOWN' };
    }
    const clean = emoji.trim();
    return REACTION_SENTIMENT_MAP[clean] || { sentiment: 'NEUTRAL', weight: 0.2, intent: 'GENERIC_REACTION' };
  }

  recordReactionEvent(messageId, emoji, senderJid) {
    if (!messageId || !emoji) throw new Error('messageId and emoji are required');
    const decoded = this.decodeReaction(emoji);
    return {
      messageId,
      senderJid: senderJid || null,
      rawEmoji: emoji,
      ...decoded,
      recordedAt: Date.now(),
    };
  }
}

export default new MessageReactionTelemetry();
