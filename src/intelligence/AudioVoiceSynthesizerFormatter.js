/**
 * AudioVoiceSynthesizerFormatter.js
 * 
 * Single responsibility: Formats script, SSML tags, and cadence metadata for Text-to-Speech audio generation.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class AudioVoiceSynthesizerFormatter {
  constructor({ defaultVoice = 'nova', defaultSpeed = 0.95 } = {}) {
    this.defaultVoice = defaultVoice;
    this.defaultSpeed = defaultSpeed;
  }

  formatTtsPayload(text = '', { voice = null, speed = null, insertBreathing = true } = {}) {
    if (!text || typeof text !== 'string') throw new Error('text is required for TTS synthesis');

    // Soften punctuation with natural micro-pauses
    let formattedText = text;
    if (insertBreathing) {
      formattedText = formattedText
        .replace(/([.!?])\s+/g, '$1 ... ')
        .replace(/,\s+/g, ', ');
    }

    return {
      model: 'tts-1-hd',
      input: formattedText,
      voice: voice || this.defaultVoice,
      speed: speed || this.defaultSpeed,
      response_format: 'opus',
    };
  }
}

export default new AudioVoiceSynthesizerFormatter();

