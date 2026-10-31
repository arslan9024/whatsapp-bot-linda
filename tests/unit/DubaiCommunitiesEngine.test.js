import { DubaiCommunitiesEngine, DUBAI_COMMUNITIES } from '../../src/intelligence/DubaiCommunitiesEngine.js';

describe('DubaiCommunitiesEngine (Pillar 1 - Multi-Community Knowledge)', () => {
  it('correctly matches Dubai Hills Estate from alias', () => {
    const match = DubaiCommunitiesEngine.matchCommunity('Looking for a 4-bedroom villa in Maple, Dubai Hills');
    expect(match).not.toBeNull();
    expect(match.id).toBe('dubai_hills_estate');
    expect(match.developer).toBe('Emaar Properties');
    expect(match.typologies).toContain('Villas');
  });

  it('correctly matches Palm Jumeirah and estimates valuation', () => {
    const match = DubaiCommunitiesEngine.matchCommunity('Selling my luxury apartment on the Palm');
    expect(match).not.toBeNull();
    expect(match.id).toBe('palm_jumeirah');

    const valuation = DubaiCommunitiesEngine.estimateValuation('palm_jumeirah', 2000);
    expect(valuation).not.toBeNull();
    expect(valuation.priceMin).toBe(2000 * 2800);
    expect(valuation.priceMax).toBe(2000 * 5500);
    expect(valuation.serviceChargesAnnual).toBe(2000 * 18);
  });

  it('generates a concise briefing snippet for agents', () => {
    const snippet = DubaiCommunitiesEngine.generateBriefing('Do you have townhouses in Arabian Ranches 3?');
    expect(snippet).toContain('Arabian Ranches');
    expect(snippet).toContain('Emaar Properties');
    expect(snippet).toContain('/sqft');
  });

  it('returns null gracefully for unrecognized inquiries', () => {
    const match = DubaiCommunitiesEngine.matchCommunity('Random unrelated conversation');
    expect(match).toBeNull();
  });
});

