/**
 * Inbound WhatsApp lead intent categorizer (Point 59).
 */
export type LeadIntent = 'BUY' | 'RENT' | 'SELL' | 'SUPPORT';

export function categorizeLeadIntent(message: string): LeadIntent {
  const lower = message.toLowerCase();
  if (/\b(rent|lease|ejari|annual)\b/.test(lower)) return 'RENT';
  if (/\b(sell|list my|valuation)\b/.test(lower)) return 'SELL';
  if (/\b(buy|purchase|invest|off-plan|villa|apartment)\b/.test(lower)) return 'BUY';
  return 'SUPPORT';
}
