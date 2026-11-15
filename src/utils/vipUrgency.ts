/**
 * VIP urgency & HNW buyer intent detector for Linda Bot (Point 61).
 */
const VIP_KEYWORDS = ['cash buyer', 'viewing today', 'ready to sign', 'penthouse', 'villa', 'urgent'];

export function detectVipUrgency(message: string): { isVipUrgent: boolean; matchedKeywords: string[] } {
  const lower = message.toLowerCase();
  const matchedKeywords = VIP_KEYWORDS.filter((kw) => lower.includes(kw));
  return { isVipUrgent: matchedKeywords.length > 0, matchedKeywords };
}
