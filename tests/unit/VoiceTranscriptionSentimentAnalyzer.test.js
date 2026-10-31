import { VoiceTranscriptionSentimentAnalyzer, VOICE_INTENTS, SENTIMENT } from '../../src/intelligence/VoiceTranscriptionSentimentAnalyzer.js';

describe('VoiceTranscriptionSentimentAnalyzer (Pillar 1 - Audio Intent & Sentiment)', () => {
  it('detects English cash offer request and classifies as positive/high urgency', () => {
    const analysis = VoiceTranscriptionSentimentAnalyzer.analyze('Hi Linda, how much in cash can an investor pay for my 4-bedroom villa right now?');

    expect(analysis.language).toBe('en');
    expect(analysis.intent).toBe(VOICE_INTENTS.CASH_OFFER_REQUEST);
    expect(analysis.sentiment).toBe(SENTIMENT.POSITIVE);
    expect(analysis.urgency).toBe('HIGH');
    expect(analysis.suggestedAction).toContain('valuation benchmark');
  });

  it('detects Arabic selling intent correctly', () => {
    const analysis = VoiceTranscriptionSentimentAnalyzer.analyze('السلام عليكم، بدي اعرض الفيلا للبيع في داماك هيلز');

    expect(analysis.language).toBe('ar');
    expect(analysis.intent).toBe(VOICE_INTENTS.WANT_TO_SELL);
    expect(analysis.sentiment).toBe(SENTIMENT.POSITIVE);
    expect(analysis.urgency).toBe('HIGH');
  });

  it('detects unlist/opt-out voice note and marks negative/immediate urgency', () => {
    const analysis = VoiceTranscriptionSentimentAnalyzer.analyze('Please remove my number and stop calling me.');

    expect(analysis.intent).toBe(VOICE_INTENTS.OBJECTION_UNLIST);
    expect(analysis.sentiment).toBe(SENTIMENT.NEGATIVE);
    expect(analysis.urgency).toBe('IMMEDIATE');
    expect(analysis.suggestedAction).toContain('cease outreach');
  });

  it('detects price objection from transcribed audio', () => {
    const analysis = VoiceTranscriptionSentimentAnalyzer.analyze('That offer is far too low, the market is much higher than 1.5M.');

    expect(analysis.intent).toBe(VOICE_INTENTS.OBJECTION_PRICE);
    expect(analysis.sentiment).toBe(SENTIMENT.NEGATIVE);
    expect(analysis.suggestedAction).toContain('recent transaction comparables');
  });

  it('handles empty transcript gracefully', () => {
    const analysis = VoiceTranscriptionSentimentAnalyzer.analyze('');

    expect(analysis.language).toBe('unknown');
    expect(analysis.intent).toBe(VOICE_INTENTS.GENERAL_INQUIRY);
    expect(analysis.confidence).toBe(0);
  });
});

