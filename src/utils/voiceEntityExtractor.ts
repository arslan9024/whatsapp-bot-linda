/**
 * Voice note NLP entity extractor for Arabic/English transcripts (Point 69).
 */
export function extractVoiceLeadEntities(transcript: string): {
  bedrooms?: number;
  budgetAed?: number;
} {
  const brMatch = transcript.match(/(\d+)\s*(?:br|bed|bedroom|غرف)/i);
  const budgetMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(m|million|مليون)/i);
  return {
    ...(brMatch ? { bedrooms: Number(brMatch[1]) } : {}),
    ...(budgetMatch ? { budgetAed: Math.round(Number(budgetMatch[1]) * 1_000_000) } : {}),
  };
}
