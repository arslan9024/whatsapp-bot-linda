import { RealEstateLeadScorer, LEAD_TIERS } from '../../src/intelligence/RealEstateLeadScorer.js';

describe('RealEstateLeadScorer (Lead Tiering & Conversion Engine)', () => {
  it('correctly scores and tiers a HOT lead with direct selling intent', () => {
    const result = RealEstateLeadScorer.scoreLead({
      text: 'Hello, I want to sell my villa in Victoria cluster. Can we arrange a viewing for a cash buyer?',
      reaction: '👍',
      historyLength: 3,
    });

    expect(result.tier).toBe(LEAD_TIERS.HOT);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.isPriority).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('correctly tiers an INVESTOR inquiry asking about ROI and yield', () => {
    const result = RealEstateLeadScorer.scoreLead({
      text: 'What is the expected annual return and rental yield with tenant in place?',
      hasVoiceNote: true,
    });

    expect(result.tier).toBe(LEAD_TIERS.INVESTOR);
    expect(result.isPriority).toBe(true);
    expect(result.reasons).toContain('High-touch inbound voice note received');
  });

  it('correctly tiers a WARM lead inquiring about valuations', () => {
    const result = RealEstateLeadScorer.scoreLead({
      text: 'Can you provide a market valuation for my 3BR townhouse?',
    });

    expect(result.tier).toBe(LEAD_TIERS.WARM);
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it('correctly tags an UNRESPONSIVE lead asking to stop messaging', () => {
    const result = RealEstateLeadScorer.scoreLead({
      text: 'Please stop messaging me, not interested.',
    });

    expect(result.tier).toBe(LEAD_TIERS.UNRESPONSIVE);
    expect(result.isPriority).toBe(false);
  });

  it('handles empty input with safe browsing fallback', () => {
    const result = RealEstateLeadScorer.scoreLead({});

    expect(result.tier).toBe(LEAD_TIERS.BROWSING);
    expect(result.score).toBe(20);
    expect(result.isPriority).toBe(false);
  });
});
