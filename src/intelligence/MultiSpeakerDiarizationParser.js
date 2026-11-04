/**
 * @file MultiSpeakerDiarizationParser.js
 * @description Parses multi-speaker audio transcripts (speaker diarization segments),
 * attributing requirements, preferences, and objections to specific family or team members.
 * Category: Intelligence
 */

export class MultiSpeakerDiarizationParser {
  /**
   * Groups diarized segments by speaker ID
   * @param {Array<{ speaker: string, text: string, startMs: number, endMs: number }>} segments
   * @returns {Object} Structured speaker breakdown
   */
  parseDiarization(segments = []) {
    const speakers = {};

    for (const seg of segments) {
      const spk = seg.speaker || 'SPEAKER_0';
      if (!speakers[spk]) {
        speakers[spk] = {
          speakerId: spk,
          totalDurationMs: 0,
          utterances: [],
          keywords: []
        };
      }

      const duration = (seg.endMs || 0) - (seg.startMs || 0);
      speakers[spk].totalDurationMs += Math.max(0, duration);
      speakers[spk].utterances.push(seg.text);

      // Extract high-value signals
      const lower = (seg.text || '').toLowerCase();
      if (lower.includes('school') || lower.includes('kids')) speakers[spk].keywords.push('family_focus');
      if (lower.includes('roi') || lower.includes('yield') || lower.includes('cash')) speakers[spk].keywords.push('financial_focus');
      if (lower.includes('view') || lower.includes('balcony') || lower.includes('interior')) speakers[spk].keywords.push('aesthetic_focus');
    }

    return {
      speakerCount: Object.keys(speakers).length,
      speakers
    };
  }
}

export default new MultiSpeakerDiarizationParser();
